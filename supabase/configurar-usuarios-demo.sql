-- =========================================================
-- GREEN CHIMP CRM | VINCULAR USUARIOS DE DEMOSTRACIÓN
-- =========================================================
-- La página usa USUARIO + CONTRASEÑA.
-- Supabase Auth requiere una identidad técnica interna. Estas
-- direcciones no se muestran ni se escriben en el inicio de sesión.
--
-- Antes de ejecutar este SQL crea en:
-- Authentication > Users > Add user
--
-- 1) admin_woolrich@usuarios.greenchimp.mx  / demo123
-- 2) admin_dental@usuarios.greenchimp.mx    / demo123
-- 3) superadmin@usuarios.greenchimp.mx      / demo123
--
-- Activa "Auto Confirm User" al crearlos.
-- =========================================================

-- Administrador de Dr. Woolrich
insert into public.crm_company_members (
  user_id, company_key, company_name, full_name,
  login_username, role, logo_text, accent, active
)
select
  id,
  'dr-woolrich',
  'Dr. Woolrich',
  'Administrador Woolrich',
  'admin_woolrich',
  'admin',
  'DW',
  '#7c5cff',
  true
from auth.users
where lower(email) = 'admin_woolrich@usuarios.greenchimp.mx'
on conflict (user_id, company_key)
do update set
  company_name = excluded.company_name,
  full_name = excluded.full_name,
  login_username = excluded.login_username,
  role = excluded.role,
  logo_text = excluded.logo_text,
  accent = excluded.accent,
  active = true;

-- Administrador de Especialidades Dentales
insert into public.crm_company_members (
  user_id, company_key, company_name, full_name,
  login_username, role, logo_text, accent, active
)
select
  id,
  'especialidades-dentales',
  'Especialidades Dentales',
  'Administrador Dental',
  'admin_dental',
  'admin',
  'ED',
  '#16a085',
  true
from auth.users
where lower(email) = 'admin_dental@usuarios.greenchimp.mx'
on conflict (user_id, company_key)
do update set
  company_name = excluded.company_name,
  full_name = excluded.full_name,
  login_username = excluded.login_username,
  role = excluded.role,
  logo_text = excluded.logo_text,
  accent = excluded.accent,
  active = true;

-- Superadministrador con acceso a Dr. Woolrich
insert into public.crm_company_members (
  user_id, company_key, company_name, full_name,
  login_username, role, logo_text, accent, active
)
select
  id,
  'dr-woolrich',
  'Dr. Woolrich',
  'Superadministrador Green Chimp',
  'superadmin',
  'superadmin',
  'GC',
  '#7c5cff',
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

-- Superadministrador con acceso a Especialidades Dentales
insert into public.crm_company_members (
  user_id, company_key, company_name, full_name,
  login_username, role, logo_text, accent, active
)
select
  id,
  'especialidades-dentales',
  'Especialidades Dentales',
  'Superadministrador Green Chimp',
  'superadmin',
  'superadmin',
  'GC',
  '#16a085',
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

-- Verificación sin mostrar identidades internas:
select
  login_username as usuario,
  company_name as empresa,
  role as rol,
  active as activo
from public.crm_company_members
where login_username in ('admin_woolrich', 'admin_dental', 'superadmin')
order by login_username, company_name;

-- Administrador de Zenda Café
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

-- Superadministrador con acceso a Zenda Café
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
