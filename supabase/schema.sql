-- =========================================================
-- GREEN CHIMP CRM | ESQUEMA COMPLETO PARA SUPABASE
-- Ejecutar una sola vez desde Supabase > SQL Editor.
-- Es idempotente: también puede actualizar la tabla crm_leads
-- creada durante las primeras pruebas.
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1. LEADS RECIBIDOS DESDE GOOGLE SHEETS / N8N
-- ---------------------------------------------------------
create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  company_key text not null default 'dr-woolrich',
  subscriber_id bigint not null,
  whatsapp_phone text,
  nombre_paciente text,
  bot_status text,
  fecha_cita timestamptz,
  summary text,
  status_cita text,
  followup_level integer,
  last_activity_timestamp bigint,
  last_activity_at timestamptz,
  s1_enviado text,
  s2_enviado text,
  s3_enviado text,
  r1_enviado text,
  r2_enviado text,
  ultimo_mensaje_cliente text,
  ultimo_mensaje_bot text,
  fecha_sheet date,
  buscar text,
  kanban_stage text not null default 'contactos_nuevos',
  stage_origin text not null default 'automation',
  stage_locked boolean not null default false,
  assigned_to text,
  admin_comments text,
  reminder_text text,
  reminder_at timestamptz,
  reminder_completed boolean not null default false,
  raw_payload jsonb not null default '{}'::jsonb,
  source_row_number integer,
  source_updated_at timestamptz default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_leads_company_subscriber_unique unique (company_key, subscriber_id)
);

alter table public.crm_leads add column if not exists service text;
alter table public.crm_leads add column if not exists source text default 'WhatsApp';
alter table public.crm_leads add column if not exists tags jsonb not null default '[]'::jsonb;
alter table public.crm_leads add column if not exists comments jsonb not null default '[]'::jsonb;
alter table public.crm_leads add column if not exists reminders jsonb not null default '[]'::jsonb;
alter table public.crm_leads add column if not exists history jsonb not null default '[]'::jsonb;

alter table public.crm_leads drop constraint if exists crm_leads_stage_origin_check;
alter table public.crm_leads add constraint crm_leads_stage_origin_check
  check (stage_origin in ('automation', 'whatsapp', 'google_sheets', 'n8n', 'admin', 'importacion', 'excel_import', 'system'));

create unique index if not exists crm_leads_company_subscriber_idx
  on public.crm_leads (company_key, subscriber_id);
create index if not exists crm_leads_company_stage_idx
  on public.crm_leads (company_key, kanban_stage);
create index if not exists crm_leads_company_phone_idx
  on public.crm_leads (company_key, whatsapp_phone);
create index if not exists crm_leads_activity_idx
  on public.crm_leads (company_key, last_activity_at desc);

-- ---------------------------------------------------------
-- 2. USUARIOS AUTORIZADOS POR EMPRESA
-- La página solicita usuario + contraseña. Supabase Auth conserva
-- una identidad técnica interna que nunca se muestra al cliente.
-- ---------------------------------------------------------
create table if not exists public.crm_company_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_key text not null,
  company_name text not null,
  full_name text,
  login_username text,
  role text not null default 'agent'
    check (role in ('superadmin', 'admin', 'agent', 'viewer')),
  logo_text text,
  accent text not null default '#7c5cff',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, company_key)
);

create index if not exists crm_company_members_user_idx
  on public.crm_company_members (user_id, active);

alter table public.crm_company_members
  add column if not exists login_username text;

create unique index if not exists crm_company_members_company_username_idx
  on public.crm_company_members (company_key, lower(login_username))
  where login_username is not null;

-- ---------------------------------------------------------
-- 3. COLUMNAS PERSONALIZABLES DEL KANBAN
-- ---------------------------------------------------------
create table if not exists public.crm_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  company_key text not null,
  stage_key text not null,
  name text not null,
  color text not null default '#6d7cff',
  movement_mode text not null default 'manual'
    check (movement_mode in ('automatic', 'manual')),
  position integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_key, stage_key)
);

create index if not exists crm_pipeline_stages_company_position_idx
  on public.crm_pipeline_stages (company_key, position);

