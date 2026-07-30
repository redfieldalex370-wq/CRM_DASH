import readXlsxFile from 'read-excel-file/browser';

const normalize = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_|_$/g, '');

const aliases = {
  name: ['nombre', 'paciente', 'cliente', 'lead', 'name', 'full_name'],
  phone: ['telefono', 'celular', 'whatsapp', 'phone'],
  service: ['servicio', 'tratamiento', 'especialidad', 'interes', 'service'],
  stage: ['etapa', 'columna', 'estado', 'stage'],
  assignedTo: ['responsable', 'asesor', 'asignado', 'assigned_to'],
  source: ['origen', 'fuente', 'source'],
  lastMessage: ['ultimo_mensaje', 'mensaje', 'comentario_inicial', 'last_message'],
  reminder: ['recordatorio', 'seguimiento', 'reminder'],
  reminderAt: ['fecha_recordatorio', 'recordar_el', 'reminder_at'],
  appointmentDate: ['fecha_cita', 'cita', 'appointment_date'],
};

function findValue(row, field) {
  const key = aliases[field].find((alias) => Object.hasOwn(row, alias));
  return key ? row[key] : '';
}

function parseExcelDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map(normalize);
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => String(value).trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some((value) => String(value).trim())) rows.push(row);
  return rows;
}

export async function readLeadWorkbook(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();
  let rows;
  if (extension === 'csv') {
    rows = parseCsv(await file.text());
  } else {
    rows = await readXlsxFile(file);
  }

  const objects = rowsToObjects(rows);
  return objects.map((row, index) => ({
    rowNumber: index + 2,
    name: String(findValue(row, 'name') || '').trim(),
    phone: String(findValue(row, 'phone') || '').trim(),
    service: String(findValue(row, 'service') || '').trim(),
    stage: String(findValue(row, 'stage') || '').trim(),
    assignedTo: String(findValue(row, 'assignedTo') || '').trim(),
    source: String(findValue(row, 'source') || 'Excel').trim(),
    lastMessage: String(findValue(row, 'lastMessage') || '').trim(),
    reminder: String(findValue(row, 'reminder') || '').trim(),
    reminderAt: parseExcelDate(findValue(row, 'reminderAt')),
    appointmentDate: parseExcelDate(findValue(row, 'appointmentDate')),
  }));
}

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function xmlCell(value, style = '') {
  const type = value instanceof Date ? 'DateTime' : typeof value === 'number' ? 'Number' : 'String';
  const content = value instanceof Date ? value.toISOString() : value ?? '';
  return `<Cell${style ? ` ss:StyleID="${style}"` : ''}><Data ss:Type="${type}">${escapeXml(content)}</Data></Cell>`;
}

export function exportLeadsToExcel(company, leads) {
  const stageMap = Object.fromEntries(company.stages.map((stage) => [stage.id, stage.name]));
  const headers = ['Nombre', 'Teléfono', 'Servicio', 'Etapa', 'Responsable', 'Origen', 'Último mensaje', 'Último contacto', 'Fecha cita', 'Recordatorios pendientes', 'Comentarios'];
  const rows = leads.map((lead) => [
    lead.name,
    lead.phone,
    lead.service,
    stageMap[lead.stageId] || lead.stageId,
    lead.assignedTo,
    lead.source,
    lead.lastMessage,
    lead.lastContactAt ? new Date(lead.lastContactAt) : '',
    lead.appointmentDate ? new Date(lead.appointmentDate) : '',
    (lead.reminders || []).filter((item) => !item.done).map((item) => item.title).join(' | '),
    (lead.comments || []).map((item) => `${item.author}: ${item.text}`).join(' | '),
  ]);

  const columnWidths = [150, 110, 150, 150, 115, 110, 280, 135, 135, 230, 280];
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="${escapeXml(company.accent)}" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>
  <Style ss:ID="Date"><NumberFormat ss:Format="yyyy-mm-dd hh:mm"/></Style>
 </Styles>
 <Worksheet ss:Name="Leads">
  <Table>
   ${columnWidths.map((width) => `<Column ss:Width="${width}"/>`).join('')}
   <Row ss:Height="25">${headers.map((header) => xmlCell(header, 'Header')).join('')}</Row>
   ${rows.map((row) => `<Row>${row.map((value) => xmlCell(value, value instanceof Date ? 'Date' : '')).join('')}</Row>`).join('')}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane></WorksheetOptions>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `leads-${company.id}-${new Date().toISOString().slice(0, 10)}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

export function normalizeStageName(value) {
  return normalize(value);
}
