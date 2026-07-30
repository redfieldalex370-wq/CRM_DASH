import { useCallback, useEffect, useMemo, useState } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import KanbanBoard from './components/KanbanBoard';
import LeadDrawer from './components/LeadDrawer';
import AddLeadModal from './components/AddLeadModal';
import { sendLeadEventToN8n } from './lib/webhook';
import { loadSession, signOut } from './lib/supabase';
import {
  createLead as createLeadInDb,
  deleteLead as deleteLeadInDb,
  loadLeads,
  loadMemberships,
  loadStages,
  updateLead as updateLeadInDb,
} from './lib/crmApi';

const DEFAULT_COMPANY = String(import.meta.env.VITE_DEFAULT_COMPANY_KEY || 'dr-woolrich');
const REFRESH_SECONDS = Math.max(10, Number(import.meta.env.VITE_REFRESH_SECONDS || 20));
const nowIso = () => new Date().toISOString();

function companyTitle(companyId) {
  if (companyId === 'zenda-cafe') return 'Leads de Zenda Café';
  if (companyId === 'dr-woolrich') return 'Seguimiento de pacientes';
  if (companyId === 'especialidades-dentales') return 'Seguimiento de valoraciones dentales';
  if (companyId === 'green-chimp-express') return 'Green Chimp Express · Chatbot + Landing';
  return 'Seguimiento de leads';
}

function workspaceEyebrow(companyId) {
  if (companyId === 'green-chimp-express') return 'PIPELINE DE VENTAS';
  if (companyId === 'especialidades-dentales' || companyId === 'dr-woolrich') return 'SEGUIMIENTO DE PACIENTES';
  return 'EMBUDO COMERCIAL';
}

function searchPlaceholder(companyId) {
  if (companyId === 'zenda-cafe') return 'Buscar contacto, teléfono o clasificación';
  if (companyId === 'especialidades-dentales') return 'Buscar paciente, teléfono o valoración';
  if (companyId === 'green-chimp-express') return 'Buscar contacto, negocio, teléfono o producto';
  return 'Buscar paciente, teléfono o servicio';
}

function addButtonLabel(companyId) {
  if (companyId === 'dr-woolrich' || companyId === 'especialidades-dentales') return '+ Nuevo paciente';
  if (companyId === 'zenda-cafe') return '+ Nuevo contacto';
  return '+ Nuevo lead';
}