-- Columnas iniciales para Dr. Woolrich.
insert into public.crm_pipeline_stages
  (company_key, stage_key, name, color, movement_mode, position)
values
  ('dr-woolrich', 'contactos_nuevos', 'Contactos nuevos', '#6d7cff', 'automatic', 1),
  ('dr-woolrich', 'preguntaron_fechas', 'Preguntaron por fechas', '#37a9ff', 'automatic', 2),
  ('dr-woolrich', 'seguimiento_1', 'Seguimiento 1', '#38bdf8', 'automatic', 3),
  ('dr-woolrich', 'seguimiento_2', 'Seguimiento 2', '#818cf8', 'automatic', 4),
  ('dr-woolrich', 'seguimiento_3', 'Seguimiento 3', '#a78bfa', 'automatic', 5),
  ('dr-woolrich', 'cita_agendada', 'Cita agendada', '#20c997', 'automatic', 6),
  ('dr-woolrich', 'asistio_consulta', 'Asistió a consulta', '#ff9f43', 'manual', 7),
  ('dr-woolrich', 'no_asistio_cita', 'No asistió a cita', '#ef4444', 'manual', 8),
  ('dr-woolrich', 'cirugia_agendada', 'Cirugía agendada', '#f368e0', 'manual', 9),
  ('dr-woolrich', 'cita_cancelada', 'Cita cancelada', '#fb7185', 'manual', 10)
on conflict (company_key, stage_key) do update set
  name = excluded.name,
  color = excluded.color,
  movement_mode = excluded.movement_mode,
  position = excluded.position;

-- Columnas iniciales para Especialidades Dentales.
insert into public.crm_pipeline_stages
  (company_key, stage_key, name, color, movement_mode, position)
values
  ('especialidades-dentales', 'contactos_nuevos', 'Contactos nuevos', '#6d7cff', 'automatic', 1),
  ('especialidades-dentales', 'solicito_informacion', 'Solicitó información', '#37a9ff', 'automatic', 2),
  ('especialidades-dentales', 'especialidad_elegida', 'Especialidad elegida', '#8e7dff', 'automatic', 3),
  ('especialidades-dentales', 'cita_agendada', 'Cita agendada', '#20c997', 'automatic', 4),
  ('especialidades-dentales', 'confirmado', 'Confirmado', '#00b894', 'manual', 5),
  ('especialidades-dentales', 'asistio_consulta', 'Asistió', '#ff9f43', 'manual', 6),
  ('especialidades-dentales', 'seguimiento', 'Seguimiento', '#f368e0', 'manual', 7)
on conflict (company_key, stage_key) do update set
  name = excluded.name,
  color = excluded.color,
  movement_mode = excluded.movement_mode,
  position = excluded.position;

-- ---------------------------------------------------------
-- 4. UPDATED_AT AUTOMÁTICO
-- ---------------------------------------------------------
create or replace function public.crm_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_crm_leads_updated_at on public.crm_leads;
create trigger trg_crm_leads_updated_at
before update on public.crm_leads
for each row execute function public.crm_set_updated_at();

drop trigger if exists trg_crm_stages_updated_at on public.crm_pipeline_stages;
create trigger trg_crm_stages_updated_at
before update on public.crm_pipeline_stages
for each row execute function public.crm_set_updated_at();

-- ---------------------------------------------------------
-- 5. SEGURIDAD MULTIEMPRESA CON RLS
-- ---------------------------------------------------------
alter table public.crm_leads enable row level security;
alter table public.crm_company_members enable row level security;
alter table public.crm_pipeline_stages enable row level security;

create or replace function public.crm_user_has_company(target_company text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.crm_company_members
    where user_id = auth.uid()
      and company_key = target_company
      and active = true
  );
$$;

