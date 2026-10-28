// MUEBLES NOVA HOME | PREPARAR LEAD PARA EL CRM CENTRAL
// Pega este Code node después de "Parser y Guardarraíl Nova Home1".
// El siguiente nodo debe ser un Postgres apuntando al SUPABASE CENTRAL DEL CRM.

const parser = $json || {};
const incoming = $('Extraer Datos Nova Home').first().json || {};
const saved = $('Buscar o Crear Usuario PostgreSQL Nova Home1').first().json || {};

const text = (value) => String(value ?? '').trim();
const digits = (value) => text(value).replace(/\D/g, '');
const chatId = digits(parser.chat_id || incoming.chat_id || saved.whatsapp_phone);
const subscriberId = Number(chatId);

if (!Number.isSafeInteger(subscriberId)) {
  throw new Error('NOVA CRM: no se encontró un WhatsApp válido para identificar al contacto.');
}

const fichas = Array.isArray(parser.fichas_enviadas) ? parser.fichas_enviadas.filter(Boolean) : [];
const confirmed = Boolean(parser.pedido_confirmado) || saved.nova_estado === 'pendiente_fecha';
const deliveryDate = text(parser.fecha_entrega_solicitada || saved.nova_fecha_solicitada);
const needsAdvisor = Boolean(parser.escalar) || saved.nova_estado === 'pendiente_asesor';

let stage = 'contactos_nuevos';
if (needsAdvisor) stage = 'pendiente_asesor';
else if (deliveryDate) stage = 'entrega_solicitada';
else if (confirmed) stage = 'pedido_confirmado';
else if (fichas.length) stage = 'consulto_producto';

const product = fichas.length ? fichas.join(' · ') : 'Consulta de catálogo';
const customerName = text(parser.nombre_cliente || saved['Nombre del cliente'] || incoming.nombre);

return [{
  json: {
    p_company_key: 'muebles-nova-home',
    p_subscriber_id: subscriberId,
    p_whatsapp_phone: chatId,
    p_nombre_paciente: customerName || `Contacto ${chatId.slice(-4)}`,
    p_service: product,
    p_kanban_stage: stage,
    p_source: 'WhatsApp Nova Home',
    p_ultimo_mensaje_cliente: text(incoming.text || incoming.mensaje),
    p_ultimo_mensaje_bot: text(parser.final_text || parser.reply),
    p_last_activity_at: new Date().toISOString(),
    p_raw_payload: {
      producto: product,
      fichas_enviadas: fichas,
      pedido_confirmado: confirmed,
      fecha_entrega_solicitada: deliveryDate || null,
      nova_estado: text(saved.nova_estado) || (deliveryDate ? 'pendiente_asesor' : confirmed ? 'pendiente_fecha' : 'sin_confirmar'),
      motivo_escalamiento: text(parser.motivo_escalamiento),
      requiere_asesor: needsAdvisor,
      fuente: 'WhatsApp Nova Home'
    }
  }
}];
