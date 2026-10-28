-- GREEN CHIMP CRM | MUEBLES NOVA HOME
-- Ejecutar una sola vez en el SQL Editor del SUPABASE CENTRAL DEL CRM.
-- No ejecutar en el Supabase propio de Nova Home.

begin;

insert into public.crm_pipeline_stages
  (company_key, stage_key, name, color, movement_mode, position)
values
  ('muebles-nova-home', 'contactos_nuevos', 'Contactos nuevos', '#64748b', 'automatic', 1),
  ('muebles-nova-home', 'consulto_producto', 'Consultó producto', '#3b82f6', 'automatic', 2),
  ('muebles-nova-home', 'pedido_confirmado', 'Pedido confirmado', '#8b5cf6', 'automatic', 3),
  ('muebles-nova-home', 'entrega_solicitada', 'Entrega solicitada', '#f59e0b', 'automatic', 4),
  ('muebles-nova-home', 'pendiente_asesor', 'Pendiente de asesor', '#06b6d4', 'automatic', 5),
  ('muebles-nova-home', 'venta_concretada', 'Venta concretada', '#22c55e', 'manual', 6),
  ('muebles-nova-home', 'cancelado', 'Cancelado', '#ef4444', 'manual', 7)
on conflict (company_key, stage_key) do update set
  name = excluded.name,
  color = excluded.color,
  movement_mode = excluded.movement_mode,
  position = excluded.position;

-- Da acceso al superadministrador que ya existe en el CRM.
insert into public.crm_company_members
  (user_id, company_key, company_name, full_name, login_username, role, logo_text, accent, active)
select
  m.user_id,
  'muebles-nova-home',
  'Muebles Nova Home',
  coalesce(m.full_name, 'Superadministrador Green Chimp'),
  coalesce(m.login_username, 'superadmin'),
  'superadmin',
  'NH',
  '#d97706',
  true
from public.crm_company_members m
where m.active = true
  and (m.role = 'superadmin' or lower(coalesce(m.login_username, '')) = 'superadmin')
order by m.created_at asc
limit 1
on conflict (user_id, company_key) do update set
  company_name = excluded.company_name,
  logo_text = excluded.logo_text,
  accent = excluded.accent,
  active = true;

notify pgrst, 'reload schema';
commit;

select company_key, stage_key, name, movement_mode, position
from public.crm_pipeline_stages
where company_key = 'muebles-nova-home'
order by position;
