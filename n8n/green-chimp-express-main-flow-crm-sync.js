// GREEN CHIMP EXPRESS | FLUJO PRINCIPAL -> CRM
// n8n Code node: Run Once for Each Item.
//
// Colocalo despues de "Guardar Estado PostgreSQL" y antes de responder por
// WhatsApp. Convierte el estado del flujo principal al contrato del RPC:
// public.upsert_crm_lead_from_sheet.

const estado = $input.first()?.json || {};

function nodeJson(name) {
  try {
    return $(name).first().json || {};
  } catch (error) {
    return {};
  }
}

const entrada = nodeJson('Extraer Datos1');
const ruta = nodeJson('Detectar Ruta');
const normalizado = nodeJson('Normalizar Cliente');
const validado = nodeJson('Validador Comercial y CRM1');
const cierre = Object.keys(nodeJson('Cierre Determinístico1')).length
  ? nodeJson('Cierre Determinístico1')
  : nodeJson('Cierre Deterministico1');

function text(value) {
  if (value === undefined || value === null) return '';
  const result = String(value).trim();
  const lower = result.toLowerCase();
  if (!result || lower === 'null' || lower === 'undefined' || result === '[null]') return '';
  return result;
}

function first(...values) {
  for (const value of values) {
    const result = text(value);
    if (result) return result;
  }
  return '';
}

function digits(value) {
  const result = text(value).replace(/\D/g, '');
  return result || '';
}

function bool(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value === null || value === undefined) return false;
  return ['true', '1', 'si', 'sí', 'yes', 'verdadero'].includes(text(value).toLowerCase());
}

