-- =========================================================
-- GREEN CHIMP CRM | ACTIVAR PERFIL ZENDA CAFÉ
-- Ejecutar en Supabase > SQL Editor.
-- Es seguro ejecutarlo más de una vez.
-- =========================================================

begin;

-- 1. Clasificación visible en la tarjeta.
alter table public.crm_leads
  add column if not exists classification text;

create index if not exists crm_leads_company_classification_idx
  on public.crm_leads (company_key, classification);

-- 2. Columnas del Kanban de Zenda Café.
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
on conflict (company_key, stage_key)
do update set
  name = excluded.name,
  color = excluded.color,
  movement_mode = excluded.movement_mode,
  position = excluded.position;

-- 3. Cuenta admin_zenda.
-- Antes de ejecutar, crea en Authentication > Users:
-- admin_zenda@usuarios.greenchimp.mx / contraseña demo123
-- con Auto Confirm User activado.
insert into public.crm_company_members (
  user_id, company_key, company_name, full_name,
  login_username, role, logo_text, accent, active
)
select
  id,
  'zenda-cafe',
  'ZENDA CAFÉ',
  'Administrador Zenda Café',
  'admin_zenda',
  'admin',
  'ZC',
  '#b87543',
  true
from auth.users
where lower(email) = 'admin_zenda@usuarios.greenchimp.mx'
on conflict (user_id, company_key)
do update set
  company_name = excluded.company_name,
  full_name = excluded.full_name,
  login_username = excluded.login_username,
  role = excluded.role,
  logo_text = excluded.logo_text,
  accent = excluded.accent,
  active = true;

-- 4. Dar acceso a Zenda al superadmin existente.
insert into public.crm_company_members (
  user_id, company_key, company_name, full_name,
  login_username, role, logo_text, accent, active
)
select
  id,
  'zenda-cafe',
  'ZENDA CAFÉ',
  'Superadministrador Green Chimp',
  'superadmin',
  'superadmin',
  'GC',
  '#b87543',
  true
from auth.users
where lower(email) = 'superadmin@usuarios.greenchimp.mx'
on conflict (user_id, company_key)
do update set
  company_name = excluded.company_name,
  full_name = excluded.full_name,
  login_username = excluded.login_username,
  role = excluded.role,
  logo_text = excluded.logo_text,
  accent = excluded.accent,
  active = true;

notify pgrst, 'reload schema';

commit;

-- Verificación del perfil y sus columnas.
select
  company_key,
  stage_key,
  name,
  movement_mode,
  position
from public.crm_pipeline_stages
where company_key = 'zenda-cafe'
order by position;

select
  login_username,
  company_name,
  role,
  active
from public.crm_company_members
where company_key = 'zenda-cafe'
order by login_username;
