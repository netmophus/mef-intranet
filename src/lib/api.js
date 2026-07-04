// Client API de l'intranet.
// - envoie toujours les cookies (credentials:'include')
// - sur 401 (hors login/refresh) : tente UNE fois POST /api/v1/auth/refresh/
//   puis rejoue la requête ; si nouvel échec → redirection /login.
// - gère JSON et FormData (upload de scan).

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const SANS_REFRESH = ['/api/v1/auth/login/', '/api/v1/auth/refresh/'];

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
  const res = await fetch(`${API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined && !estForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? (estForm ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 401 && !_retry && !SANS_REFRESH.includes(path)) {
    const refreshed = await fetch(`${API_URL}/api/v1/auth/refresh/`, {
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

export function apiPatch(path, body) {
  return request(path, { method: 'PATCH', body });
}

export const BASE_API = API_URL;
