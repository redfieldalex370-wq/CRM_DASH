import { useState } from 'react';
import Modal from './Modal';

const ZENDA_CLASSIFICATIONS = ['TIENDA', 'COFFEE BREAK', 'MERCADITO'];
const EXPRESS_CLASSIFICATIONS = ['CHATBOT', 'LANDING'];

export default function AddLeadModal({ company, onClose, onCreate }) {
  const stages = [...company.stages].sort((a, b) => a.order - b.order);
  const isZenda = company.id === 'zenda-cafe';
  const isExpress = company.id === 'green-chimp-express';
  const isDental = company.id === 'especialidades-dentales';
  const classifications = isZenda ? ZENDA_CLASSIFICATIONS : isExpress ? EXPRESS_CLASSIFICATIONS : [];
  const [form, setForm] = useState({
    name: '', phone: '', service: '', classification: '', stageId: stages[0]?.id || '', assignedTo: '', source: 'WhatsApp', lastMessage: '',
  });
  const [error, setError] = useState('');

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }

  function submit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError('Nombre y teléfono son obligatorios.');
      return;
    }
    if ((isZenda || isExpress) && !form.classification) {
      setError(isExpress ? 'Selecciona CHATBOT o LANDING.' : 'Selecciona TIENDA, COFFEE BREAK o MERCADITO.');
      return;
    }
    onCreate(form);
  }

  const title = isDental ? 'Crear paciente' : isZenda ? 'Crear contacto' : 'Crear lead';
  const serviceLabel = isZenda ? 'Interés / solicitud' : isExpress ? 'Giro / necesidad' : isDental ? 'Motivo / valoración' : 'Servicio';

  return (
    <Modal title={title} onClose={onClose}>
      <form className="form-grid two" onSubmit={submit}>
        <label>Nombre<input autoFocus value={form.name} onChange={(event) => update('name', event.target.value)} /></label>
        <label>Teléfono<input value={form.phone} onChange={(event) => update('phone', event.target.value)} /></label>
        {(isZenda || isExpress) && (
          <label>{isExpress ? 'Producto' : 'Clasificación'}
            <select value={form.classification} onChange={(event) => update('classification', event.target.value)}>
              <option value="">Seleccionar</option>
              {classifications.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
        )}
        <label>{serviceLabel}<input value={form.service} onChange={(event) => update('service', event.target.value)} /></label>
        <label>Responsable<input value={form.assignedTo} onChange={(event) => update('assignedTo', event.target.value)} /></label>
        <label>Origen<input value={form.source} onChange={(event) => update('source', event.target.value)} /></label>
        <label>Etapa<select value={form.stageId} onChange={(event) => update('stageId', event.target.value)}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name}</option>)}</select></label>
        <label className="span-two">Mensaje inicial<textarea rows="4" value={form.lastMessage} onChange={(event) => update('lastMessage', event.target.value)} /></label>
        {error && <div className="form-error span-two">{error}</div>}
        <div className="form-actions span-two"><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary">{isDental ? 'Crear paciente' : isZenda ? 'Crear contacto' : 'Crear lead'}</button></div>
      </form>
    </Modal>
  );
}