export default function App() {
  const [session, setSession] = useState(loadSession);
  const [companies, setCompanies] = useState([]);
  const [activeCompanyId, setActiveCompanyId] = useState('');
  const [stages, setStages] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(Boolean(session));
  const [syncing, setSyncing] = useState(false);
  const [fatalError, setFatalError] = useState('');

  const activeCompanyBase = companies.find((item) => item.id === activeCompanyId) || companies[0];
  const company = activeCompanyBase ? { ...activeCompanyBase, stages } : null;
  const selectedLead = leads.find((lead) => lead.id === selectedLeadId);
  const owners = [...new Set(leads.map((lead) => lead.assignedTo).filter(Boolean))].sort();

  const visibleLeads = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const haystack = `${lead.name} ${lead.phone} ${lead.service} ${lead.classification} ${lead.lastMessage} ${lead.businessName || ''} ${lead.businessType || ''} ${lead.commercialStatus || ''} ${lead.escalationReason || ''}`.toLowerCase();
      const matchesOwner = ownerFilter === 'all' || lead.assignedTo === ownerFilter;
      const matchesProduct =
        activeCompanyId !== 'green-chimp-express' ||
        productFilter === 'all' ||
        String(lead.classification || '').toUpperCase() === productFilter;
      return haystack.includes(normalizedQuery) && matchesOwner && matchesProduct;
    });
  }, [activeCompanyId, leads, ownerFilter, productFilter, query]);

  function notify(message) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  }

  const refreshCompanyData = useCallback(async ({ silent = false } = {}) => {
    if (!activeCompanyId) return;
    if (!silent) setSyncing(true);
    try {
      const [nextStages, nextLeads] = await Promise.all([
        loadStages(activeCompanyId),
        loadLeads(activeCompanyId),
      ]);
      setStages(nextStages);
      setLeads(nextLeads);
      setFatalError('');
    } catch (error) {
      setFatalError(error.message || 'No se pudo consultar Supabase.');
    } finally {
      if (!silent) setSyncing(false);
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const memberships = await loadMemberships(session.user.id);
        if (cancelled) return;
        if (!memberships.length) {
          throw new Error('Tu usuario existe en Supabase Auth, pero todavía no está vinculado a una empresa en crm_company_members.');
        }
        setCompanies(memberships);
        const preferred = memberships.find((item) => item.id === DEFAULT_COMPANY)?.id || memberships[0].id;
        setActiveCompanyId((current) => memberships.some((item) => item.id === current) ? current : preferred);
        setFatalError('');
      } catch (error) {
        if (!cancelled) {
          setFatalError(error.message || 'No se pudieron cargar tus empresas.');
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (!session || !activeCompanyId) return undefined;
    refreshCompanyData();

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshCompanyData({ silent: true });
    }, REFRESH_SECONDS * 1000);

    const onFocus = () => refreshCompanyData({ silent: true });
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [activeCompanyId, refreshCompanyData, session]);

  function handleLogin(nextSession) {
    setSession(nextSession);
    setFatalError('');
  }

  async function logout() {
    await signOut();
    setSession(null);
    setCompanies([]);
    setStages([]);
    setLeads([]);
    setSelectedLeadId(null);
    setActiveCompanyId('');
  }

  function changeCompany(companyId) {
    setActiveCompanyId(companyId);
    setSelectedLeadId(null);
    setStages([]);
    setLeads([]);
    setQuery('');
    setOwnerFilter('all');
    setProductFilter('all');
  }

  async function moveLead(leadId, stageId) {
    const lead = leads.find((item) => item.id === leadId);
    const targetStage = stages.find((item) => item.id === stageId);
    if (!lead || !targetStage || lead.stageId === stageId) return;

    const updated = {
      ...lead,
      stageId,
      stageLocked: targetStage.mode === 'manual',
      stageOrigin: 'admin',
    };

    setLeads((current) => current.map((item) => item.id === leadId ? updated : item));
    try {
      const saved = await updateLeadInDb(updated);
      setLeads((current) => current.map((item) => item.id === leadId ? saved : item));
      notify(`Lead movido a ${targetStage.name}`);
      sendLeadEventToN8n('lead.stage_changed', company, saved).catch(() => {});
    } catch (error) {
      setLeads((current) => current.map((item) => item.id === leadId ? lead : item));
      notify(`No se pudo mover: ${error.message}`);
    }
  }

  async function createLead(form) {
    const firstStage = stages[0]?.id || 'contactos_nuevos';
    const targetStage = stages.find((item) => item.id === form.stageId);
    const classification = form.classification || '';
    const lead = {
      ...form,
      id: '',
      companyId: activeCompanyId,
      subscriberId: -Date.now(),
      stageId: form.stageId || firstStage,
      classification,
      tags: classification ? [classification] : ['Manual'],
      comments: [],
      lastContactAt: nowIso(),
      appointmentDate: '',
      stageLocked: targetStage?.mode === 'manual',
      stageOrigin: 'admin',
    };

    try {
      const saved = await createLeadInDb(lead);
      setLeads((current) => [saved, ...current]);
      setModal(null);
      notify('Lead creado en Supabase');
      sendLeadEventToN8n('lead.created', company, saved).catch(() => {});
    } catch (error) {
      notify(`No se pudo crear: ${error.message}`);
    }
  }

  async function saveLead(updatedLead) {
    if (updatedLead.reminderText?.trim() && !updatedLead.reminderAt) {
      notify('Selecciona la fecha y hora del seguimiento antes de guardar');
      return;
    }

    const original = leads.find((item) => item.id === updatedLead.id);
    if (!original) return;
    const targetStage = stages.find((item) => item.id === updatedLead.stageId);
    const stageChanged = original.stageId !== updatedLead.stageId;
    const prepared = {
      ...updatedLead,
      tags: updatedLead.classification
        ? [updatedLead.classification, ...(updatedLead.tags || []).filter((tag) => tag !== updatedLead.classification)]
        : updatedLead.tags,
      stageLocked: stageChanged ? targetStage?.mode === 'manual' : updatedLead.stageLocked,
      stageOrigin: stageChanged ? 'admin' : updatedLead.stageOrigin,
    };

    try {
      const saved = await updateLeadInDb(prepared);
      setLeads((current) => current.map((item) => item.id === saved.id ? saved : item));
      setSelectedLeadId(null);
      notify('Cambios guardados en Supabase');
      sendLeadEventToN8n('lead.updated', company, saved).catch(() => {});
    } catch (error) {
      notify(`No se pudo guardar: ${error.message}`);
    }
  }

  async function deleteLead(id) {
    if (!window.confirm('¿Eliminar este lead? Esta acción no se puede deshacer.')) return;
    try {
      await deleteLeadInDb(id);
      setLeads((current) => current.filter((lead) => lead.id !== id));
      setSelectedLeadId(null);
      notify('Lead eliminado');
    } catch (error) {
      notify(`No se pudo eliminar: ${error.message}`);
    }
  }

  if (!session) return <Login onLogin={handleLogin} />;

  if (loading && !company) {
    return <div className="loading-screen"><div className="loader" /><strong>Abriendo el CRM…</strong></div>;
  }

  if (fatalError && !company) {
    return (
      <main className="fatal-screen">
        <section>
          <span className="eyebrow">SUPABASE</span>
          <h1>No pudimos abrir el tablero</h1>
          <p>{fatalError}</p>
          <div className="fatal-actions">
            <button className="button primary" onClick={() => window.location.reload()}>Reintentar</button>
            <button className="button ghost" onClick={logout}>Cerrar sesión</button>
          </div>
        </section>
      </main>
    );
  }

  if (!company) return null;

  const automaticStageIds = new Set(stages.filter((stage) => stage.mode === 'automatic').map((stage) => stage.id));
  const manualStageIds = new Set(stages.filter((stage) => stage.mode === 'manual').map((stage) => stage.id));
  const metrics = {
    total: leads.length,
    automatic: leads.filter((lead) => automaticStageIds.has(lead.stageId)).length,
    manual: leads.filter((lead) => manualStageIds.has(lead.stageId)).length,
    stale: leads.filter((lead) => lead.lastContactAt && Date.now() - new Date(lead.lastContactAt).getTime() > 24 * 60 * 60 * 1000).length,
    readyToPay: leads.filter((lead) => lead.stageId === 'listo_para_pago' || lead.readyToPay).length,
    needsAdvisor: leads.filter((lead) => lead.requiresAdvisor).length,
    clients: leads.filter((lead) => lead.stageId === 'cliente').length,
  };

  return (
    <div className="app-shell" style={{ '--company-accent': company.accent }}>
      <Header
        user={{
          name: activeCompanyBase?.memberName || session.user.user_metadata?.full_name || session.user.username,
          username: activeCompanyBase?.memberUsername || session.user.username,
        }}
        company={company}
        companies={companies}
        onCompanyChange={changeCompany}
        onAdd={() => setModal('add')}
        addLabel={addButtonLabel(company.id)}
        onRefresh={() => refreshCompanyData()}
        syncing={syncing}
        onLogout={logout}
      />

      <main className="workspace">
        <section className="workspace-title">
          <div>
            <span className="eyebrow">{workspaceEyebrow(company.id)}</span>
            <h1>{companyTitle(company.id)}</h1>
          </div>
          <div className="filters">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholder(company.id)} />
            {company.id === 'green-chimp-express' && (
              <select value={productFilter} onChange={(event) => setProductFilter(event.target.value)}>
                <option value="all">Todos: Chatbot + Landing</option>
                <option value="CHATBOT">Chatbot Express</option>
                <option value="LANDING">Landing Express</option>
              </select>
            )}
            <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
              <option value="all">Todos los responsables</option>
              {owners.map((owner) => <option value={owner} key={owner}>{owner}</option>)}
            </select>
          </div>
        </section>

        {fatalError && <div className="sync-error">No se pudo actualizar: {fatalError}</div>}

        {company.id === 'green-chimp-express' ? (
          <section className="metric-grid">
            <article><span>Leads totales</span><strong>{metrics.total}</strong><small>Chatbot + Landing</small></article>
            <article><span>Listos para pagar</span><strong>{metrics.readyToPay}</strong><small>Oportunidades calientes</small></article>
            <article><span>Requieren asesor</span><strong>{metrics.needsAdvisor}</strong><small>Atención humana pendiente</small></article>
            <article><span>Clientes</span><strong>{metrics.clients}</strong><small>Ventas confirmadas</small></article>
          </section>
        ) : (
          <section className="metric-grid">
            <article><span>Leads totales</span><strong>{metrics.total}</strong><small>En todo el embudo</small></article>
            <article><span>Etapas automáticas</span><strong>{metrics.automatic}</strong><small>Gestionadas por integración</small></article>
            <article><span>Etapas administrativas</span><strong>{metrics.manual}</strong><small>En seguimiento humano</small></article>
            <article><span>Sin seguimiento</span><strong>{metrics.stale}</strong><small>Más de 24 horas</small></article>
          </section>
        )}

        <KanbanBoard company={company} leads={visibleLeads} onMoveLead={moveLead} onOpenLead={setSelectedLeadId} />
      </main>

      {selectedLead && (
        <LeadDrawer
          key={`${selectedLead.id}-${selectedLead.updatedAt}`}
          lead={selectedLead}
          company={company}
          currentUser={{ name: activeCompanyBase?.memberName || session.user.username }}
          onClose={() => setSelectedLeadId(null)}
          onSave={saveLead}
          onDelete={deleteLead}
        />
      )}
      {modal === 'add' && <AddLeadModal company={company} onClose={() => setModal(null)} onCreate={createLead} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
