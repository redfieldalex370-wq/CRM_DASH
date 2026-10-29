// SISTEMA PACIENTES | PREPARAR LEAD PARA EL CRM CENTRAL
// Pega este Code node después de "Parser Salida".
// Configúralo en "Run Once for Each Item".
// El siguiente nodo debe ser Postgres con la credencial del SUPABASE CENTRAL DEL CRM.

const parser = $json || {};
const fila = parser.fila || {};
const incoming = $('Extraer Datos').first().json || {};

const text = (value) => String(value ?? '').trim();
const digits = (value) => text(value).replace(/\D/g, '');
const waId = digits(fila.wa_id || parser.wa_id || incoming.wa_id);
const subscriberId = Number(waId);

if (!Number.isSafeInteger(subscriberId)) {
  throw new Error('SISTEMA PACIENTES CRM: no se encontró un WhatsApp válido.');
}

const estado = text(fila.estado).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
let stage = 'contactos_nuevos';
if (estado === 'CALIFICADO') stage = 'calificado';
else if (estado === 'LINK_ENVIADO') stage = 'link_enviado';
else if (estado === 'AGENDO') stage = 'cita_agendada';
else if (estado === 'FRIO') stage = 'no_interesado';

const specialty = text(fila.especialidad);
const businessType = text(fila.tipo_negocio);
const service = specialty || businessType || 'Sistema de captación de pacientes';

return [{
  json: {
    p_company_key: 'sistema-pacientes',
    p_subscriber_id: subscriberId,
    p_whatsapp_phone: waId,
    p_nombre_paciente: text(fila.nombre) || text(incoming.nombre_perfil) || `Contacto ${waId.slice(-4)}`,
    p_service: service,
    p_kanban_stage: stage,
    p_source: text(fila.origen) || 'WhatsApp Sistema Pacientes',
    p_ultimo_mensaje_cliente: text(fila.ultimo_mensaje) || text(incoming.texto),
    p_ultimo_mensaje_bot: text(fila.ultima_respuesta_bot) || text(parser.reply),
    p_last_activity_at: text(fila.ultimo_mensaje_ts) || new Date().toISOString(),
    p_raw_payload: {
      especialidad: specialty || null,
      tipo_negocio: businessType || null,
      ciudad: text(fila.ciudad) || null,
      tratamiento_principal: text(fila.tratamiento_principal) || null,
      ticket_aprox: text(fila.ticket_aprox) || null,
      recomendacion: text(fila.recomendacion) || null,
      estado_sistema_pacientes: text(fila.estado) || 'NUEVO',
      lead_caliente: text(fila.lead_caliente) || 'no',
      link_enviado_ts: text(fila.link_enviado_ts) || null,
      source_phone_number_id: text(fila.phone_number_id || incoming.phone_number_id),
      fuente: 'WhatsApp Sistema Pacientes'
    }
  }
}];
