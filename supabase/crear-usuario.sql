-- =========================================================
-- VINCULAR UN USUARIO CON DR. WOOLRICH
-- =========================================================
-- 1. Elige un usuario, por ejemplo: operador_woolrich
-- 2. En Authentication > Users crea internamente:
--    operador_woolrich@usuarios.greenchimp.mx
-- 3. Cambia las dos apariciones de operador_woolrich abajo.
-- 4. Ejecuta este archivo.
-- =========================================================

insert into public.crm_company_members (
  user_id,
  company_key,
  company_name,
  full_name,
  login_username,
  role,
  logo_text,
  accent,
  active
)
select
  id,
  'dr-woolrich',
  'Dr. Woolrich',
  'Operador Woolrich',
  'operador_woolrich',
  'agent',
  'DW',
  '#7c5cff',
  true
from auth.users
where lower(email) = lower('operador_woolrich@usuarios.greenchimp.mx')
on conflict (user_id, company_key)
do update set
  company_name = excluded.company_name,
  full_name = excluded.full_name,
  login_username = excluded.login_username,
  role = excluded.role,
  logo_text = excluded.logo_text,
  accent = excluded.accent,
  active = true;

select
  login_username as usuario,
  company_name as empresa,
  role as rol,
  active as activo
from public.crm_company_members
where login_username = 'operador_woolrich';
