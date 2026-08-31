// GREEN CHIMP EXPRESS | RECUPERAR LEADS YA GUARDADOS EN gc_leads_estado
// n8n Code node: Run Once for All Items.
// Entrada: filas del nodo PostgreSQL "Leer gc_leads_estado para CRM".
// Salida: una llamada RPC por lead para el CRM Green Chimp Express.

function text(value) {
  if (value === undefined || value === null) return '';
  const result = String(value).trim();
  return ['null', 'undefined', '[null]'].includes(result.toLowerCase()) ? '' : result;
}

function digits(value) {
  return text(value).replace(/\D/g, '');
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

function stage(value, state, flowStatus) {
  const candidate = normalize(value || state || flowStatus).replace(/\s+/g, '_');
  const aliases = {
    nuevo: 'contactos_nuevos',
    contactos_nuevos: 'contactos_nuevos',
    en_proceso: 'calificando',
    calificando: 'calificando',
    cotizacion: 'cotizado',
    cotizado: 'cotizado',
    objecion_precio: 'objecion_precio',
    listo_para_pago: 'listo_para_pago',
    cerrado: 'listo_para_pago',
    contactado: 'contactado',
    cliente: 'cliente',
    cliente_activo: 'cliente',
    cliente_concretado: 'cliente_concretado',
    perdido: 'perdido',
  };
  return aliases[candidate] || 'contactos_nuevos';
}

function classification(value) {
  const product = normalize(value);
  if (product.includes('chatbot') || product.includes('chat bot') || product === 'bot') return 'CHATBOT';
  if (product.includes('landing') || product.includes('sitio') || product.includes('pagina') || product.includes('web')) return 'LANDING';
  return '';
}

const output = [];

for (const item of $input.all()) {
  const lead = item.json || {};
  const subscriberDigits = digits(lead.chat_id || lead.manychat_id || lead.telefono);
  const subscriberId = Number(subscriberDigits);
  if (!subscriberDigits || !Number.isSafeInteger(subscriberId)) continue;

  const product = classification(lead.producto_interes);
  const currentStage = stage(lead.etapa, lead.estado, lead.flow_status);
  const phone = digits(lead.telefono || lead.chat_id);
  const name = text(lead.nombre_contacto) || `Contacto ${subscriberDigits.slice(-4)}`;
  const lastActivity = text(lead.fecha_actualizacion || lead.fecha_creacion) || new Date().toISOString();

  output.push({
    json: {
      p_company_key: 'green-chimp-express',
      p_subscriber_id: subscriberId,
      p_whatsapp_phone: phone || null,
      p_nombre_paciente: name,
      p_fecha_cita: null,
      p_status_cita: null,
      p_last_activity_timestamp: null,
      p_last_activity_at: lastActivity,
      p_ultimo_mensaje_cliente: text(lead.ultimo_mensaje_usuario) || null,
      p_kanban_stage: currentStage,
      p_raw_payload: {
        ...lead,
        classification: product,
        producto_interes: product === 'LANDING' ? 'Landing' : product === 'CHATBOT' ? 'Chatbot' : text(lead.producto_interes),
        etapa: currentStage,
        crm_sync_source: 'gc_leads_estado_backfill',
        nombre_completo: name,
        telefono: phone,
        ultimo_mensaje: text(lead.ultimo_mensaje_usuario),
        respuesta_bot: text(lead.ultima_respuesta_bot),
        fecha_primer_contacto: text(lead.fecha_creacion),
        fecha_ultimo_contacto: lastActivity,
        asesor_notificado: Boolean(lead.alerta_enviada),
        listo_para_pagar: currentStage === 'listo_para_pago',
      },
    },
  });
}

return output;
