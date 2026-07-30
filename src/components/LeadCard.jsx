function relativeTime(value) {
  if (!value) return 'Sin contacto';
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${Math.floor(hours / 24)} d`;
}

function classificationClass(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, '-');
}

function reminderLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function LeadCard({ lead, stage, onOpen, onDragStart }) {
  const extraTags = (lead.tags || []).filter((tag) => tag !== lead.classification).slice(0, 2);
  const isExpress = lead.companyId === 'green-chimp-express';
  const primaryService = isExpress
    ? (lead.businessName || lead.businessType || lead.service || 'Negocio por definir')
    : (lead.service || 'Interés por definir');
  const reminderDate = lead.reminderAt ? new Date(lead.reminderAt) : null;
  const hasPendingReminder = reminderDate && !Number.isNaN(reminderDate.getTime()) && !lead.reminderCompleted;
  const reminderOverdue = hasPendingReminder && reminderDate.getTime() <= Date.now();

  return (
    <article
      className="lead-card"
      draggable
      onDragStart={(event) => onDragStart(event, lead.id)}
      onClick={() => onOpen(lead.id)}
    >
      <div className="lead-card-top">
        <span className="lead-source">{lead.source || 'Sin origen'}</span>
        <span className={`stage-mode ${stage.mode}`}>{stage.mode === 'automatic' ? 'AUTO' : 'MANUAL'}</span>
      </div>
      <h3>{lead.name}</h3>
      {lead.classification && (
        <div className={`classification-badge ${classificationClass(lead.classification)}`}>{lead.classification}</div>
      )}
      {isExpress && (lead.requiresAdvisor || lead.readyToPay || lead.healthQualified) && (
        <div className="express-flag-row">
          {lead.readyToPay && <span className="express-flag hot">💳 Listo para pagar</span>}
          {lead.requiresAdvisor && <span className="express-flag advisor">🚨 Asesor</span>}
          {lead.healthQualified && <span className="express-flag health">🏥 Sistema pacientes</span>}
        </div>
      )}
      <p className="lead-service">{primaryService}</p>
      {isExpress && lead.businessName && lead.businessType && lead.businessName !== lead.businessType && (
        <p className="lead-business-type">{lead.businessType}</p>
      )}
      <p className="lead-message">{lead.lastMessage || 'Sin mensaje registrado'}</p>
      {hasPendingReminder && (
        <div className={`followup-badge ${reminderOverdue ? 'overdue' : ''}`}>
          <span>{reminderOverdue ? '⏰ Seguimiento vencido' : '📅 Seguimiento'}</span>
          <strong>{reminderLabel(lead.reminderAt)}</strong>
        </div>
      )}
      {extraTags.length > 0 && (
        <div className="tag-row">
          {extraTags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
        </div>
      )}
      <div className="lead-card-meta">
        <span title="Responsable">◉ {lead.assignedTo || 'Sin asignar'}</span>
        <span>{relativeTime(lead.lastContactAt)}</span>
      </div>
      {lead.comments?.length > 0 && (
        <div className="lead-card-footer"><span>💬 {lead.comments.length}</span></div>
      )}
    </article>
  );
}
