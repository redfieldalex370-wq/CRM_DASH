import { restRequest } from './supabase';

const encode = encodeURIComponent;
const nowIso = () => new Date().toISOString();

const DEFAULT_STAGES_BY_COMPANY = {
  'dr-woolrich': [
    { stageKey: 'contactos_nuevos', name: 'Contactos nuevos', color: '#6d7cff', mode: 'automatic', order: 1 },
    { stageKey: 'preguntaron_fechas', name: 'Preguntaron por fechas', color: '#37a9ff', mode: 'automatic', order: 2 },
    { stageKey: 'seguimiento_1', name: 'Seguimiento 1', color: '#38bdf8', mode: 'automatic', order: 3 },
    { stageKey: 'seguimiento_2', name: 'Seguimiento 2', color: '#818cf8', mode: 'automatic', order: 4 },
    { stageKey: 'seguimiento_3', name: 'Seguimiento 3', color: '#a78bfa', mode: 'automatic', order: 5 },
    { stageKey: 'cita_agendada', name: 'Cita agendada', color: '#20c997', mode: 'automatic', order: 6 },
    { stageKey: 'asistio_consulta', name: 'Asistió a consulta', color: '#ff9f43', mode: 'manual', order: 7 },
    { stageKey: 'no_asistio_cita', name: 'No asistió a cita', color: '#ef4444', mode: 'manual', order: 8 },
    { stageKey: 'cirugia_agendada', name: 'Cirugía agendada', color: '#f368e0', mode: 'manual', order: 9 },
    { stageKey: 'cita_cancelada', name: 'Cita cancelada', color: '#fb7185', mode: 'manual', order: 10 },
  ],
  'zenda-cafe': [
    { stageKey: 'contactos_nuevos', name: 'Contactos nuevos', color: '#8b6f47', mode: 'automatic', order: 1 },
    { stageKey: 'pregunta_adicional', name: 'Pregunta algo adicional', color: '#c8965f', mode: 'automatic', order: 2 },
    { stageKey: 'pidio_menu_asesor', name: 'Pidió menú / pidió hablar con asesor', color: '#e2b873', mode: 'automatic', order: 3 },
    { stageKey: 'contactado', name: 'Contactado', color: '#5aa9e6', mode: 'manual', order: 4 },
    { stageKey: 'cotizacion_formal_mandada', name: 'Cotización formal mandada', color: '#9b7ede', mode: 'manual', order: 5 },
    { stageKey: 'acepto_cotizacion', name: 'Aceptó cotización', color: '#39b98a', mode: 'manual', order: 6 },
    { stageKey: 'cliente', name: 'Cliente', color: '#d48b45', mode: 'manual', order: 7 },
  ],
  'especialidades-dentales': [
    { stageKey: 'contactos_nuevos', name: 'Contactos nuevos', color: '#64748b', mode: 'automatic', order: 1 },
    { stageKey: 'preguntaron_fechas', name: 'Preguntaron por fechas', color: '#3b82f6', mode: 'automatic', order: 2 },
    { stageKey: 'valoracion_agendada', name: 'Valoración agendada', color: '#10b981', mode: 'automatic', order: 3 },
    { stageKey: 'asistio_valoracion', name: 'Asistió a valoración', color: '#f59e0b', mode: 'manual', order: 4 },
    { stageKey: 'canalizado_especialista', name: 'Canalizado con especialista', color: '#8b5cf6', mode: 'manual', order: 5 },
    { stageKey: 'tratamiento_agendado', name: 'Tratamiento agendado', color: '#06b6d4', mode: 'manual', order: 6 },
    { stageKey: 'cita_cancelada', name: 'Cita cancelada / seguimiento', color: '#ef4444', mode: 'automatic', order: 7 },
  ],
  'green-chimp-express': [
    { stageKey: 'contactos_nuevos', name: 'Contactos nuevos', color: '#64748b', mode: 'automatic', order: 1 },
    { stageKey: 'calificando', name: 'Calificando', color: '#3b82f6', mode: 'automatic', order: 2 },
    { stageKey: 'cotizado', name: 'Cotizado', color: '#8b5cf6', mode: 'automatic', order: 3 },
    { stageKey: 'objecion_precio', name: 'Objeción de precio', color: '#f59e0b', mode: 'automatic', order: 4 },
    { stageKey: 'listo_para_pago', name: 'Listo para pagar', color: '#10b981', mode: 'automatic', order: 5 },
    { stageKey: 'contactado', name: 'Contactado por asesor', color: '#06b6d4', mode: 'manual', order: 6 },
    { stageKey: 'cliente', name: 'CLIENTE ACTIVO', color: '#22c55e', mode: 'manual', order: 7 },
    { stageKey: 'cliente_concretado', name: 'CLIENTE CONCRETADO', color: '#14b8a6', mode: 'manual', order: 8 },
    { stageKey: 'perdido', name: 'Perdido', color: '#ef4444', mode: 'manual', order: 9 },
  ],
};

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function boolValue(value) {
  if (value === true || value === 1) return true;
  return ['true', '1', 'si', 'sí', 'yes'].includes(String(value ?? '').trim().toLowerCase());
}

