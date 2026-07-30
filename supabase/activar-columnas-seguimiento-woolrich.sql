-- =========================================================
-- DR. WOOLRICH | COLUMNAS DE SEGUIMIENTO EN EL KANBAN
-- =========================================================
-- Los tres seguimientos se alimentan automáticamente desde
-- crm_leads.s1_enviado, s2_enviado y s3_enviado.
-- "No asistió a cita" sólo se mueve manualmente desde el CRM.

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
  position = excluded.position,
  updated_at = now();
