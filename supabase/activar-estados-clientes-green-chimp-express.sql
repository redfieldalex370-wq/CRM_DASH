-- =========================================================
-- GREEN CHIMP EXPRESS | ESTADOS MANUALES DE CLIENTES
-- =========================================================
-- cliente: servicio mensual que permanece activo.
-- cliente_concretado: venta de una sola ocasión o servicio mensual terminado.

insert into public.crm_pipeline_stages
  (company_key, stage_key, name, color, movement_mode, position)
values
  ('green-chimp-express', 'cliente', 'CLIENTE ACTIVO', '#22c55e', 'manual', 7),
  ('green-chimp-express', 'cliente_concretado', 'CLIENTE CONCRETADO', '#14b8a6', 'manual', 8),
  ('green-chimp-express', 'perdido', 'Perdido', '#ef4444', 'manual', 9)
on conflict (company_key, stage_key) do update set
  name = excluded.name,
  color = excluded.color,
  movement_mode = excluded.movement_mode,
  position = excluded.position,
  updated_at = now();