create or replace function public.crm_user_role(target_company text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.crm_company_members
  where user_id = auth.uid()
    and company_key = target_company
    and active = true
  limit 1;
$$;

drop policy if exists "crm members read own memberships" on public.crm_company_members;
create policy "crm members read own memberships"
on public.crm_company_members
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "crm members read leads" on public.crm_leads;
create policy "crm members read leads"
on public.crm_leads
for select
to authenticated
using (public.crm_user_has_company(company_key));

drop policy if exists "crm agents insert leads" on public.crm_leads;
create policy "crm agents insert leads"
on public.crm_leads
for insert
to authenticated
with check (
  public.crm_user_role(company_key) in ('superadmin', 'admin', 'agent')
);

drop policy if exists "crm agents update leads" on public.crm_leads;
create policy "crm agents update leads"
on public.crm_leads
for update
to authenticated
using (
  public.crm_user_role(company_key) in ('superadmin', 'admin', 'agent')
)
with check (
  public.crm_user_role(company_key) in ('superadmin', 'admin', 'agent')
);

drop policy if exists "crm admins delete leads" on public.crm_leads;
create policy "crm admins delete leads"
on public.crm_leads
for delete
to authenticated
using (
  public.crm_user_role(company_key) in ('superadmin', 'admin')
);

drop policy if exists "crm members read stages" on public.crm_pipeline_stages;
create policy "crm members read stages"
on public.crm_pipeline_stages
for select
to authenticated
using (public.crm_user_has_company(company_key));

drop policy if exists "crm admins insert stages" on public.crm_pipeline_stages;
create policy "crm admins insert stages"
on public.crm_pipeline_stages
for insert
to authenticated
with check (
  public.crm_user_role(company_key) in ('superadmin', 'admin')
);

drop policy if exists "crm admins update stages" on public.crm_pipeline_stages;
create policy "crm admins update stages"
on public.crm_pipeline_stages
for update
to authenticated
using (
  public.crm_user_role(company_key) in ('superadmin', 'admin')
)
with check (
  public.crm_user_role(company_key) in ('superadmin', 'admin')
);

drop policy if exists "crm admins delete stages" on public.crm_pipeline_stages;
create policy "crm admins delete stages"
on public.crm_pipeline_stages
for delete
to authenticated
using (
  public.crm_user_role(company_key) in ('superadmin', 'admin')
);

-- Permisos del API para usuarios autenticados.
grant usage on schema public to authenticated;
grant select on public.crm_company_members to authenticated;
grant select, insert, update, delete on public.crm_leads to authenticated;
grant select, insert, update, delete on public.crm_pipeline_stages to authenticated;
grant execute on function public.crm_user_has_company(text) to authenticated;
grant execute on function public.crm_user_role(text) to authenticated;

-- n8n debe continuar usando service_role y no la Publishable Key.


-- ---------------------------------------------------------
-- 6. FUNCIÓN DE UPSERT PARA N8N / GOOGLE SHEETS
-- ---------------------------------------------------------
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

-- ---------------------------------------------------------
-- PERFIL ZENDA CAFÉ
-- ---------------------------------------------------------
alter table public.crm_leads
  add column if not exists classification text;

create index if not exists crm_leads_company_classification_idx
  on public.crm_leads (company_key, classification);

insert into public.crm_pipeline_stages
  (company_key, stage_key, name, color, movement_mode, position)
values
  ('zenda-cafe', 'contactos_nuevos', 'Contactos nuevos', '#8b6f47', 'automatic', 1),
  ('zenda-cafe', 'pregunta_adicional', 'Pregunta algo adicional', '#c8965f', 'automatic', 2),
  ('zenda-cafe', 'pidio_menu_asesor', 'Pidió menú / pidió hablar con asesor', '#e2b873', 'automatic', 3),
  ('zenda-cafe', 'contactado', 'Contactado', '#5aa9e6', 'manual', 4),
  ('zenda-cafe', 'cotizacion_formal_mandada', 'Cotización formal mandada', '#9b7ede', 'manual', 5),
  ('zenda-cafe', 'acepto_cotizacion', 'Aceptó cotización', '#39b98a', 'manual', 6),
  ('zenda-cafe', 'cliente', 'Cliente', '#d48b45', 'manual', 7)
on conflict (company_key, stage_key) do update set
  name = excluded.name,
  color = excluded.color,
  movement_mode = excluded.movement_mode,
  position = excluded.position;