function placeholderName(row) {
  const suffix = String(row.subscriber_id || row.whatsapp_phone || '').slice(-4);
  return suffix ? `Contacto ${suffix}` : 'Contacto sin nombre';
}

const VALID_CLASSIFICATIONS = ['TIENDA', 'COFFEE BREAK', 'MERCADITO', 'CHATBOT', 'LANDING'];
const WOOLRICH_FOLLOWUP_STAGES = new Set([
  'contactos_nuevos',
  'preguntaron_fechas',
  'seguimiento_1',
  'seguimiento_2',
  'seguimiento_3',
]);

function woolrichStage(row) {
  const currentStage = row.kanban_stage || 'contactos_nuevos';
  if (
    row.company_key !== 'dr-woolrich' ||
    row.stage_locked ||
    !WOOLRICH_FOLLOWUP_STAGES.has(currentStage)
  ) {
    return currentStage;
  }
  if (row.s3_enviado) return 'seguimiento_3';
  if (row.s2_enviado) return 'seguimiento_2';
  if (row.s1_enviado) return 'seguimiento_1';
  return currentStage;
}

function normalizeClassification(value, tags = []) {
  const direct = String(value || '').trim().toUpperCase();
  if (VALID_CLASSIFICATIONS.includes(direct)) return direct;
  const fromTags = safeArray(tags)
    .map((tag) => String(tag || '').trim().toUpperCase())
    .find((tag) => VALID_CLASSIFICATIONS.includes(tag));
  return fromTags || '';
}

