// ═══════════════════════════════════════════════════════════════
// Stockify API — https://api.mystockify.in
//
// MARKET HOURS: 9:15 AM – 3:30 PM IST, Mon-Fri
// ORDER LOGIC (from OrderService.java):
//   MARKET + market open  → EXECUTED immediately
//   MARKET + market closed → PENDING, funds reserved
//   LIMIT  + (closed OR currentPrice > limitPrice) → PENDING
//   LIMIT  + (open AND currentPrice <= limitPrice) → EXECUTED
//
// Scheduler runs every 10s during market hours — auto-executes PENDING orders
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

// ── Market time helpers (IST) ──────────────────────────────────
export function isMarketOpen() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  if (day === 0 || day === 6) return false;
  const h = ist.getHours(), m = ist.getMinutes();
  const mins = h * 60 + m;
  return mins >= 9 * 60 + 15 && mins <= 15 * 60 + 30;
}

export function getMarketStatus() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  if (day === 0 || day === 6) return { open: false, label: 'Closed (Weekend)', color: '#94a3b8' };
  const h = ist.getHours(), m = ist.getMinutes();
  const mins = h * 60 + m;
  const open = 9 * 60 + 15, close = 15 * 60 + 30;
  if (mins < open)  return { open: false, label: `Opens at 9:15 AM IST`, color: '#f59e0b' };
  if (mins > close) return { open: false, label: `Closed (Opens tomorrow 9:15 AM)`, color: '#94a3b8' };
  if (mins >= 15 * 60 + 20) return { open: true, label: 'Pre-close session', color: '#f59e0b' };
  return { open: true, label: 'Market Open', color: '#00b386' };
}

// ── Profile mapper ────────────────────────────────────────────
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
  const { data } = await res.json();
  const raw = Array.isArray(data) ? data : Array.isArray(data?.stocks) ? data.stocks : [];
  const holdings = raw.map(h => ({
    id:         h.id,
    symbol:     h.stockName  || '',
    name:       (h.stockName || '').replace('.NS',''),
    qty:        h.quantity   || 0,
    avgPrice:   h.averagePrice || 0,
    investment: h.investment || ((h.averagePrice||0)*(h.quantity||0)),
  }));
  return { holdings, totalInvested: holdings.reduce((s,h)=>s+h.investment,0) };
}

export async function fetchHoldingPrices(symbols) {
  const result = {};
  await Promise.allSettled(symbols.map(async sym => {
    try {
      const d = await getStockData(sym, '1d', '1m');
      if (d?.meta?.price) result[sym] = { price: d.meta.price, changePercent: d.meta.changePercent ?? 0 };
    } catch {}
  }));
  return result;
}

// ── STOCKS ────────────────────────────────────────────────────
// Always routes through backend — backend talks to Yahoo Finance server-side
// (no CORS issues). Backend may 500 on longer ranges due to Yahoo rate limiting.
// Returns { meta: StockMetaDTO, chart: StockCandleDTO[] }
// StockCandleDTO.time = Unix timestamp in seconds — multiply by 1000 for JS Date
export async function getStockData(symbol, range = '1d', interval = '1m') {
  const sym = symbol.includes('.') ? symbol : symbol.toUpperCase() + '.NS';
  const t = tok();
  const headers = { 'Content-Type': 'application/json' };
  if (t) headers['Authorization'] = `Bearer ${t}`;
  const res = await fetch(`${API}/api/stocks/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`, { headers });
  if (!res.ok) throw new ApiError(res.status, 'Stock data unavailable');
  return (await res.json()).data; // { meta, chart }
}

// ── CHART DATA — Yahoo Finance directly ───────────────────────
// Local dev: Vite proxies /yf/* → query1.finance.yahoo.com (no CORS)
// Production: /api/chart Vercel serverless function fetches Yahoo server-side
//
// This bypasses the Spring Boot backend entirely for chart data,
// since backend rate-limits on ranges > 1d.

