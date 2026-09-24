// ZENDA EN CASA | PREPARAR LEAD PARA CRM
// Coloca este nodo después de "Validar Alerta Asesor" o del
// último parser que ya reúna la respuesta y los datos del contacto.

const data = $json || {};

function text(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function bool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return ['true', '1', 'si', 'sí', 'yes'].includes(text(value).toLowerCase());
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

function normalize(value) {
  return text(value)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function subscriberNumber(value) {
  const match = digits(value).match(/\d+/);
  if (!match) return null;
  const number = Number(match[0]);
  return Number.isSafeInteger(number) ? number : null;
}

// ------------------------------------------------------
// IDENTIDAD DEL CONTACTO
// ------------------------------------------------------
const subscriberId = subscriberNumber(first(
  data.manychat_id,
  data.manychatId,
  data.chat_id,
  data.subscriber_id,
  data.webhook_subscriber_id,
  data.id
));

if (!subscriberId) {
  throw new Error('No se encontró un manychat_id, chat_id o subscriber_id válido.');
}

const phone = digits(first(
  data.telefono_cliente,
  data.telefono,
  data.whatsapp_phone,
  data.phone,
  data.userphone
));

const name = first(
  data.nombre_cliente,
  data.nombre,
  data.lead_name,
  data.name,
  data.first_name,
  'Contacto ' + String(subscriberId).slice(-4)
);

const clientMessage = first(
  data.ultimo_mensaje_cli,
  data.ultimo_mensaje_cliente,
  data.text,
  data.input,
  data.mensaje,
  data.last_input_text,
  data.raw_input?.last_input_text,
  data.raw_input?.text
);

// ------------------------------------------------------
// FILTRO: SOLO ZENDA EN CASA
// ------------------------------------------------------
const moduleValue = normalize(first(
  data.modulo_seleccionado,
  data.modulo_sugerido,
  data.origen_modulo,
  data.ruta
));

const messageNormalized = normalize(clientMessage);
const isZendaEnCasa = moduleValue.includes('ZENDA EN CASA') || messageNormalized.includes('ZENDA EN CASA');
if (!isZendaEnCasa) {
  return [];
}

// ------------------------------------------------------
// ETAPA AUTOMÁTICA
// ------------------------------------------------------
const flowStatus = normalize(data.flow_status);
const asksMenu =
  bool(data.enviar_menu_pdf) ||
  bool(data.enviar_menu) ||
  bool(data.enviar_menu_imagen) ||
  bool(data.menu_zenda) ||
  flowStatus === 'OFRECER_MENU' ||
  /\bMENU\b|\bCARTA\b|PLATILLOS/.test(messageNormalized);
const wasQuoted = bool(data.cotizacion_enviada) || /COTIZ|TOTAL|PRECIO/.test(flowStatus);
const bankDataSent = bool(data.datos_bancarios_enviados) || /DATOS.*BANC|TRANSFERENCIA|CLABE/.test(flowStatus);
const proofReceived = bool(data.comprobante_recibido) || /COMPROBANTE.*RECIB|PAGO.*RECIB/.test(flowStatus);

let kanbanStage = 'cliente_nuevo';
if (asksMenu) kanbanStage = 'pregunto_menu';
if (wasQuoted) kanbanStage = 'cotizado';
if (bankDataSent) kanbanStage = 'datos_bancarios_enviados';
if (proofReceived) kanbanStage = 'comprobante_recibido';

const service = first(
  data.intencion,
  data.tipo_evento,
  data.producto,
  data.notas,
  data.modulo_sugerido,
  data.modulo_seleccionado
);

return [{
  json: {
    p_subscriber_id: subscriberId,
    p_whatsapp_phone: phone || null,
    p_nombre_paciente: name,
    p_ultimo_mensaje_cliente: clientMessage || null,
    p_classification: null,
    p_service: service || 'Zenda en Casa',
    p_kanban_stage: kanbanStage,
    p_source: 'WhatsApp',
    p_last_activity_at: new Date().toISOString(),
    p_raw_payload: data
  }
}];
