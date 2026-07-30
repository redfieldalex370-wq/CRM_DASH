import { useState } from 'react';
import Modal from './Modal';

const palette = ['#6d7cff', '#c06cff', '#37a9ff', '#20c997', '#ff9f43', '#f368e0', '#65c466', '#ff6b6b'];

export default function StageSettingsModal({ company, leads, onClose, onSave }) {
  const [stages, setStages] = useState(() => [...company.stages].sort((a, b) => a.order - b.order));
  const [error, setError] = useState('');

  function update(id, field, value) {
    setStages((current) => current.map((stage) => stage.id === id ? { ...stage, [field]: value } : stage));
  }

  function move(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    const next = [...stages];
    [next[index], next[target]] = [next[target], next[index]];
    setStages(next);
  }

  function addStage() {
    setStages((current) => [...current, {
      id: `stage-${crypto.randomUUID().slice(0, 8)}`,
      name: 'Nueva etapa',
      color: palette[current.length % palette.length],
      mode: 'manual',
      order: current.length + 1,
    }]);
  }

  function removeStage(stage) {
    if (stages.length <= 1) return setError('El tablero necesita al menos una columna.');
    if (leads.some((lead) => lead.stageId === stage.id)) return setError(`No puedes eliminar “${stage.name}” porque contiene leads.`);
    setError('');
    setStages((current) => current.filter((item) => item.id !== stage.id));
  }

  function save() {
    if (stages.some((stage) => !stage.name.trim())) return setError('Todas las columnas necesitan un nombre.');
    onSave(stages.map((stage, index) => ({ ...stage, name: stage.name.trim(), order: index + 1 })));
  }

  return (
    <Modal title="Personalizar columnas" onClose={onClose} width="820px">
      <p className="modal-intro">Las etapas automáticas pueden ser actualizadas por n8n. Las manuales quedan bajo control del administrador.</p>
      {error && <div className="form-error">{error}</div>}
      <div className="stage-editor-list">
        {stages.map((stage, index) => (
          <div className="stage-editor-row" key={stage.id}>
            <input type="color" value={stage.color} onChange={(event) => update(stage.id, 'color', event.target.value)} />
            <input value={stage.name} onChange={(event) => update(stage.id, 'name', event.target.value)} />
            <select value={stage.mode} onChange={(event) => update(stage.id, 'mode', event.target.value)}>
              <option value="automatic">Automática</option><option value="manual">Manual</option>
            </select>
            <div className="row-buttons"><button onClick={() => move(index, -1)} disabled={index === 0}>↑</button><button onClick={() => move(index, 1)} disabled={index === stages.length - 1}>↓</button><button className="delete-mini" onClick={() => removeStage(stage)}>×</button></div>
          </div>
        ))}
      </div>
      <button className="button ghost full" onClick={addStage}>+ Agregar columna</button>
      <div className="form-actions"><button className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" onClick={save}>Guardar estructura</button></div>
    </Modal>
  );
}
