import { useEffect, useRef, useState } from 'react';
import LeadCard from './LeadCard';

function leadRecency(lead) {
  const value = lead.lastContactAt || lead.updatedAt || lead.createdAt || '';
  if (typeof value === 'number' || /^\d+$/.test(String(value))) {
    const numeric = Number(value);
    return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function KanbanBoard({ company, leads, onMoveLead, onOpenLead }) {
  const stages = [...company.stages].sort((a, b) => a.order - b.order);
  const boardRef = useRef(null);
  const scrollbarRef = useRef(null);
  const [scrollWidth, setScrollWidth] = useState(0);
  const [hasOverflow, setHasOverflow] = useState(false);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return undefined;
    const measure = () => {
      setScrollWidth(board.scrollWidth);
      setHasOverflow(board.scrollWidth > board.clientWidth + 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(board);
    Array.from(board.children).forEach((column) => observer.observe(column));
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [company.id, leads.length, stages.length]);

  function syncScroll(source, target) {
    if (target && Math.abs(target.scrollLeft - source.scrollLeft) > 1) {
      target.scrollLeft = source.scrollLeft;
    }
  }

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
    <>
      <section
        className="kanban-board"
        ref={boardRef}
        onScroll={(event) => syncScroll(event.currentTarget, scrollbarRef.current)}
      >
        {stages.map((stage) => {
          const stageLeads = leads
            .filter((lead) => lead.stageId === stage.id)
            .sort((a, b) => leadRecency(b) - leadRecency(a));
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
      {hasOverflow && (
        <div
          className="kanban-scrollbar"
          ref={scrollbarRef}
          onScroll={(event) => syncScroll(event.currentTarget, boardRef.current)}
          aria-label="Desplazamiento horizontal del CRM"
        >
          <div style={{ width: scrollWidth }} />
        </div>
      )}
    </>
  );
}
