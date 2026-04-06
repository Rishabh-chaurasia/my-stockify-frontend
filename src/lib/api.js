// ═══════════════════════════════════════════════════════════════
// Stockify API Client
//
// BACKEND ORDER BEHAVIOR (verified from Postman):
//   ALL orders return status="PENDING" on placement
//   The backend executes them when market opens / price conditions met
//   EXECUTED orders show in portfolio (GET /api/portfolio)
//   402 = Insufficient balance
//   401 = Session expired
// ═══════════════════════════════════════════════════════════════

const API = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || '';

export class ApiError extends Error {
  constructor(status, msg) { super(msg); this.status = status; this.name = 'ApiError'; }
}

function tok() { try { return localStorage.getItem('authToken'); } catch { return null; } }

async function http(path, opts = {}) {
  const t = tok();
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (res.status === 401) {
    try { localStorage.removeItem('authToken'); localStorage.removeItem('username'); } catch {}
    if (!window.location.pathname.startsWith('/login')) window.location.href = '/login';
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }
  return res;
}

async function parseErr(res) {
  const j = await res.json().catch(() => ({}));
  return j?.error?.message || j?.message
    || (Array.isArray(j?.errors) ? j.errors[0]?.defaultMessage : null)
    || `Error ${res.status}`;
}

function mapProfile(raw) {
  if (!raw) return null;
  return {
    username:      raw.username       || '',
    name:          raw.name           || '',
    email:         raw.email          || '',
    phone:         raw.phone          || '',
    dob: Array.isArray(raw.dob)
      ? `${raw.dob[0]}-${String(raw.dob[1]).padStart(2,'0')}-${String(raw.dob[2]).padStart(2,'0')}`
      : (raw.dob || ''),
    aadhaar:       raw.aadhar         || '',
    pan:           raw.pan            || '',
    incomeRange:   raw.incomeRange    || '',
    fatherName:    raw.fatherName     || '',
    occupation:    raw.occupation     || '',
    maritalStatus: raw.maratialStatus || '',
    gender:        raw.gender         || '',
    emailVerified: raw.emailVerified  ?? false,
    addresses:     (raw.addresses || []).filter(Boolean),
    wallet:        raw.wallet || null,
  };
}

// ── AUTH ──────────────────────────────────────────────────────
export async function login({ username, password }) {
  const res = await fetch(`${API}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new ApiError(res.status, await parseErr(res));
  const { data } = await res.json();
  const token = data?.token || data;
  localStorage.setItem('authToken', token);
  localStorage.setItem('username', username);
  return { token, username };
}

export async function register(f) {
  const body = {
    username: f.username, name: f.name, email: f.email, phone: f.phone,
    dob: f.dob, aadhar: f.aadhaar, pan: f.pan?.toUpperCase(),
    incomeRange: f.incomeRange, occupation: f.occupation,
    maratialStatus: f.maritalStatus, gender: f.gender, fatherName: f.fatherName,
    password: f.password,
    address: [
      { addressLine1: f.permanentAddress, city: f.permanentCity, state: f.permanentState, pincode: f.permanentPincode, addressType: 'PERMANENT' },
      { addressLine1: f.currentAddress || f.permanentAddress, city: f.currentCity || f.permanentCity, state: f.currentState || f.permanentState, pincode: f.currentPincode || f.permanentPincode, addressType: 'CURRENT' },
    ],
  };
  const res = await fetch(`${API}/api/register`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new ApiError(res.status, await parseErr(res));
}

// ── PROFILE ───────────────────────────────────────────────────
export async function getUserProfile(username) {
  const res = await http(`/api/user-profile/${username}`);
  if (!res.ok) throw new ApiError(res.status, await parseErr(res));
  return mapProfile((await res.json()).data);
}

export async function updateUserProfile(username, fields) {
  const res = await http(`/api/user-profile/${username}`, { method: 'PUT', body: JSON.stringify(fields) });
  if (!res.ok) throw new ApiError(res.status, await parseErr(res));
  return mapProfile((await res.json()).data);
}

export async function sendOtp(username) {
  const res = await http(`/api/user-profile/${username}/send-otp`, { method: 'POST' });
  const j = await res.json();
  if (!res.ok || !j.success) throw new ApiError(res.status, j.data || 'Failed to send OTP');
  return j.data;
}

export async function verifyEmail(username, otp) {
  const res = await http(`/api/user-profile/${username}/verify-email`, { method: 'POST', body: JSON.stringify({ otp }) });
  const j = await res.json();
  if (!res.ok || !j.success) throw new ApiError(res.status, j.data || 'Invalid OTP');
  return j.data;
}

// ── PORTFOLIO ─────────────────────────────────────────────────
export async function getPortfolio(username) {
  const res = await http(`/api/portfolio/${username}`);
  if (!res.ok) throw new ApiError(res.status, await parseErr(res));
  const response = await res.json();
  let raw = [];
  if (Array.isArray(response.data)) {
    raw = response.data;
  } else if (Array.isArray(response.data?.stocks)) {
    raw = response.data.stocks;
  }
  const holdings = raw.map(h => ({
    id:         h.id,
    symbol:     h.stockName || '',
    name:       (h.stockName || '').replace('.NS', ''),
    qty:        h.quantity   || 0,
    avgPrice:   h.averagePrice || 0,
    investment: h.investment || ((h.averagePrice || 0) * (h.quantity || 0)),
  }));
  return {
    holdings,
    totalInvested: response.data?.totalInvestment ?? holdings.reduce((s,h) => s+h.investment, 0),
  };
}

// Fetch live prices for holdings
export async function fetchHoldingPrices(symbols) {
  const result = {};
  await Promise.allSettled(symbols.map(async sym => {
    try {
      const d = await getStockData(sym, '1d', '1m');
      if (d?.meta?.price) {
        result[sym] = { price: d.meta.price, changePercent: d.meta.changePercent ?? 0 };
      }
    } catch {}
  }));
  return result;
}

// ── STOCKS ────────────────────────────────────────────────────
export async function getStockData(symbol, range = '1d', interval = '1m') {
  const sym = symbol.includes('.') ? symbol : symbol.toUpperCase() + '.NS';
  const t = tok();
  const headers = { 'Content-Type': 'application/json' };
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${API}/api/stocks/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`, { headers });
  if (!res.ok) throw new ApiError(res.status, 'Stock not found');
  return (await res.json()).data;
}

