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

-- 2. Columnas del Kanban de Zenda en Casa.
delete from public.crm_pipeline_stages
where company_key = 'zenda-cafe'
  and stage_key not in (
    'cliente_nuevo', 'pregunto_menu', 'cotizado',
    'datos_bancarios_enviados', 'comprobante_recibido',
    'cliente_activo', 'cliente_inactivo'
  );

insert into public.crm_pipeline_stages
  (company_key, stage_key, name, color, movement_mode, position)
values
  ('zenda-cafe', 'cliente_nuevo', 'Cliente nuevo', '#8b6f47', 'automatic', 1),
  ('zenda-cafe', 'pregunto_menu', 'Preguntó por menú', '#c8965f', 'automatic', 2),
  ('zenda-cafe', 'cotizado', 'Se cotizó', '#e2b873', 'automatic', 3),
  ('zenda-cafe', 'datos_bancarios_enviados', 'Se mandaron datos bancarios', '#5aa9e6', 'automatic', 4),
  ('zenda-cafe', 'comprobante_recibido', 'Se recibió comprobante', '#9b7ede', 'automatic', 5),
  ('zenda-cafe', 'cliente_activo', 'Cliente activo', '#39b98a', 'manual', 6),
  ('zenda-cafe', 'cliente_inactivo', 'Cliente inactivo', '#ef4444', 'manual', 7)
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
  'ZENDA EN CASA',
  'Administrador Zenda en Casa',
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
  'ZENDA EN CASA',
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
