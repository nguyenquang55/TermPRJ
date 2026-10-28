const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export function getAuth() {
  try {
    const raw = localStorage.getItem('salon_auth');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuth(authData) {
  if (!authData) {
    localStorage.removeItem('salon_auth');
  } else {
    localStorage.setItem('salon_auth', JSON.stringify(authData));
  }
}

export async function apiRequest(path, options = {}) {
  const auth = getAuth();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (auth?.token) {
    headers['Authorization'] = `Bearer ${auth.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }

  if (!res.ok) {
    if (res.status === 401 && path !== '/auth/login') {
      setAuth(null);
    }
    const err = new Error(payload?.message || `Lỗi HTTP ${res.status}`);
    err.status = res.status;
    err.code = payload?.error || 'ERROR';
    throw err;
  }

  return payload?.data;
}
