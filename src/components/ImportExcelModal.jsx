import { useState } from 'react';
import Modal from './Modal';
import { normalizeStageName, readLeadWorkbook } from '../lib/excel';

export default function ImportExcelModal({ company, existingLeads, onClose, onImport }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [mode, setMode] = useState('upsert');

  async function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      const parsed = await readLeadWorkbook(file);
      setRows(parsed);
      setFileName(file.name);
    } catch (readError) {
      setError(`No se pudo leer el archivo: ${readError.message}`);
      setRows([]);
    }
  }

  const stageMap = Object.fromEntries(company.stages.map((stage) => [normalizeStageName(stage.name), stage.id]));
  const prepared = rows.map((row) => ({
    ...row,
    stageId: stageMap[normalizeStageName(row.stage)] || [...company.stages].sort((a, b) => a.order - b.order)[0]?.id,
    valid: Boolean(row.name && row.phone),
    duplicated: existingLeads.some((lead) => lead.phone.replace(/\D/g, '') === row.phone.replace(/\D/g, '')),
  }));
  const validRows = prepared.filter((row) => row.valid);

  return (
    <Modal title="Importar leads desde Excel" onClose={onClose} width="960px">
      <div className="import-toolbar">
        <label className="file-drop">
          <input type="file" accept=".xlsx,.csv" onChange={handleFile} />
          <strong>{fileName || 'Selecciona un archivo Excel'}</strong>
          <small>Columnas reconocidas: Nombre, Teléfono, Servicio, Etapa, Responsable, Origen, Último mensaje y Recordatorio.</small>
        </label>
        <label>Duplicados
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="upsert">Actualizar por teléfono</option>
            <option value="skip">Omitir existentes</option>
          </select>
        </label>
      </div>

      {error && <div className="form-error">{error}</div>}
      {rows.length > 0 && (
        <>
          <div className="import-summary">
            <span><strong>{rows.length}</strong> filas</span>
            <span><strong>{validRows.length}</strong> válidas</span>
            <span><strong>{prepared.filter((row) => row.duplicated).length}</strong> coincidencias por teléfono</span>
            <span><strong>{prepared.filter((row) => !row.valid).length}</strong> con error</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Fila</th><th>Nombre</th><th>Teléfono</th><th>Servicio</th><th>Etapa detectada</th><th>Estado</th></tr></thead>
              <tbody>
                {prepared.slice(0, 30).map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td><td>{row.name || '—'}</td><td>{row.phone || '—'}</td><td>{row.service || '—'}</td>
                    <td>{company.stages.find((stage) => stage.id === row.stageId)?.name || 'Primera etapa'}</td>
                    <td><span className={`status-pill ${!row.valid ? 'error' : row.duplicated ? 'warning' : 'success'}`}>{!row.valid ? 'Faltan datos' : row.duplicated ? 'Actualizar' : 'Nuevo'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="form-actions"><button className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary" disabled={!validRows.length} onClick={() => onImport(validRows, mode)}>Importar {validRows.length} leads</button></div>
        </>
      )}
    </Modal>
  );
}
