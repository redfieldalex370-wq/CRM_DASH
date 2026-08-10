-- =========================================================
-- GREEN CHIMP CRM | GREEN CHIMP EXPRESS · CHATBOT + LANDING
-- Ejecutar en Supabase > SQL Editor.
-- Idempotente: puede ejecutarse varias veces.
-- Esta versión localiza al superadmin por sus memberships existentes,
-- no solamente por un correo técnico específico.
-- =========================================================

begin;

alter table public.crm_leads
  add column if not exists classification text;

create index if not exists crm_leads_company_classification_idx
  on public.crm_leads (company_key, classification);

-- ---------------------------------------------------------
-- 1. PIPELINE GREEN CHIMP EXPRESS
-- ---------------------------------------------------------
insert into public.crm_pipeline_stages
  (company_key, stage_key, name, color, movement_mode, position)
values
  ('green-chimp-express', 'contactos_nuevos', 'Contactos nuevos', '#64748b', 'automatic', 1),
  ('green-chimp-express', 'calificando', 'Calificando', '#3b82f6', 'automatic', 2),
  ('green-chimp-express', 'cotizado', 'Cotizado', '#8b5cf6', 'automatic', 3),
  ('green-chimp-express', 'objecion_precio', 'Objeción de precio', '#f59e0b', 'automatic', 4),
  ('green-chimp-express', 'listo_para_pago', 'Listo para pagar', '#10b981', 'automatic', 5),
  ('green-chimp-express', 'contactado', 'Contactado por asesor', '#06b6d4', 'manual', 6),
  ('green-chimp-express', 'cliente', 'CLIENTE ACTIVO', '#22c55e', 'manual', 7),
  ('green-chimp-express', 'cliente_concretado', 'CLIENTE CONCRETADO', '#14b8a6', 'manual', 8),
  ('green-chimp-express', 'perdido', 'Perdido', '#ef4444', 'manual', 9)
on conflict (company_key, stage_key)
do update set
  name = excluded.name,
  color = excluded.color,
  movement_mode = excluded.movement_mode,
  position = excluded.position;

-- ---------------------------------------------------------
-- 2. ADMIN EXPRESS
-- Debe existir en Supabase Authentication si quieres usarlo.
-- ---------------------------------------------------------
insert into public.crm_company_members (
  user_id, company_key, company_name, full_name,
  login_username, role, logo_text, accent, active
)
select
  id,
  'green-chimp-express',
  'Green Chimp Express · Chatbot + Landing',
  'Administrador Green Chimp Express',
  'admin_express',
  'admin',
  'GX',
  '#63c174',
  true
from auth.users
where lower(email) = 'admin_express@usuarios.greenchimp.mx'
on conflict (user_id, company_key)
do update set
  company_name = excluded.company_name,
  full_name = excluded.full_name,
  login_username = excluded.login_username,
  role = excluded.role,
  logo_text = excluded.logo_text,
  accent = excluded.accent,
  active = true;

-- ---------------------------------------------------------
-- 3. SUPERADMIN
-- Primero intenta localizarlo por un membership existente con
-- login_username = superadmin. Si no existe, usa el correo técnico.
-- ---------------------------------------------------------
do $$
declare
  v_superadmin_id uuid;
begin
  select m.user_id
    into v_superadmin_id
  from public.crm_company_members m
  where lower(coalesce(m.login_username, '')) = 'superadmin'
    and m.active = true
  order by case when m.role = 'superadmin' then 0 else 1 end, m.created_at asc
  limit 1;

  if v_superadmin_id is null then
    select u.id
      into v_superadmin_id
    from auth.users u
    where lower(u.email) = 'superadmin@usuarios.greenchimp.mx'
    limit 1;
  end if;

  if v_superadmin_id is null then
    raise exception 'No se encontró el usuario superadmin. Revisa crm_company_members y auth.users.';
  end if;

  insert into public.crm_company_members (
    user_id, company_key, company_name, full_name,
    login_username, role, logo_text, accent, active
  ) values (
    v_superadmin_id,
    'green-chimp-express',
    'Green Chimp Express · Chatbot + Landing',
    'Superadministrador Green Chimp',
    'superadmin',
    'superadmin',
    'GC',
    '#63c174',
    true
  )
  on conflict (user_id, company_key)
  do update set
    company_name = excluded.company_name,
    full_name = excluded.full_name,
    login_username = excluded.login_username,
    role = excluded.role,
    logo_text = excluded.logo_text,
    accent = excluded.accent,
    active = true;
end $$;

notify pgrst, 'reload schema';

commit;

-- ---------------------------------------------------------
-- DIAGNÓSTICO
-- Debes ver aquí una fila con login_username = superadmin.
-- ---------------------------------------------------------
select
  login_username,
  company_key,
  company_name,
  role,
  active,
  user_id
from public.crm_company_members
where company_key = 'green-chimp-express'
order by login_username;

select
  company_key,
  stage_key,
  name,
  movement_mode,
  position
from public.crm_pipeline_stages
where company_key = 'green-chimp-express'
order by position;
