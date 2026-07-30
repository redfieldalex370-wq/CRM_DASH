import { useMemo, useState } from 'react';

const ZENDA_CLASSIFICATIONS = ['TIENDA', 'COFFEE BREAK', 'MERCADITO'];
const EXPRESS_CLASSIFICATIONS = ['CHATBOT', 'LANDING'];

function localDateTimeValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function yesNo(value) {
  return value ? 'Sí' : 'No';
}

function displayDate(value) {
  if (!value) return 'Sin registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('es-MX');
}

export default function LeadDrawer({ lead, company, currentUser, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(lead)));
  const [comment, setComment] = useState('');
  const stages = useMemo(() => [...company.stages].sort((a, b) => a.order - b.order), [company]);
  const whatsappPhone = String(draft.phone || '').replace(/\D/g, '');
  const isZenda = company.id === 'zenda-cafe';
  const isDental = company.id === 'especialidades-dentales';
  const isExpress = company.id === 'green-chimp-express';
  const classificationOptions = isZenda ? ZENDA_CLASSIFICATIONS : isExpress ? EXPRESS_CLASSIFICATIONS : [];
  const reminderDate = draft.reminderAt ? new Date(draft.reminderAt) : null;
  const reminderIsValid = reminderDate && !Number.isNaN(reminderDate.getTime());
  const reminderIsOverdue = reminderIsValid && !draft.reminderCompleted && reminderDate.getTime() <= Date.now();

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function addComment() {
    if (!comment.trim()) return;
    setDraft((current) => ({
      ...current,
      comments: [
        ...(current.comments || []),
        { id: crypto.randomUUID(), author: currentUser.name, at: new Date().toISOString(), text: comment.trim() },
      ],
    }));
    setComment('');
  }

  const serviceLabel = isZenda ? 'Interés / solicitud' : isExpress ? 'Giro / necesidad' : isDental ? 'Motivo / valoración' : 'Servicio';

  return (
    <div className="drawer-backdrop" onMouseDown={onClose}>
      <aside className="lead-drawer" onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div>
            <span className="eyebrow">{isDental ? 'FICHA DEL PACIENTE' : isExpress ? 'FICHA COMERCIAL' : 'FICHA DEL LEAD'}</span>
            <h2>{draft.name}</h2>
            <p>{draft.phone || 'Sin teléfono'}</p>
          </div>
          <button className="icon-button" onClick={onClose}>×</button>
        </header>

        <div className="drawer-content">
          {draft.stageLocked && (
            <div className="stage-lock-banner">
              <strong>Etapa bajo control administrativo</strong>
              <span>La integración puede actualizar los datos del contacto, pero no regresará esta tarjeta a una etapa automática.</span>
            </div>
          )}

          {isExpress && draft.requiresAdvisor && (
            <div className="advisor-alert-banner">
              <strong>🚨 Este lead requiere atención de un asesor</strong>
              <span>{draft.escalationReason || 'El bot marcó este contacto para seguimiento humano.'}</span>
            </div>
          )}

          {whatsappPhone && (
            <a className="button whatsapp-link" href={`https://wa.me/${whatsappPhone}`} target="_blank" rel="noreferrer">
              Abrir conversación en WhatsApp
            </a>
          )}

          <button
            type="button"
            className="button primary followup-jump-button"
            onClick={() => document.getElementById('manual-followup-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            📅 Programar seguimiento
          </button>

          <section className="drawer-section form-grid two">
            <label>Nombre<input value={draft.name} onChange={(event) => update('name', event.target.value)} /></label>
            <label>Teléfono<input value={draft.phone} onChange={(event) => update('phone', event.target.value)} /></label>

            {(isZenda || isExpress) && (
              <label>{isExpress ? 'Producto' : 'Clasificación'}
                <select value={draft.classification || ''} onChange={(event) => update('classification', event.target.value)}>
                  <option value="">Sin clasificación</option>
                  {classificationOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            )}

            <label>{serviceLabel}<input value={draft.service || ''} onChange={(event) => update('service', event.target.value)} /></label>
            <label>Responsable<input value={draft.assignedTo || ''} onChange={(event) => update('assignedTo', event.target.value)} /></label>
            <label>Origen<input value={draft.source || ''} onChange={(event) => update('source', event.target.value)} /></label>
            <label>Etapa
              <select value={draft.stageId} onChange={(event) => update('stageId', event.target.value)}>
                {stages.map((stage) => <option value={stage.id} key={stage.id}>{stage.name}</option>)}
              </select>
            </label>
            {!isZenda && !isExpress && (
              <label>{isDental ? 'Fecha de valoración' : 'Fecha de cita'}<input type="datetime-local" value={localDateTimeValue(draft.appointmentDate)} onChange={(event) => update('appointmentDate', event.target.value ? new Date(event.target.value).toISOString() : '')} /></label>
            )}
            <label>Etiquetas<input value={(draft.tags || []).join(', ')} onChange={(event) => update('tags', event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean))} /></label>
          </section>

          <section id="manual-followup-section" className="drawer-section followup-section">
            <div className="section-title-row">
              <h3>Seguimiento manual</h3>
              <span className={reminderIsOverdue ? 'followup-status overdue' : 'followup-status'}>
                {draft.reminderCompleted
                  ? 'Completado'
                  : reminderIsOverdue
                    ? 'Vencido'
                    : reminderIsValid
                      ? 'Pendiente'
                      : 'Sin fecha'}
              </span>
            </div>

            <div className="followup-panel">
              <label>
                Fecha y hora del seguimiento
                <input
                  type="datetime-local"
                  value={localDateTimeValue(draft.reminderAt)}
                  onChange={(event) => {
                    const value = event.target.value
                      ? new Date(event.target.value).toISOString()
                      : '';
                    setDraft((current) => ({
                      ...current,
                      reminderAt: value,
                      reminderCompleted: false,
                    }));
                  }}
                />
              </label>

              <label>
                Nota o motivo
                <textarea
                  rows="3"
                  placeholder="Ejemplo: Llamar para confirmar si desea contratar Chatbot Express"
                  value={draft.reminderText || ''}
                  onChange={(event) => update('reminderText', event.target.value)}
                />
              </label>

              <div className="followup-actions">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={Boolean(draft.reminderCompleted)}
                    onChange={(event) => update('reminderCompleted', event.target.checked)}
                  />
                  Marcar seguimiento como completado
                </label>

                {(draft.reminderAt || draft.reminderText) && (
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => setDraft((current) => ({
                      ...current,
                      reminderAt: '',
                      reminderText: '',
                      reminderCompleted: false,
                    }))}
                  >
                    Quitar seguimiento
                  </button>
                )}
              </div>

              <div className="followup-email-note">
                <strong>📅 Fecha elegida desde esta página</strong>
                <span>
                  La fecha y hora se capturan manualmente aquí. n8n no las calcula ni las toma de Excel; únicamente enviará el correo a redfieldalex370@gmail.com cuando llegue el momento.
                </span>
              </div>
            </div>
          </section>

          {isExpress && (
            <section className="drawer-section">
              <div className="section-title-row"><h3>Datos comerciales</h3><span>{draft.commercialStatus || 'Sin estado'}</span></div>
              <div className="express-info-grid">
                <div><span>Negocio</span><strong>{draft.businessName || 'No registrado'}</strong></div>
                <div><span>Tipo de negocio</span><strong>{draft.businessType || draft.service || 'No registrado'}</strong></div>
                <div><span>Correo</span><strong>{draft.email || 'No registrado'}</strong></div>
                <div><span>Objeciones de precio</span><strong>{draft.objectionsPrice ?? 0}</strong></div>
                <div><span>Listo para pagar</span><strong>{yesNo(draft.readyToPay)}</strong></div>
                <div><span>Requiere asesor</span><strong>{yesNo(draft.requiresAdvisor)}</strong></div>
                <div><span>Asesor notificado</span><strong>{yesNo(draft.advisorNotified)}</strong></div>
                <div><span>Sistema de pacientes</span><strong>{yesNo(draft.healthQualified)}</strong></div>
                <div><span>Primer contacto</span><strong>{displayDate(draft.firstContactAt)}</strong></div>
                <div><span>Último contacto</span><strong>{displayDate(draft.lastSheetContactAt || draft.lastContactAt)}</strong></div>
              </div>
              {draft.escalationReason && <div className="express-note"><span>Motivo de escalación</span><p>{draft.escalationReason}</p></div>}
            </section>
          )}

          <section className="drawer-section">
            <h3>Último mensaje</h3>
            <textarea rows="3" value={draft.lastMessage || ''} onChange={(event) => update('lastMessage', event.target.value)} />
          </section>

          {isExpress && draft.botResponse && (
            <section className="drawer-section">
              <h3>Última respuesta del bot</h3>
              <div className="bot-response-box">{draft.botResponse}</div>
            </section>
          )}

          <section className="drawer-section">
            <div className="section-title-row"><h3>Comentarios internos</h3><span>{draft.comments?.length || 0}</span></div>
            <div className="timeline-list">
              {(draft.comments || []).map((item) => (
                <article key={item.id} className="timeline-item">
                  <strong>{item.author}</strong>
                  <small>{new Date(item.at).toLocaleString('es-MX')}</small>
                  <p>{item.text}</p>
                </article>
              ))}
              {(draft.comments || []).length === 0 && <p className="muted">Todavía no hay comentarios internos.</p>}
            </div>
            <div className="inline-form">
              <input placeholder="Escribe una nota para el equipo" value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && addComment()} />
              <button className="button secondary" onClick={addComment}>Agregar</button>
            </div>
          </section>
        </div>

        <footer className="drawer-footer">
          <button className="button danger ghost" onClick={() => onDelete(draft.id)}>Eliminar</button>
          <div>
            <button className="button ghost" onClick={onClose}>Cancelar</button>
            <button className="button primary" onClick={() => onSave(draft)}>Guardar cambios</button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
