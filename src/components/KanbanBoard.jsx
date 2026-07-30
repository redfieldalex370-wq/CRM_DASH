import LeadCard from './LeadCard';

export default function KanbanBoard({ company, leads, onMoveLead, onOpenLead }) {
  const stages = [...company.stages].sort((a, b) => a.order - b.order);

  function dragStart(event, leadId) {
    event.dataTransfer.setData('text/lead-id', leadId);
    event.dataTransfer.effectAllowed = 'move';
  }

  function drop(event, stageId) {
    event.preventDefault();
    const leadId = event.dataTransfer.getData('text/lead-id');
    if (leadId) onMoveLead(leadId, stageId);
    event.currentTarget.classList.remove('drag-over');
  }

  return (
    <section className="kanban-board">
      {stages.map((stage) => {
        const stageLeads = leads.filter((lead) => lead.stageId === stage.id);
        return (
          <div
            className="kanban-column"
            key={stage.id}
            onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add('drag-over'); }}
            onDragLeave={(event) => event.currentTarget.classList.remove('drag-over')}
            onDrop={(event) => drop(event, stage.id)}
          >
            <header className="column-header">
              <div>
                <span className="column-dot" style={{ background: stage.color }} />
                <h2>{stage.name}</h2>
              </div>
              <span className="column-count">{stageLeads.length}</span>
            </header>
            <div className="column-subtitle">
              {stage.mode === 'automatic' ? 'Movimiento desde automatización' : 'Movimiento por administrador'}
            </div>
            <div className="column-cards">
              {stageLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} stage={stage} onOpen={onOpenLead} onDragStart={dragStart} />
              ))}
              {stageLeads.length === 0 && <div className="empty-column">Suelta aquí una tarjeta</div>}
            </div>
          </div>
        );
      })}
    </section>
  );
}
