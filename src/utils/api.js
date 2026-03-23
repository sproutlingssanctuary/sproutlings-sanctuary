/**
 * API helpers – all requests go through these functions.
 * Token is stored in localStorage and attached to every protected request.
 */

const BASE = '/api';

function getToken() {
  return localStorage.getItem('daycare_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('daycare_token');
    localStorage.removeItem('daycare_user');
    window.location.reload();
    return null;
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export async function login(username, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  localStorage.setItem('daycare_token', data.token);
  localStorage.setItem('daycare_user', JSON.stringify(data.user));
  return data.user;
}

export function logout() {
  localStorage.removeItem('daycare_token');
  localStorage.removeItem('daycare_user');
}

export function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('daycare_user')); } catch { return null; }
}

// ─── Children ────────────────────────────────────────────────────────────────
export const getChildrenKiosk = () => request('/children');
export const getChildrenFull  = () => request('/children/full');
export const addChild    = (data) => request('/children', { method: 'POST', body: JSON.stringify(data) });
export const updateChild = (id, data) => request(`/children/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteChild = (id) => request(`/children/${id}`, { method: 'DELETE' });

// ─── Kiosk ───────────────────────────────────────────────────────────────────
export const verifyPin   = (childId, pin) => request('/kiosk/verify-pin', { method: 'POST', body: JSON.stringify({ childId, pin }) });
export const checkIn     = (childId, who) => request('/attendance/checkin', { method: 'POST', body: JSON.stringify({ childId, who }) });
export const checkOut    = (childId, who) => request('/attendance/checkout', { method: 'POST', body: JSON.stringify({ childId, who }) });
export const getToday    = () => request('/attendance/today');

// ─── Attendance ──────────────────────────────────────────────────────────────
export const getHistory  = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return request(`/attendance/history?${q}`);
};

export const exportCSV = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  const token = getToken();
  const url = `${BASE}/reports/attendance-csv?${q}`;
  const a = document.createElement('a');
  // Pass token via query param for file downloads (alternative: cookie)
  a.href = url + `&token=${token}`;
  a.download = `attendance_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
};

// ─── Daily Logs ──────────────────────────────────────────────────────────────
export const getLogs  = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return request(`/logs?${q}`);
};
export const addLog    = (data) => request('/logs', { method: 'POST', body: JSON.stringify(data) });
export const deleteLog = (id)   => request(`/logs/${id}`, { method: 'DELETE' });

// ─── Staff ───────────────────────────────────────────────────────────────────
export const getStaff    = ()     => request('/staff');
export const addStaff    = (data) => request('/staff', { method: 'POST', body: JSON.stringify(data) });
export const deleteStaff = (id)   => request(`/staff/${id}`, { method: 'DELETE' });
