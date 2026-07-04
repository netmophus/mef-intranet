// Client API de l'intranet.
// - envoie toujours les cookies (credentials:'include')
// - sur 401 (hors endpoints d'auth) : tente UNE fois POST /api/v1/auth/refresh/
//   puis rejoue la requête ; si nouvel échec → redirection /login.

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const AUTH_PREFIX = '/api/v1/auth/';

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
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Rafraîchissement automatique (une seule tentative), jamais sur les endpoints d'auth.
  if (res.status === 401 && !_retry && !path.startsWith(AUTH_PREFIX)) {
    const refreshed = await fetch(`${API_URL}${AUTH_PREFIX}refresh/`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) {
      return request(path, { method, body, _retry: true });
    }
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
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
