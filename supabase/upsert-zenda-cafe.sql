-- =========================================================
-- ZENDA CAFÉ | UPSERT DE LEADS DESDE N8N
-- Conserva las etapas movidas por el administrador y evita
-- que una actualización automática haga retroceder el lead.
-- =========================================================

create or replace function public.upsert_zenda_crm_lead(
  p_subscriber_id bigint,
  p_whatsapp_phone text default null,
  p_nombre_paciente text default null,
  p_ultimo_mensaje_cliente text default null,
  p_classification text default null,
  p_service text default null,
  p_kanban_stage text default 'contactos_nuevos',
  p_source text default 'WhatsApp',
  p_last_activity_at timestamptz default now(),
  p_raw_payload jsonb default '{}'::jsonb
)
returns public.crm_leads
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lead public.crm_leads;
  v_classification text;
  v_stage text;
begin
  v_classification := case upper(trim(coalesce(p_classification, '')))
    when 'TIENDA' then 'TIENDA'
    when 'COFFEE BREAK' then 'COFFEE BREAK'
    when 'EVENTOS' then 'COFFEE BREAK'
    when 'MERCADITO' then 'MERCADITO'
    else null
  end;

  v_stage := case lower(trim(coalesce(p_kanban_stage, '')))
    when 'contactos_nuevos' then 'contactos_nuevos'
    when 'pregunta_adicional' then 'pregunta_adicional'
    when 'pidio_menu_asesor' then 'pidio_menu_asesor'
    else 'contactos_nuevos'
  end;

  insert into public.crm_leads as existing (
    company_key,
    subscriber_id,
    whatsapp_phone,
    nombre_paciente,
    ultimo_mensaje_cliente,
    classification,
    service,
    kanban_stage,
    stage_origin,
    stage_locked,
    source,
    tags,
    last_activity_at,
    raw_payload,
    source_updated_at
  )
  values (
    'zenda-cafe',
    p_subscriber_id,
    nullif(regexp_replace(coalesce(p_whatsapp_phone, ''), '\\D', '', 'g'), ''),
    nullif(trim(coalesce(p_nombre_paciente, '')), ''),
    nullif(trim(coalesce(p_ultimo_mensaje_cliente, '')), ''),
    v_classification,
    nullif(trim(coalesce(p_service, '')), ''),
    v_stage,
    'n8n',
    false,
    coalesce(nullif(trim(p_source), ''), 'WhatsApp'),
    case when v_classification is null then '[]'::jsonb else jsonb_build_array(v_classification) end,
    coalesce(p_last_activity_at, now()),
    coalesce(p_raw_payload, '{}'::jsonb),
    now()
  )
  on conflict (company_key, subscriber_id)
  do update set
    whatsapp_phone = coalesce(excluded.whatsapp_phone, existing.whatsapp_phone),
    nombre_paciente = coalesce(excluded.nombre_paciente, existing.nombre_paciente),
    ultimo_mensaje_cliente = coalesce(excluded.ultimo_mensaje_cliente, existing.ultimo_mensaje_cliente),
    classification = coalesce(excluded.classification, existing.classification),
    service = coalesce(excluded.service, existing.service),
    source = coalesce(excluded.source, existing.source),
    tags = case
      when excluded.classification is not null then jsonb_build_array(excluded.classification)
      else existing.tags
    end,
    last_activity_at = coalesce(excluded.last_activity_at, existing.last_activity_at),

    kanban_stage = case
      -- Las etapas administrativas nunca se cambian desde n8n.
      when existing.stage_locked = true then existing.kanban_stage
      when existing.kanban_stage in (
        'contactado',
        'cotizacion_formal_mandada',
        'acepto_cotizacion',
        'cliente'
      ) then existing.kanban_stage

      -- Evitar regresiones entre las etapas automáticas.
      when existing.kanban_stage = 'pidio_menu_asesor' then existing.kanban_stage
      when existing.kanban_stage = 'pregunta_adicional'
           and excluded.kanban_stage = 'contactos_nuevos'
        then existing.kanban_stage
      else excluded.kanban_stage
    end,

    stage_origin = case
      when existing.stage_locked = true then existing.stage_origin
      when existing.kanban_stage in (
        'contactado',
        'cotizacion_formal_mandada',
        'acepto_cotizacion',
        'cliente'
      ) then existing.stage_origin
      else 'n8n'
    end,

    raw_payload = excluded.raw_payload,
    source_updated_at = now(),
    updated_at = now()
  returning * into v_lead;

  return v_lead;
end;
$$;

revoke all on function public.upsert_zenda_crm_lead(
  bigint, text, text, text, text, text, text, text, timestamptz, jsonb
) from public;

grant execute on function public.upsert_zenda_crm_lead(
  bigint, text, text, text, text, text, text, text, timestamptz, jsonb
) to service_role;

notify pgrst, 'reload schema';
