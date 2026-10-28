-- MUEBLES NOVA HOME | UPSERT PARA EL CRM CENTRAL
-- Usar en un nodo Postgres después de Preparar-Lead-Muebles-Nova-CRM.
-- Query parameters en n8n:
-- {{ [$json.p_company_key, $json.p_subscriber_id, $json.p_whatsapp_phone,
--     $json.p_nombre_paciente, $json.p_service, $json.p_kanban_stage,
--     $json.p_source, $json.p_ultimo_mensaje_cliente, $json.p_ultimo_mensaje_bot,
--     $json.p_last_activity_at, JSON.stringify($json.p_raw_payload)] }}

insert into public.crm_leads (
  company_key, subscriber_id, whatsapp_phone, nombre_paciente,
  service, kanban_stage, stage_origin, stage_locked, source,
  ultimo_mensaje_cliente, ultimo_mensaje_bot, last_activity_at,
  raw_payload, source_updated_at
) values (
  $1, $2::bigint, nullif($3, ''), nullif($4, ''),
  nullif($5, ''), $6, 'n8n', false, nullif($7, ''),
  nullif($8, ''), nullif($9, ''), $10::timestamptz,
  coalesce($11::jsonb, '{}'::jsonb), now()
)
on conflict (company_key, subscriber_id) do update set
  whatsapp_phone = excluded.whatsapp_phone,
  nombre_paciente = coalesce(nullif(excluded.nombre_paciente, ''), crm_leads.nombre_paciente),
  service = coalesce(nullif(excluded.service, ''), crm_leads.service),
  kanban_stage = case when crm_leads.stage_locked then crm_leads.kanban_stage else excluded.kanban_stage end,
  stage_origin = case when crm_leads.stage_locked then crm_leads.stage_origin else 'n8n' end,
  source = coalesce(nullif(excluded.source, ''), crm_leads.source),
  ultimo_mensaje_cliente = coalesce(nullif(excluded.ultimo_mensaje_cliente, ''), crm_leads.ultimo_mensaje_cliente),
  ultimo_mensaje_bot = coalesce(nullif(excluded.ultimo_mensaje_bot, ''), crm_leads.ultimo_mensaje_bot),
  last_activity_at = excluded.last_activity_at,
  raw_payload = crm_leads.raw_payload || excluded.raw_payload,
  source_updated_at = now(),
  updated_at = now();
