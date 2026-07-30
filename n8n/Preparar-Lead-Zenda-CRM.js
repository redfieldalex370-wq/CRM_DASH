// ZENDA CAFÉ | PREPARAR LEAD PARA CRM
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
// CLASIFICACIÓN: TIENDA / COFFEE BREAK / MERCADITO
// ------------------------------------------------------
const moduleValue = normalize(first(
  data.modulo_seleccionado,
  data.modulo_sugerido,
  data.origen_modulo,
  data.ruta
));

let classification = '';

if (moduleValue.includes('MERCADITO')) {
  classification = 'MERCADITO';
} else if (
  moduleValue.includes('EVENTOS') ||
  moduleValue.includes('COFFEE BREAK') ||
  moduleValue.includes('COFFEE_BREAK')
) {
  classification = 'COFFEE BREAK';
} else if (moduleValue.includes('TIENDA')) {
  classification = 'TIENDA';
}

// Respaldo por palabras del mensaje cuando no llegó módulo.
const messageNormalized = normalize(clientMessage);
if (!classification) {
  if (/MERCADITO|CAFE EN GRANO|SALSA|FRIJOLES/.test(messageNormalized)) {
    classification = 'MERCADITO';
  } else if (/COFFEE BREAK|EVENTO|BODA|FIESTA|COTIZACION|COTIZAR|BARRA DE CAFE/.test(messageNormalized)) {
    classification = 'COFFEE BREAK';
  } else if (/MENU|CARTA|PEDIDO|BEBIDA|COMIDA|CUPON|UBER EATS|DIDI|RAPPI/.test(messageNormalized)) {
    classification = 'TIENDA';
  }
}

// ------------------------------------------------------
// ETAPA AUTOMÁTICA
// ------------------------------------------------------
const flowStatus = normalize(data.flow_status);
const asksHuman =
  bool(data.requiere_asesor) ||
  flowStatus === 'TRANSFERIR_HUMANO';

const asksMenu =
  bool(data.enviar_menu_pdf) ||
  bool(data.enviar_menu) ||
  bool(data.enviar_menu_imagen) ||
  bool(data.menu_zenda) ||
  flowStatus === 'OFRECER_MENU' ||
  /\bMENU\b|\bCARTA\b|CATALOGO|HABLAR CON|ASESOR|PERSONA|ENCARGADO|EMPLEADO/.test(messageNormalized);

const existsBefore =
  data.existe === true ||
  bool(data.existe) ||
  Boolean(text(data.etapa_actual || data.kanban_stage));

let kanbanStage = 'contactos_nuevos';

if (asksHuman || asksMenu) {
  kanbanStage = 'pidio_menu_asesor';
} else if (existsBefore) {
  kanbanStage = 'pregunta_adicional';
}

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
    p_classification: classification || null,
    p_service: service || null,
    p_kanban_stage: kanbanStage,
    p_source: 'WhatsApp',
    p_last_activity_at: new Date().toISOString(),
    p_raw_payload: data
  }
}];
