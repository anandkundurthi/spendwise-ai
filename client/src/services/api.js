
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api/v1';

export function getToken() {
  return localStorage.getItem('spendwise_token');
}

export function assetUrl(path) {
  if (!path) return '';

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const apiOrigin = new URL(BASE, window.location.origin).origin;
  return `${apiOrigin}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function api(path, options = {}) {
  const isFormData =
    typeof FormData !== 'undefined' &&
    options.body instanceof FormData;

  const headers = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers || {})
  };

  if (getToken()) {
    headers.Authorization = `Bearer ${getToken()}`;
  }

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
    cache: 'no-store'
  });

  const data = await response.json().catch(() => ({}));


if (!response.ok) {
  const error = new Error(
    data.message || `Request failed (${response.status})`
  );

  error.status = response.status;
  error.code = data.code;

  throw error;
}


  return data;
}
