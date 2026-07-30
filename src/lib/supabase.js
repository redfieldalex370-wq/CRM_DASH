const SESSION_KEY = 'green_chimp_crm_supabase_session_v3';

const config = {
  url: String(import.meta.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, ''),
  key: String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim(),
  usernameDomain: String(import.meta.env.VITE_AUTH_USERNAME_DOMAIN || 'crm.local')
    .trim()
    .toLowerCase(),
};

const USERNAME_ALIASES = {
  adminwoolrich: 'admin_woolrich',
  'admin-woolrich': 'admin_woolrich',
  'admin@woolrich.demo': 'admin_woolrich',
  admindental: 'admin_dental',
  'admin-dental': 'admin_dental',
  'admin@dental.demo': 'admin_dental',
  adminexpress: 'admin_express',
  'admin-express': 'admin_express',
  'admin@express.demo': 'admin_express',
  'superadmin@chimpads.demo': 'superadmin',
};

let refreshPromise = null;

export function getSupabaseConfig() {
  return { ...config };
}

export function isSupabaseConfigured() {
  return Boolean(
    config.url &&
    config.key &&
    !config.url.includes('TU_PROJECT_REF') &&
    !config.key.includes('PEGA_AQUI')
  );
}

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error('Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env.local o .env.production.');
  }
}

export function normalizeUsername(value) {
  const input = String(value || '').trim().toLowerCase();
  const aliased = USERNAME_ALIASES[input] || input;
  const normalized = aliased
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[._-]+|[._-]+$/g, '');

  if (normalized.length < 3) {
    throw new Error('El usuario debe tener al menos 3 caracteres.');
  }
  if (normalized.length > 50) {
    throw new Error('El usuario no puede superar 50 caracteres.');
  }
  return normalized;
}

export function usernameToInternalEmail(username) {
  const normalized = normalizeUsername(username);
  if (!config.usernameDomain || config.usernameDomain.includes(' ')) {
    throw new Error('VITE_AUTH_USERNAME_DOMAIN no es válido.');
  }
  return `${normalized}@${config.usernameDomain}`;
}

function sessionUsername(session, fallbackUsername = '') {
  const fromMetadata = session?.user?.user_metadata?.username;
  if (fromMetadata) return normalizeUsername(fromMetadata);
  if (fallbackUsername) return normalizeUsername(fallbackUsername);
  const email = String(session?.user?.email || '');
  return email.includes('@') ? email.split('@')[0] : 'usuario';
}

function saveSession(session, fallbackUsername = '') {
  if (!session) {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }

  const username = sessionUsername(session, fallbackUsername);
  const normalized = {
    ...session,
    user: {
      ...session.user,
      username,
    },
    expires_at: session.expires_at || Math.floor(Date.now() / 1000) + Number(session.expires_in || 3600),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(normalized));
  return normalized;
}

export function loadSession() {
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return stored ? saveSession(stored, stored?.user?.username) : null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

async function parseResponse(response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorMessage(payload, fallback) {
  if (!payload) return fallback;
  if (typeof payload === 'string') return payload;
  return payload.msg || payload.message || payload.error_description || payload.error || payload.details || fallback;
}

export async function signInWithPassword(username, password) {
  assertSupabaseConfigured();
  const normalizedUsername = normalizeUsername(username);
  const email = usernameToInternalEmail(normalizedUsername);

  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    const original = errorMessage(payload, 'No se pudo iniciar sesión.');
    const friendly = /invalid login credentials/i.test(original)
      ? 'Usuario o contraseña incorrectos.'
      : original;
    throw new Error(friendly);
  }
  return saveSession(payload, normalizedUsername);
}

export async function signOut() {
  const session = loadSession();
  try {
    if (session?.access_token && isSupabaseConfigured()) {
      await fetch(`${config.url}/auth/v1/logout`, {
        method: 'POST',
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    }
  } finally {
    saveSession(null);
  }
}

async function refreshSession() {
  const session = loadSession();
  if (!session?.refresh_token) {
    saveSession(null);
    throw new Error('Tu sesión terminó. Vuelve a iniciar sesión.');
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          apikey: config.key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      });
      const payload = await parseResponse(response);
      if (!response.ok) {
        saveSession(null);
        throw new Error(errorMessage(payload, 'No fue posible renovar la sesión.'));
      }
      return saveSession(payload, session?.user?.username);
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export async function getValidSession() {
  assertSupabaseConfigured();
  const session = loadSession();
  if (!session?.access_token) return null;

  const expiresAtMs = Number(session.expires_at || 0) * 1000;
  if (expiresAtMs && expiresAtMs - Date.now() < 60_000) {
    return refreshSession();
  }
  return session;
}

export async function restRequest(table, {
  method = 'GET',
  query = '',
  body,
  prefer,
  authRequired = true,
} = {}) {
  assertSupabaseConfigured();
  let session = authRequired ? await getValidSession() : null;
  if (authRequired && !session) throw new Error('Debes iniciar sesión.');

  const execute = async (token) => {
    const headers = {
      apikey: config.key,
      Accept: 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;

    return fetch(`${config.url}/rest/v1/${table}${query ? `?${query}` : ''}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let response = await execute(session?.access_token);
  if (response.status === 401 && authRequired && session?.refresh_token) {
    session = await refreshSession();
    response = await execute(session.access_token);
  }

  const payload = await parseResponse(response);
  if (!response.ok) {
    const message = errorMessage(payload, `Supabase respondió con HTTP ${response.status}.`);
    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export function getCurrentUser() {
  return loadSession()?.user || null;
}

export function getCurrentUsername() {
  return loadSession()?.user?.username || 'usuario';
}