function normalize(value) {
  return text(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_/-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeKey(value) {
  return normalize(value)
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function subscriberNumber(value) {
  const raw = digits(value);
  if (!raw) return null;
  const number = Number(raw);
  return Number.isSafeInteger(number) ? number : null;
}

function productFrom(value) {
  const normalized = normalize(value);
  if (
    normalized.includes('chatbot') ||
    normalized.includes('chat bot') ||
    normalized === 'bot'
  ) {
    return 'Chatbot';
  }
  if (
    normalized.includes('landing') ||
    normalized.includes('sitio web') ||
    normalized.includes('pagina web') ||
    normalized.includes('web')
  ) {
    return 'Landing';
  }
  return '';
}

const VALID_STAGES = new Set([
  'contactos_nuevos',
  'calificando',
  'cotizado',
  'objecion_precio',
  'listo_para_pago',
  'contactado',
  'cliente',
  'cliente_concretado',
  'perdido'
]);

function normalizeStage(value) {
  const stage = normalizeKey(value);
  const aliases = {
    nuevo: 'contactos_nuevos',
    contacto_nuevo: 'contactos_nuevos',
    contactos_nuevo: 'contactos_nuevos',
    contactos_nuevos: 'contactos_nuevos',
    calificacion: 'calificando',
    calificando: 'calificando',
    cotizacion: 'cotizado',
    cotizado: 'cotizado',
    objecion: 'objecion_precio',
    objecion_de_precio: 'objecion_precio',
    objecion_precio: 'objecion_precio',
    listo_pago: 'listo_para_pago',
    listo_para_pago: 'listo_para_pago',
    listo_para_pagar: 'listo_para_pago',
    contactado: 'contactado',
    contactado_por_asesor: 'contactado',
    cliente: 'cliente',
    cliente_activo: 'cliente',
    cliente_concretado: 'cliente_concretado',
    concretado: 'cliente_concretado',
    perdido: 'perdido'
  };

  const result = aliases[stage] || stage;
  return VALID_STAGES.has(result) ? result : '';
}

function stageFromState(value) {
  const state = normalize(value);
  if (!state) return '';
  if (state === 'nuevo') return 'contactos_nuevos';
  if (state === 'calificando') return 'calificando';
  if (state === 'cotizado') return 'cotizado';
  if (state === 'objecion precio' || state === 'objecion de precio') return 'objecion_precio';
  if (state === 'cerrado') return 'listo_para_pago';
  if (state === 'perdido') return 'perdido';
  return '';
}

function resolveStage() {
  const explicit = normalizeStage(first(
    cierre.kanban_stage,
    validado.kanban_stage,
    estado.kanban_stage,
    cierre.etapa,
    validado.etapa,
    estado.etapa
  ));
  if (explicit) return explicit;

  if (bool(first(cierre.listo_para_pagar, validado.listo_para_pagar, estado.listo_para_pagar))) {
    return 'listo_para_pago';
  }

  const fromState = stageFromState(first(cierre.estado, validado.estado, estado.estado));
  if (fromState) return fromState;

  const hasCommercialData = [
    estado.nombre_negocio,
    estado.tipo_negocio,
    estado.paquete_recomendado,
    estado.presupuesto_detectado,
    estado.ultimo_mensaje_usuario,
    validado.ultimo_mensaje_usuario,
    entrada.text
  ].some((value) => text(value));

  return hasCommercialData ? 'calificando' : 'contactos_nuevos';
}

const subscriberId = subscriberNumber(first(
  estado.manychat_id,
  estado.chat_id,
  entrada.manychat_id,
  entrada.chat_id,
  normalizado.manychat_id,
  normalizado.chat_id,
  estado.usuario_id
));

if (!subscriberId) {
  throw new Error('No se encontro chat_id/manychat_id numerico para sincronizar el CRM.');
}

const product = productFrom(first(
  cierre.producto_interes,
  validado.producto_interes,
  estado.producto_interes,
  ruta.producto_interes,
  ruta.ruta,
  ruta.modulo,
  ruta.modulo_seleccionado
));

const name = first(
  cierre.nombre_contacto,
  validado.nombre_contacto,
  estado.nombre_contacto,
  entrada.nombre_recibido,
  entrada.nombre,
  'Contacto ' + String(subscriberId).slice(-4)
);

const phone = digits(first(
  cierre.telefono,
  validado.telefono,
  estado.telefono,
  entrada.telefono,
  entrada.chat_id
));

const lastClientMessage = first(
  cierre.ultimo_mensaje_usuario,
  validado.ultimo_mensaje_usuario,
  estado.ultimo_mensaje_usuario,
  entrada.text,
  normalizado.input
);

const botResponse = first(
  cierre.final_text,
  cierre.texto_cliente,
  validado.final_text,
  validado.texto_cliente,
  estado.ultima_respuesta_bot
);

const stage = resolveStage();
const nowIso = new Date().toISOString();

const rawPayload = {
  ...normalizado,
  ...estado,
  ...validado,
  ...cierre,
  crm_sync_source: 'flujo_principal',
  manychat_id: String(subscriberId),
  chat_id: first(estado.chat_id, entrada.chat_id),
  nombre_completo: name,
  nombre_contacto: name,
  telefono: phone,
  correo: first(cierre.correo, validado.correo, estado.correo),
  nombre_negocio: first(cierre.nombre_negocio, validado.nombre_negocio, estado.nombre_negocio),
  tipo_negocio: first(cierre.tipo_negocio, validado.tipo_negocio, estado.tipo_negocio),
  producto_interes: product,
  classification: product ? product.toUpperCase() : '',
  etapa: stage,
  estado: first(cierre.estado, validado.estado, estado.estado, 'Nuevo'),
  flow_status: first(cierre.flow_status, validado.flow_status, estado.flow_status),
  paquete_recomendado: first(cierre.paquete_recomendado, validado.paquete_recomendado, estado.paquete_recomendado),
  precio_paquete: Number(first(cierre.precio_paquete, validado.precio_paquete, estado.precio_paquete, 0)) || 0,
  setup_paquete: Number(first(cierre.setup_paquete, validado.setup_paquete, estado.setup_paquete, 0)) || 0,
  presupuesto_detectado: first(cierre.presupuesto_detectado, validado.presupuesto_detectado, estado.presupuesto_detectado),
  objetivo_sitio: first(cierre.objetivo_sitio, validado.objetivo_sitio, estado.objetivo_sitio),
  funciones_requeridas: first(cierre.funciones_requeridas, validado.funciones_requeridas, estado.funciones_requeridas),
  tiene_pagina_actual: first(cierre.tiene_pagina_actual, validado.tiene_pagina_actual, estado.tiene_pagina_actual),
  dominio_deseado: first(cierre.dominio_deseado, validado.dominio_deseado, estado.dominio_deseado),
  objeciones_precio: Number(first(cierre.objeciones_precio, validado.objeciones_precio, estado.objeciones_precio, 0)) || 0,
  listo_para_pagar: stage === 'listo_para_pago' || bool(first(cierre.listo_para_pagar, validado.listo_para_pagar, estado.listo_para_pagar)),
  requiere_asesor: bool(first(cierre.requiere_asesor, validado.requiere_asesor, estado.requiere_asesor)),
  motivo_escalacion: first(cierre.motivo_escalacion, validado.motivo_escalacion, estado.motivo_escalacion),
  asesor_notificado: bool(first(cierre.alerta_enviada, validado.alerta_enviada, estado.alerta_enviada)),
  fecha_alerta_asesor: first(cierre.fecha_alerta_asesor, validado.fecha_alerta_asesor, estado.fecha_alerta_asesor),
  ultimo_mensaje: lastClientMessage,
  ultimo_mensaje_cliente: lastClientMessage,
  respuesta_bot: botResponse,
  fecha_primer_contacto: first(estado.fecha_creacion, normalizado.fecha_creacion, nowIso),
  fecha_ultimo_contacto: nowIso,
  fuente: first(entrada.fuente, estado.fuente, 'WhatsApp'),
  campana: first(entrada.campana, estado.campana),
  anuncio: first(entrada.anuncio, estado.anuncio)
};

return [{
  json: {
    p_company_key: 'green-chimp-express',
    p_subscriber_id: subscriberId,
    p_whatsapp_phone: phone || null,
    p_nombre_paciente: name,
    p_fecha_cita: null,
    p_status_cita: null,
    p_last_activity_timestamp: null,
    p_last_activity_at: nowIso,
    p_ultimo_mensaje_cliente: lastClientMessage || null,
    p_kanban_stage: stage,
    p_raw_payload: rawPayload
  }
}];
