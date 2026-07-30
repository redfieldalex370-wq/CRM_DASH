-- =========================================================
-- WOOLRICH | UPSERT SEGURO DESDE GOOGLE SHEETS
-- Conserva comentarios, recordatorios, responsable y etapas
-- bloqueadas manualmente por el administrador.
-- =========================================================

create or replace function public.upsert_crm_lead_from_sheet(
    p_company_key text,
    p_subscriber_id bigint,
    p_whatsapp_phone text default null,
    p_nombre_paciente text default null,
    p_fecha_cita timestamptz default null,
    p_status_cita text default null,
    p_last_activity_timestamp bigint default null,
    p_last_activity_at timestamptz default null,
    p_ultimo_mensaje_cliente text default null,
    p_kanban_stage text default 'contactos_nuevos',
    p_raw_payload jsonb default '{}'::jsonb
)
returns public.crm_leads
language plpgsql
security definer
set search_path = public
as $$
declare
    v_lead public.crm_leads;
begin
    insert into public.crm_leads as existing (
        company_key,
        subscriber_id,
        whatsapp_phone,
        nombre_paciente,
        fecha_cita,
        status_cita,
        last_activity_timestamp,
        last_activity_at,
        ultimo_mensaje_cliente,
        kanban_stage,
        stage_origin,
        stage_locked,
        raw_payload,
        source_updated_at
    )
    values (
        p_company_key,
        p_subscriber_id,
        p_whatsapp_phone,
        p_nombre_paciente,
        p_fecha_cita,
        p_status_cita,
        p_last_activity_timestamp,
        p_last_activity_at,
        p_ultimo_mensaje_cliente,
        coalesce(nullif(p_kanban_stage, ''), 'contactos_nuevos'),
        'google_sheets',
        false,
        coalesce(p_raw_payload, '{}'::jsonb),
        now()
    )
    on conflict (company_key, subscriber_id)
    do update set
        whatsapp_phone = coalesce(
            excluded.whatsapp_phone,
            existing.whatsapp_phone
        ),
        nombre_paciente = coalesce(
            nullif(excluded.nombre_paciente, ''),
            existing.nombre_paciente
        ),
        fecha_cita = excluded.fecha_cita,
        status_cita = excluded.status_cita,
        last_activity_timestamp = coalesce(
            excluded.last_activity_timestamp,
            existing.last_activity_timestamp
        ),
        last_activity_at = coalesce(
            excluded.last_activity_at,
            existing.last_activity_at
        ),
        ultimo_mensaje_cliente = coalesce(
            nullif(excluded.ultimo_mensaje_cliente, ''),
            existing.ultimo_mensaje_cliente
        ),

        -- Solo cambia la columna Kanban si el administrador
        -- todavía no bloqueó manualmente la etapa.
        kanban_stage = case
            when existing.stage_locked = true
                then existing.kanban_stage
            else excluded.kanban_stage
        end,

        stage_origin = case
            when existing.stage_locked = true
                then existing.stage_origin
            else 'google_sheets'
        end,

        raw_payload = excluded.raw_payload,
        source_updated_at = now(),
        updated_at = now()

    returning * into v_lead;

    return v_lead;
end;
$$;

revoke all
on function public.upsert_crm_lead_from_sheet(
    text,
    bigint,
    text,
    text,
    timestamptz,
    text,
    bigint,
    timestamptz,
    text,
    text,
    jsonb
)
from public;

grant execute
on function public.upsert_crm_lead_from_sheet(
    text,
    bigint,
    text,
    text,
    timestamptz,
    text,
    bigint,
    timestamptz,
    text,
    text,
    jsonb
)
to service_role;

-- Verificación:
-- select * from public.crm_leads
-- where company_key = 'dr-woolrich'
-- order by updated_at desc;
