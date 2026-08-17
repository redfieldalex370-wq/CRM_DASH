-- GREEN CHIMP EXPRESS | WA CONVERSACIONES -> CRM_LEADS
-- Ejecutar en Supabase SQL Editor si quieres que las conversaciones nuevas
-- del portal tambien aparezcan automaticamente en el tablero del CRM.
--
-- Este trigger solo toca phone_number_id = '1240006745865858'.

create or replace function public.sync_green_chimp_conversation_to_crm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_text text;
  v_text_norm text;
  v_subscriber_id bigint;
  v_classification text;
  v_stage text;
  v_lead_id uuid;
begin
  if new.phone_number_id is distinct from '1240006745865858' then
    return new;
  end if;

  if coalesce(new.wa_id, '') !~ '^[0-9]+$' then
    return new;
  end if;

  v_subscriber_id := new.wa_id::bigint;
  v_text := coalesce(new.ultimo_texto, '');
  v_text_norm := translate(lower(v_text), 'áéíóúüñ', 'aeiouun');

  v_classification := case
    when v_text_norm ~ 'chat[ ]?bot|chimpbot|bot con inteligencia|whatsapp responde|responde automaticamente'
      then 'CHATBOT'
    else 'LANDING'
  end;

  v_stage := case
    when v_text_norm ~ 'link de pago|hacer el pago|listo para pagar|pagar y empezar'
      then 'listo_para_pago'
    when v_text_norm ~ 'precio|cuanto cuesta|caro|objecion'
      then 'objecion_precio'
    when v_text_norm ~ 'te estuvo atendiendo|asesor|equipo comercial|te escribe cesar'
      then 'contactado'
    when v_text_norm ~ 'paquete ideal|recomendarte|a que se dedica|objetivo|negocio|pagina actual|primera pagina'
      then 'calificando'
    else 'contactos_nuevos'
  end;

  insert into public.crm_leads as existing (
    company_key,
    subscriber_id,
    whatsapp_phone,
    nombre_paciente,
    service,
    classification,
    source,
    ultimo_mensaje_cliente,
    kanban_stage,
    stage_origin,
    stage_locked,
    tags,
    last_activity_at,
    raw_payload,
    source_updated_at
  )
  values (
    'green-chimp-express',
    v_subscriber_id,
    new.wa_id,
    coalesce(nullif(new.nombre, ''), 'Contacto ' || right(new.wa_id, 4)),
    case when v_classification = 'CHATBOT' then 'Chatbot Express' else 'Landing Express' end,
    v_classification,
    case when new.entrada_ctwa is null then 'WhatsApp' else 'Meta Ads' end,
    nullif(v_text, ''),
    v_stage,
    'n8n',
    false,
    jsonb_build_array(v_classification),
    coalesce(new.ultimo_inbound, new.ultimo_mensaje, new.actualizado_en, new.creado_en, now()),
    jsonb_build_object(
      'crm_sync_source', 'wa_conversaciones_trigger',
      'phone_number_id', new.phone_number_id,
      'chat_id', new.wa_id,
      'manychat_id', new.wa_id,
      'telefono', new.wa_id,
      'nombre_contacto', new.nombre,
      'producto_interes', v_classification,
      'classification', v_classification,
      'etapa', v_stage,
      'ultimo_mensaje', v_text,
      'ultimo_inbound', new.ultimo_inbound,
      'ultimo_mensaje_at', new.ultimo_mensaje,
      'actualizado_en', new.actualizado_en,
      'usuario_id', new.usuario_id,
      'bot_activo', new.bot_activo,
      'no_leidos', new.no_leidos
    ),
    now()
  )
  on conflict (company_key, subscriber_id)
  do update set
    whatsapp_phone = coalesce(excluded.whatsapp_phone, existing.whatsapp_phone),
    nombre_paciente = coalesce(nullif(excluded.nombre_paciente, ''), existing.nombre_paciente),
    service = coalesce(excluded.service, existing.service),
    classification = coalesce(excluded.classification, existing.classification),
    source = coalesce(excluded.source, existing.source),
    ultimo_mensaje_cliente = coalesce(nullif(excluded.ultimo_mensaje_cliente, ''), existing.ultimo_mensaje_cliente),
    kanban_stage = case
      when existing.stage_locked = true then existing.kanban_stage
      else excluded.kanban_stage
    end,
    stage_origin = case
      when existing.stage_locked = true then existing.stage_origin
      else 'n8n'
    end,
    tags = excluded.tags,
    last_activity_at = coalesce(excluded.last_activity_at, existing.last_activity_at),
    raw_payload = excluded.raw_payload,
    source_updated_at = now(),
    updated_at = now()
  returning id into v_lead_id;

  new.crm_lead_id := v_lead_id;
  new.crm_sincro_en := now();

  return new;
end;
$$;

drop trigger if exists trg_sync_green_chimp_conversation_to_crm
on public.wa_conversaciones;

create trigger trg_sync_green_chimp_conversation_to_crm
before insert or update of
  nombre,
  ultimo_texto,
  ultimo_mensaje,
  ultimo_inbound,
  entrada_ctwa,
  bot_activo,
  no_leidos,
  actualizado_en
on public.wa_conversaciones
for each row
execute function public.sync_green_chimp_conversation_to_crm();

-- Backfill de conversaciones existentes de Green Chimp Express.
update public.wa_conversaciones
set actualizado_en = now()
where phone_number_id = '1240006745865858'
  and coalesce(wa_id, '') ~ '^[0-9]+$';
