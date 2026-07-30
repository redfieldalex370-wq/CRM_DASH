export default function Header({
  user,
  company,
  companies,
  onCompanyChange,
  onAdd,
  addLabel = '+ Nuevo lead',
  onRefresh,
  syncing,
  onLogout,
}) {
  const initials = String(user.name || user.username || 'U')
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="app-header">
      <div className="brand-block">
        <div className="company-avatar" style={{ '--accent': company.accent }}>{company.logoText}</div>
        <div>
          <span className="eyebrow">CRM MULTIEMPRESA</span>
          <div className="company-picker-wrap">
            <select className="company-picker" value={company.id} onChange={(event) => onCompanyChange(event.target.value)}>
              {companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="header-actions">
        <button className="button ghost" onClick={onRefresh} disabled={syncing}>{syncing ? 'Sincronizando…' : 'Actualizar'}</button>
        <button className="button primary" onClick={onAdd}>{addLabel}</button>
        <details className="profile-menu">
          <summary><span>{initials}</span></summary>
          <div className="profile-popover">
            <strong>{user.name || 'Usuario'}</strong>
            <small>Usuario: {user.username}</small>
            <small>Rol: {company.role}</small>
            <button onClick={onLogout}>Cerrar sesión</button>
          </div>
        </details>
      </div>
    </header>
  );
}