export function mapLeadFromDb(row) {
  const tags = safeArray(row.tags);
  const raw = safeObject(row.raw_payload);
  const classification = normalizeClassification(row.classification || raw.producto_interes, tags);
  const businessName = String(raw.nombre_negocio || '').trim();
  const businessType = String(raw.tipo_negocio || '').trim();
  return {
    id: row.id,
    companyId: row.company_key,
    subscriberId: row.subscriber_id,
    stageId: woolrichStage(row) || raw.etapa || 'contactos_nuevos',
    name: row.nombre_paciente || raw.nombre_completo || raw.nombre_contacto || placeholderName(row),
    phone: row.whatsapp_phone || raw.telefono || '',
    service: row.service || businessType || businessName || '',
    classification,
    assignedTo: row.assigned_to || '',
    source: row.source || raw.fuente || 'WhatsApp',
    lastMessage: row.ultimo_mensaje_cliente || raw.ultimo_mensaje || '',
    lastContactAt: row.last_activity_at || raw.fecha_ultimo_contacto || row.source_updated_at || row.updated_at || row.created_at,
    appointmentDate: row.fecha_cita || '',
    statusCita: row.status_cita || '',
    tags,
    comments: safeArray(row.comments),
    stageLocked: Boolean(row.stage_locked),
    stageOrigin: row.stage_origin || 'google_sheets',
    rawPayload: raw,
    businessName,
    businessType,
    email: String(raw.correo || '').trim(),
    commercialStatus: String(raw.estado || '').trim(),
    objectionsPrice: Number.isFinite(Number(raw.objeciones_precio)) ? Number(raw.objeciones_precio) : 0,
    readyToPay: boolValue(raw.listo_para_pagar),
    requiresAdvisor: boolValue(raw.requiere_asesor),
    escalationReason: String(raw.motivo_escalacion || '').trim(),
    advisorNotified: boolValue(raw.asesor_notificado || raw.alerta_enviada),
    botResponse: String(raw.respuesta_bot || row.ultimo_mensaje_bot || '').trim(),
    firstContactAt: raw.fecha_primer_contacto || '',
    lastSheetContactAt: raw.fecha_ultimo_contacto || '',
    healthQualified: boolValue(raw.califico_sistema_pacientes),
    reminderText: String(row.reminder_text || '').trim(),
    reminderAt: row.reminder_at || '',
    reminderCompleted: Boolean(row.reminder_completed),
    followupLevel: Number(row.followup_level || 0),
    followup1SentAt: row.s1_enviado || '',
    followup2SentAt: row.s2_enviado || '',
    followup3SentAt: row.s3_enviado || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function leadToDb(lead, { includeIdentity = false } = {}) {
  const classification = normalizeClassification(lead.classification, lead.tags);
  const tags = safeArray(lead.tags).filter((tag) => String(tag).toUpperCase() !== classification);
  if (classification) tags.unshift(classification);

  const result = {
    nombre_paciente: lead.name?.trim() || null,
    whatsapp_phone: String(lead.phone || '').replace(/\D/g, '') || null,
    service: lead.service?.trim() || null,
    classification: classification || null,
    assigned_to: lead.assignedTo?.trim() || null,
    source: lead.source?.trim() || 'WhatsApp',
    ultimo_mensaje_cliente: lead.lastMessage?.trim() || null,
    fecha_cita: lead.appointmentDate || null,
    kanban_stage: lead.stageId,
    stage_locked: Boolean(lead.stageLocked),
    stage_origin: lead.stageOrigin || 'admin',
    tags,
    comments: safeArray(lead.comments),
    reminder_text: lead.reminderText?.trim() || null,
    reminder_at: lead.reminderAt || null,
    reminder_completed: Boolean(lead.reminderCompleted),
    source_updated_at: nowIso(),
  };
  if (includeIdentity) {
    result.company_key = lead.companyId;
    result.subscriber_id = lead.subscriberId;
  }
  return result;
}

export async function loadMemberships(userId) {
  const rows = await restRequest(
    'crm_company_members',
    { query: `select=*&user_id=eq.${encode(userId)}&active=eq.true&order=company_name.asc` }
  );
  return (rows || []).map((row) => ({
    id: row.company_key,
    name: row.company_name || row.company_key,
    logoText: row.logo_text || (row.company_name || row.company_key).slice(0, 2).toUpperCase(),
    accent: row.accent || '#7c5cff',
    role: row.role,
    memberName: row.full_name,
    memberUsername: row.login_username || '',
  }));
}

export async function loadStages(companyKey) {
  const rows = await restRequest(
    'crm_pipeline_stages',
    { query: `select=*&company_key=eq.${encode(companyKey)}&order=position.asc` }
  );

  if (!rows?.length) {
    const fallback = DEFAULT_STAGES_BY_COMPANY[companyKey] || DEFAULT_STAGES_BY_COMPANY['dr-woolrich'];
    return fallback.map((stage) => ({ ...stage, id: stage.stageKey }));
  }

  return rows.map((row) => ({
    id: row.stage_key,
    stageKey: row.stage_key,
    name: row.name,
    color: row.color,
    mode: row.movement_mode,
    order: row.position,
  }));
}

export async function loadLeads(companyKey) {
  const rows = await restRequest(
    'crm_leads',
    { query: `select=*&company_key=eq.${encode(companyKey)}&order=updated_at.desc` }
  );
  return (rows || []).map(mapLeadFromDb);
}

export async function createLead(lead) {
  const payload = leadToDb(lead, { includeIdentity: true });
  const rows = await restRequest('crm_leads', {
    method: 'POST',
    query: 'select=*',
    body: payload,
    prefer: 'return=representation',
  });
  return mapLeadFromDb(rows[0]);
}

export async function updateLead(lead) {
  const rows = await restRequest('crm_leads', {
    method: 'PATCH',
    query: `id=eq.${encode(lead.id)}&select=*`,
    body: leadToDb(lead),
    prefer: 'return=representation',
  });
  return mapLeadFromDb(rows[0]);
}

export async function deleteLead(leadId) {
  await restRequest('crm_leads', {
    method: 'DELETE',
    query: `id=eq.${encode(leadId)}`,
    prefer: 'return=minimal',
  });
}
