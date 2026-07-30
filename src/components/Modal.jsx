export default function Modal({ title, children, onClose, width = '680px' }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section className="modal" style={{ maxWidth: width }} onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <span className="eyebrow">CRM</span>
            <h2>{title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}
