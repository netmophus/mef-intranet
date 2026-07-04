// Client API de l'intranet.
// - URL du backend dérivée de l'hôte courant (localhost -> localhost:8000,
//   127.0.0.1 -> 127.0.0.1:8000) pour que les cookies restent SAME-SITE.
//   Surchargée par NEXT_PUBLIC_API_URL si défini (backend distant).
// - envoie toujours les cookies (credentials:'include')
// - sur 401 (hors login/refresh) : tente UNE fois POST /api/v1/auth/refresh/
//   puis rejoue la requête ; si nouvel échec → redirection /login.
// - gère JSON et FormData (upload de scan).

const SANS_REFRESH = ['/api/v1/auth/login/', '/api/v1/auth/refresh/'];

export function apiBase() {
  const env = process.env.NEXT_PUBLIC_API_URL;
  if (env) return env;
  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return 'http://localhost:8000';
}

export class ApiError extends Error {
  constructor(status, data) {
    super((data && (data.detail || data.message)) || `Erreur ${status}`);
    this.status = status;
    this.data = data;
  }
}

async function parse(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request(path, { method = 'GET', body, _retry = false } = {}) {
  const estForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const base = apiBase();
  const res = await fetch(`${base}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined && !estForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? (estForm ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 401 && !_retry && !SANS_REFRESH.includes(path)) {
    const refreshed = await fetch(`${base}/api/v1/auth/refresh/`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) {
      return request(path, { method, body, _retry: true });
    }
    // Session morte : on remonte l'erreur (le backend a purgé les cookies).
    // La navigation vers /login est gérée par le proxy et les gardes de page —
    // surtout PAS ici, sinon on boucle /me/ ↔ /refresh/ via le AuthProvider.
    throw new ApiError(401, await parse(res));
  }

  const data = await parse(res);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

export function apiGet(path) {
  return request(path, { method: 'GET' });
}

export function apiPost(path, body) {
  return request(path, { method: 'POST', body });
}

export function apiPatch(path, body) {
  return request(path, { method: 'PATCH', body });
}
