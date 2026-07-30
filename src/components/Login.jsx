import { useState } from 'react';
import { getSupabaseConfig, isSupabaseConfigured, signInWithPassword } from '../lib/supabase';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();
  const config = getSupabaseConfig();

  async function submit(event) {
    event.preventDefault();
    if (!configured) return;
    setError('');
    setLoading(true);
    try {
      const session = await signInWithPassword(username, password);
      onLogin(session);
    } catch (loginError) {
      setError(loginError.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-brand">
        <div className="brand-orbit"><span>GC</span></div>
        <span className="eyebrow">GREEN CHIMP CRM</span>
        <h1>WhatsApp abre la puerta. El Kanban cuida el recorrido.</h1>
        <p>Los leads enviados por n8n aparecen en Supabase y avanzan por el embudo comercial sin perder el seguimiento humano.</p>
        <div className="login-flow">
          <span>WhatsApp</span><b>→</b><span>Google Sheets</span><b>→</b><span>n8n</span><b>→</b><span>Supabase</span><b>→</b><span>Kanban</span>
        </div>
      </section>

      <form className="login-card" onSubmit={submit}>
        <span className="eyebrow">ACCESO SEGURO</span>
        <h2>Entrar al CRM</h2>

        {!configured && (
          <div className="config-warning">
            <strong>Supabase todavía no está configurado.</strong>
            <p>Edita <code>.env.local</code> para probar localmente o <code>.env.production</code> antes de construir la página.</p>
            <small>URL detectada: {config.url || 'vacía'}</small>
          </div>
        )}

        <label>Usuario
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            placeholder="tu_usuario"
            minLength={3}
            maxLength={50}
            required
          />
        </label>
        <label>Contraseña
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="button primary" type="submit" disabled={!configured || loading}>
          {loading ? 'Conectando…' : 'Iniciar sesión'}
        </button>
        <small className="login-help">Cada cuenta se vincula con una o más empresas. El usuario nunca necesita escribir un correo.</small>
      </form>
    </main>
  );
}