const intervalMap = { '1d':'1m', '5d':'5m', '1mo':'1d', '3mo':'1d', '6mo':'1d', '1y':'1d', '5y':'1wk' };

function formatChartDate(ts, range) {
  const d = new Date(ts * 1000);
  if (range === '1d' || range === '5d') {
    return d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:false, timeZone:'Asia/Kolkata' });
  } else if (range === '1mo' || range === '3mo' || range === '6mo') {
    return d.toLocaleDateString('en-IN', { day:'2-digit', month:'short' });
  }
  return d.toLocaleDateString('en-IN', { month:'short', year:'2-digit' });
}

async function fetchYahooChart(sym, range, interval) {
  // /yf/* is proxied to Yahoo Finance:
  // - Local dev: Vite proxy in vite.config.js
  // - Production: Vercel rewrite in vercel.json
  const url = `/yf/v8/finance/chart/${encodeURIComponent(sym)}?range=${range}&interval=${interval}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`Yahoo Finance ${res.status}`);
  return res.json();
}

function parseYahooResponse(json, range) {
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error('No chart data');
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  if (timestamps.length === 0) throw new Error('Empty chart data');
  return timestamps
    .map((t, i) => ({ date: formatChartDate(t, range), close: Number((closes[i] || 0).toFixed(2)), time: t }))
    .filter(c => c.close > 0);
}

export async function fetchChartData(symbol, range = '1d') {
  const sym = symbol.includes('.') ? symbol : symbol.toUpperCase() + '.NS';
  const interval = intervalMap[range] || '1d';

  // Try requested range
  try {
    const json = await fetchYahooChart(sym, range, interval);
    const data = parseYahooResponse(json, range);
    if (data.length > 0) return data;
  } catch {}

  // Fall back to 1d if longer range failed
  if (range !== '1d') {
    try {
      const json = await fetchYahooChart(sym, '1d', '1m');
      const data = parseYahooResponse(json, '1d');
      if (data.length > 0) return data;
    } catch {}
  }

  throw new Error('Chart data unavailable');
}

// ── ORDERS ────────────────────────────────────────────────────
// GET /api/orders/get-orders?username=X&orderType=ALL|PENDING|EXECUTED [AUTH]
// Returns: {success, data: {orders:[{id,symbol,quantity,orderType,price,status}], totalOrders, pendingOrders, executedOrders}}
export async function getOrders(username, orderType = 'ALL') {
  const res = await http(`/api/orders/get-orders?username=${encodeURIComponent(username)}&orderType=${orderType}`);
  if (!res.ok) throw new ApiError(res.status, await parseErr(res));
  const j = await res.json();
  const data = j?.data || {};
  const raw  = Array.isArray(data.orders) ? data.orders : [];
  return {
    orders: raw.map((o, i) => ({
      id:                 o.id || i,
      symbol:             o.symbol || '',
      stockName:          (o.symbol||'').replace('.NS',''),
      quantity:           o.quantity || 0,
      orderType:          o.orderType || 'MARKET',
      price:              o.price || 0,
      limitPrice:         o.orderType === 'LIMIT' ? (o.price||0) : null,
      executedPrice:      o.status === 'EXECUTED' ? (o.price||0) : null,
      status:             o.status || 'PENDING',
      type:               o.type || 'BUY',   // BUY or SELL — from backend TransactionType enum
      createdAt:          o.createdAt || null,
    })),
    totalOrders:    data.totalOrders    || 0,
    pendingOrders:  data.pendingOrders  || 0,
    executedOrders: data.executedOrders || 0,
  };
}

// POST /api/orders/buy?username=X [AUTH]
// Body: {symbol, quantity, orderType, price}
// Response: {success, data: {symbol, quantity, orderType, price, status}}
export async function buyStock(username, { symbol, quantity, orderType, price }) {
  const res = await http(`/api/orders/buy?username=${encodeURIComponent(username)}`, {
    method: 'POST',
    body: JSON.stringify({ symbol, quantity, orderType: orderType || 'MARKET', price }),
  });
  const j = await res.json();
  if (res.status === 402) throw new ApiError(402, j?.error?.message || 'Insufficient balance');
  if (!res.ok || !j.success) throw new ApiError(res.status, j?.error?.message || j?.message || 'Order failed');
  return j.data; // {symbol, quantity, orderType, price, status}
}

// ── LOCAL ORDER STORE — cache/fallback ────────────────────────
const OKEY = u => `sfy_orders_${u}`;

export function saveLocalOrder(username, order) {
  try {
    const list = getLocalOrders(username);
    const entry = { ...order, id: order.id || Date.now(), createdAt: order.createdAt || new Date().toISOString() };
    localStorage.setItem(OKEY(username), JSON.stringify([entry, ...list.slice(0,99)]));
    return entry;
  } catch { return null; }
}

export function getLocalOrders(username) {
  try { return JSON.parse(localStorage.getItem(OKEY(username)) || '[]'); }
  catch { return []; }
}

export function cancelLocalOrder(username, id) {
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
    const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')));
    if (!payload.exp) return true;
    if (Date.now() >= payload.exp * 1000) {
      localStorage.removeItem('authToken'); localStorage.removeItem('username');
      return false;
    }
    return true;
  } catch { return false; }
}

export function getStoredUsername() {
  try { return localStorage.getItem('username'); } catch { return null; }
}

// Returns '' in local dev (uses Vite proxy) or the full URL in production
export function getApiBase() { return API || ''; }

// ── SELL ORDER ────────────────────────────────────────────────
// POST /api/orders/sell?username=X [AUTH]
// Body: {symbol, quantity, orderType, price}
// Errors:
//   500 "No stocks found"        → user has no holdings for this stock
//   402 "Less quantity available" → not enough shares to sell
// Response: {success, data: {symbol, quantity, orderType, price, status, type:"SELL"}}
export async function sellStock(username, { symbol, quantity, orderType, price }) {
  const res = await http(`/api/orders/sell?username=${encodeURIComponent(username)}`, {
    method: 'POST',
    body: JSON.stringify({ symbol, quantity, orderType: orderType || 'MARKET', price }),
  });
  const j = await res.json();
  // 402 = Less quantity available / Insufficient balance
  if (res.status === 402) throw new ApiError(402, j?.error?.message || 'Less quantity available');
  // 500 with "No stocks found" = not in portfolio
  if (!res.ok || !j.success) throw new ApiError(res.status, j?.error?.message || j?.message || 'Sell order failed');
  return j.data; // {symbol, quantity, orderType, price, status, type}
}

// ── INDICES ───────────────────────────────────────────────────
// GET /api/stocks/index/{symbol}?range=1d&interval=1h [PUBLIC]
// symbols: nifty50, bank-nifty, finnifty, nifty-it,
//          nifty-midcap-50, nifty-smallcap, sensex-bse, india-vix
// Returns: {success, data: {meta, chart}}
export async function getIndex(symbol, range = '1d', interval = '1h') {
  const res = await fetch(`${API}/api/stocks/index/${symbol}?range=${range}&interval=${interval}`);
  if (!res.ok) throw new ApiError(res.status, 'Index data unavailable');
  const j = await res.json();
  if (!j.success) throw new ApiError(500, j.message || 'Index data unavailable');
  return j.data; // { meta, chart }
}

// ── DELETE ORDER ──────────────────────────────────────────────
// DELETE /api/orders/delete-orders?username=X&id=Y [AUTH]
export async function deleteOrder(username, id) {
  const res = await http(`/api/orders/delete-orders?username=${encodeURIComponent(username)}&id=${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new ApiError(res.status, 'Failed to delete order');
  return true;
}
