-- GREEN CHIMP CRM | SISTEMA PACIENTES
-- Ejecutar una sola vez en el SQL Editor del SUPABASE CENTRAL DEL CRM.

begin;

insert into public.crm_pipeline_stages
  (company_key, stage_key, name, color, movement_mode, position)
values
  ('sistema-pacientes', 'contactos_nuevos', 'Contactos nuevos', '#64748b', 'automatic', 1),
  ('sistema-pacientes', 'calificado', 'Calificado', '#3b82f6', 'automatic', 2),
  ('sistema-pacientes', 'link_enviado', 'Link enviado', '#8b5cf6', 'automatic', 3),
  ('sistema-pacientes', 'cita_agendada', 'Cita agendada', '#10b981', 'automatic', 4),
  ('sistema-pacientes', 'contactado', 'Contactado por asesor', '#06b6d4', 'manual', 5),
  ('sistema-pacientes', 'cliente_activo', 'Cliente activo', '#22c55e', 'manual', 6),
  ('sistema-pacientes', 'no_interesado', 'No interesado', '#ef4444', 'automatic', 7)
on conflict (company_key, stage_key) do update set
  name = excluded.name,
  color = excluded.color,
  movement_mode = excluded.movement_mode,
  position = excluded.position;

-- Da acceso al superadministrador existente.
insert into public.crm_company_members
  (user_id, company_key, company_name, full_name, login_username, role, logo_text, accent, active)
select
  m.user_id,
  'sistema-pacientes',
  'Sistema Pacientes',
  coalesce(m.full_name, 'Superadministrador Green Chimp'),
  coalesce(m.login_username, 'superadmin'),
  'superadmin',
  'SP',
  '#2563eb',
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