export async function fetchChartData(symbol, range = '1y') {
  try {
    const sym = symbol.includes('.') ? symbol : symbol.toUpperCase() + '.NS';
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=${range}`;
    const res = await fetch('https://corsproxy.io/?' + encodeURIComponent(url));
    const j = await res.json();
    const r = j?.chart?.result?.[0];
    const ts = r?.timestamp ?? [], close = r?.indicators?.quote?.[0]?.close ?? [];
    return ts.map((t, i) => ({
      date: new Date(t * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      close: +((close[i] || 0).toFixed(2)),
    })).filter(d => d.close > 0);
  } catch { return []; }
}

// ── ORDERS ────────────────────────────────────────────────────
// From Postman: ALL orders come back as status="PENDING"
// Backend executes them when market is open and price conditions met
// EXECUTED orders appear in portfolio via GET /api/portfolio
// Cancelled orders: handled locally only (no backend cancel endpoint)
export async function buyStock(username, { symbol, quantity, orderType, price }) {
  const res = await http(`/api/orders/buy?username=${encodeURIComponent(username)}`, {
    method: 'POST',
    body: JSON.stringify({ symbol, quantity, orderType: orderType || 'MARKET', price }),
  });
  const j = await res.json();

  if (res.status === 402) {
    throw new ApiError(402, j?.error?.message || 'Insufficient balance in your wallet');
  }
  if (!res.ok || !j.success) {
    throw new ApiError(res.status, j?.error?.message || j?.message || 'Order failed');
  }
  // Backend response: {symbol, quantity, orderType, price, status}
  // status is always "PENDING" — backend executes when market opens
  return j.data;
}

// ── LOCAL ORDER STORE ─────────────────────────────────────────
// Orders are stored locally since there's no GET /api/orders endpoint
// When backend executes an order, it appears in portfolio
// Cancelled: marked locally, no wallet refund from backend (no cancel API)
const OKEY = u => `sfy_orders_${u}`;

export function saveLocalOrder(username, order) {
  try {
    const list = getLocalOrders(username);
    const entry = { ...order, id: Date.now(), createdAt: new Date().toISOString() };
    localStorage.setItem(OKEY(username), JSON.stringify([entry, ...list]));
    return entry;
  } catch { return null; }
}

export function getLocalOrders(username) {
  try { return JSON.parse(localStorage.getItem(OKEY(username)) || '[]'); }
  catch { return []; }
}

export function cancelLocalOrder(username, id) {
  // Mark as cancelled locally — no wallet refund since backend hasn't executed it
  try {
    const list = getLocalOrders(username).map(o =>
      o.id === id ? { ...o, status: 'CANCELLED', cancelledAt: new Date().toISOString() } : o
    );
    localStorage.setItem(OKEY(username), JSON.stringify(list));
  } catch {}
}

// ── AUTH HELPERS ──────────────────────────────────────────────
export function logout() {
  try { localStorage.removeItem('authToken'); localStorage.removeItem('username'); } catch {}
  window.location.href = '/login';
}

export function isAuthenticated() {
  try {
    const t = localStorage.getItem('authToken');
    if (!t || t === 'undefined' || t === 'null') return false;
    const parts = t.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return true;
    if (Date.now() >= payload.exp * 1000) {
      localStorage.removeItem('authToken'); localStorage.removeItem('username');
      return false;
    }
    return true;
  } catch { return false; }
}
// ── ORDER CALCULATION ─────────────────────────────────────────
export function calcOrderOutcome(orderType, marketPrice, limitPrice) {
  if (orderType === 'MARKET') {
    return {
      isPending: false,
      executedAt: marketPrice
    };
  }

  if (orderType === 'LIMIT') {
    if (!limitPrice) return null;

    // If limit price < market → pending
    if (limitPrice < marketPrice) {
      return {
        isPending: true,
        executedAt: null
      };
    }

    // If limit price >= market → executes instantly
    return {
      isPending: false,
      executedAt: Math.min(limitPrice, marketPrice)
    };
  }

  return null;
}
export function getStoredUsername() {
  try { return localStorage.getItem('username'); } catch { return null; }
}

export function getApiBase() { return API || 'http://localhost:8081'; }
