/* ════════════════════════════════════════════════════════════════
   AMBASSADOR SHOPPING CENTER — Full-stack server (Express)
   Deployable on Render. Storage: PostgreSQL when DATABASE_URL is
   set (production), otherwise a local JSON file (development).
   ─ Endpoints ─
   GET  /api/health           liveness
   GET  /api/config           public runtime config (google client id…)
   GET  /api/catalog          building + tenants + products + services
   POST /api/auth/google      verify Google ID token → session cookie
   POST /api/auth/demo        demo session (only when Google not configured)
   GET  /api/auth/me          current session user
   POST /api/auth/logout      clear session
   POST /api/orders           create order (totals recomputed server-side)
   GET  /api/my/orders        order history (session user or ?phone=)
   POST /api/notify           back-in-stock request
   GET  /api/admin/orders     all orders (x-admin-key header)
   GET  /api/admin/notify     all notify requests (x-admin-key header)
═══════════════════════════════════════════════════════════════════ */
'use strict';
const express = require('express');
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');

const PORT        = process.env.PORT || 3000;
const JWT_SECRET  = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const GOOGLE_ID   = process.env.GOOGLE_CLIENT_ID || '';
const ADMIN_KEY   = process.env.ADMIN_KEY || '';
const TG_TOKEN    = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT     = process.env.TELEGRAM_CHAT_ID || '';
const DATA_FILE   = process.env.DATA_FILE || path.join(__dirname, 'data.json');

if (!process.env.JWT_SECRET) console.warn('[warn] JWT_SECRET not set — using a random one (sessions reset on restart).');
if (!ADMIN_KEY) console.warn('[warn] ADMIN_KEY not set — admin endpoints disabled.');

/* ── catalog (source of truth for prices, areas, tax, banks) ── */
const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog.json'), 'utf8'));
const B = catalog.building;
const PRODUCTS = {};
B.tenants.forEach(t => t.products.forEach(p => { PRODUCTS[p.id] = Object.assign({ tenantId: t.id }, p); }));
const TENANTS = {}; B.tenants.forEach(t => { TENANTS[t.id] = t; });

/* ════════ storage adapter: Postgres (production) / JSON file (dev) ════════ */
let db;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : undefined
  });
  const init = pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY, google_sub TEXT UNIQUE, name TEXT, email TEXT,
      picture TEXT, created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY, ref TEXT UNIQUE, tenant_id TEXT, user_id INT,
      buyer JSONB, items JSONB, bank JSONB,
      subtotal INT, delivery_fee INT, tax INT, total INT,
      status TEXT DEFAULT 'placed', created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS notify_requests (
      id SERIAL PRIMARY KEY, product_id TEXT, phone TEXT, created_at TIMESTAMPTZ DEFAULT now());
  `);
  db = {
    kind: 'postgres',
    async ready(){ await init; },
    async upsertUser(u){
      const r = await pool.query(
        `INSERT INTO users (google_sub,name,email,picture) VALUES ($1,$2,$3,$4)
         ON CONFLICT (google_sub) DO UPDATE SET name=$2,email=$3,picture=$4 RETURNING *`,
        [u.sub, u.name, u.email, u.picture||'']);
      return r.rows[0];
    },
    async insertOrder(o){
      await pool.query(
        `INSERT INTO orders (ref,tenant_id,user_id,buyer,items,bank,subtotal,delivery_fee,tax,total,status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [o.ref,o.tenant.id,o.userId||null,o.buyer,JSON.stringify(o.items),o.bank,o.subtotal,o.deliveryFee,o.tax,o.total,o.status]);
    },
    async ordersByUser(uid){ return (await pool.query(`SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC LIMIT 50`,[uid])).rows; },
    async ordersByPhone(ph){ return (await pool.query(`SELECT * FROM orders WHERE buyer->>'phone'=$1 ORDER BY id DESC LIMIT 50`,[ph])).rows; },
    async allOrders(){ return (await pool.query(`SELECT * FROM orders ORDER BY id DESC LIMIT 500`)).rows; },
    async insertNotify(n){ await pool.query(`INSERT INTO notify_requests (product_id,phone) VALUES ($1,$2)`,[n.productId,n.phone]); },
    async allNotify(){ return (await pool.query(`SELECT * FROM notify_requests ORDER BY id DESC LIMIT 500`)).rows; }
  };
} else {
  /* JSON file store — fine for local dev; on Render use Postgres (render.yaml provisions it). */
  console.warn('[warn] DATABASE_URL not set — using JSON file store at ' + DATA_FILE + ' (dev only).');
  let mem = { users: [], orders: [], notify: [], seq: 1 };
  try { mem = Object.assign(mem, JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); } catch (e) {}
  const flush = () => { try { fs.writeFileSync(DATA_FILE, JSON.stringify(mem)); } catch (e) {} };
  db = {
    kind: 'file',
    async ready(){},
    async upsertUser(u){
      let row = mem.users.find(x => x.google_sub === u.sub);
      if (!row) { row = { id: mem.seq++, google_sub: u.sub }; mem.users.push(row); }
      Object.assign(row, { name: u.name, email: u.email, picture: u.picture || '' });
      flush(); return row;
    },
    async insertOrder(o){
      mem.orders.unshift({ id: mem.seq++, ref:o.ref, tenant_id:o.tenant.id, user_id:o.userId||null,
        buyer:o.buyer, items:o.items, bank:o.bank, subtotal:o.subtotal, delivery_fee:o.deliveryFee,
        tax:o.tax, total:o.total, status:o.status, created_at:new Date().toISOString() });
      flush();
    },
    async ordersByUser(uid){ return mem.orders.filter(o => o.user_id === uid).slice(0, 50); },
    async ordersByPhone(ph){ return mem.orders.filter(o => o.buyer && o.buyer.phone === ph).slice(0, 50); },
    async allOrders(){ return mem.orders.slice(0, 500); },
    async insertNotify(n){ mem.notify.unshift({ id: mem.seq++, product_id:n.productId, phone:n.phone, created_at:new Date().toISOString() }); flush(); },
    async allNotify(){ return mem.notify.slice(0, 500); }
  };
}

/* ════════ minimal HS256 session tokens (no extra deps) ════════ */
const b64u = b => Buffer.from(b).toString('base64url');
function signToken(payload, days){
  const body = Object.assign({}, payload, { exp: Date.now() + (days||30)*864e5 });
  const head = b64u(JSON.stringify({ alg:'HS256', typ:'JWT' }));
  const data = head + '.' + b64u(JSON.stringify(body));
  const sig  = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return data + '.' + sig;
}
function verifyToken(tok){
  try {
    const [h, p, s] = tok.split('.');
    const expect = crypto.createHmac('sha256', JWT_SECRET).update(h + '.' + p).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expect))) return null;
    const body = JSON.parse(Buffer.from(p, 'base64url').toString());
    if (body.exp && Date.now() > body.exp) return null;
    return body;
  } catch (e) { return null; }
}
function getSession(req){
  const raw = req.headers.cookie || '';
  const m = raw.split(/;\s*/).find(c => c.startsWith('amb_session='));
  return m ? verifyToken(decodeURIComponent(m.split('=').slice(1).join('='))) : null;
}
function setSession(res, payload){
  const tok = signToken(payload, 30);
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie', `amb_session=${encodeURIComponent(tok)}; HttpOnly; Path=/; Max-Age=${30*86400}; SameSite=Lax${secure}`);
}

/* ════════ order math — server is authoritative for all money ════════ */
function computeOrder(input){
  const t = TENANTS[input.tenantId];
  if (!t) throw new Error('Unknown seller');
  if (!Array.isArray(input.items) || !input.items.length) throw new Error('Empty order');
  const items = input.items.map(it => {
    const p = PRODUCTS[it.pid];
    if (!p || p.tenantId !== t.id) throw new Error('Unknown product: ' + it.pid);
    const qty = Math.max(1, Math.min(99, parseInt(it.qty, 10) || 1));
    return { pid: p.id, name: p.name, variant: (it.variant || '') + '', qty, price: p.price, line: p.price * qty };
  });
  const subtotal = items.reduce((s, it) => s + it.line, 0);

  const buyer = input.buyer || {};
  const method = buyer.method === 'pickup' ? 'pickup' : 'delivery';
  let fee = 0, area = null;
  if (method === 'delivery') {
    area = (B.areas || []).find(a => a.name === buyer.area);
    if (!area) throw new Error('Please choose a delivery area (Addis Ababa only)');
    fee = area.fee || 0;
    const km = parseFloat(input.gpsKm);
    if (isFinite(km) && km > 0 && km < 80 && area.lat != null && B.delivery) {
      const extra = Math.max(0, km - (B.delivery.freeKm || 0)) * (B.delivery.perKm || 0);
      fee += Math.round(Math.min(extra, B.delivery.gpsSurchargeCap || extra));
    }
  }
  const rate = (B.tax && B.tax.rate) || 0;
  const tax = Math.round((subtotal + fee) * rate);
  const total = subtotal + fee + tax;

  const bank = (t.banks || []).find(b => b.key === input.bankKey);
  if (!bank) throw new Error('Please choose how to pay');

  const ref = 'AMB-' + t.id.toUpperCase().slice(0, 3) + '-' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();
  return {
    ref, date: new Date().toISOString(), building: B.name,
    tenant: { id: t.id, name: t.name, floor: t.floor, whatsapp: t.whatsapp, owner: t.owner, mobile: t.mobile },
    buyer: {
      name: ('' + (buyer.name || '')).slice(0, 80), phone: ('' + (buyer.phone || '')).slice(0, 25),
      method, area: area ? area.name : '', addr: ('' + (buyer.addr || '')).slice(0, 200), geo: ('' + (buyer.geo || '')).slice(0, 120)
    },
    items, bank: { name: bank.name, acct: bank.acct, holder: bank.holder },
    subtotal, deliveryFee: fee, tax, taxLabel: (B.tax && B.tax.label) || 'VAT', taxRate: rate, total,
    status: 'placed'
  };
}

/* fire-and-forget seller/admin notification via Telegram (optional) */
function notifySeller(o){
  if (!TG_TOKEN || !TG_CHAT) return;
  const lines = o.items.map(it => `• ${it.name}${it.variant ? ' [' + it.variant + ']' : ''} x${it.qty} — ${it.line} ETB`).join('\n');
  const text = `🛍 NEW ORDER ${o.ref}\nSeller: ${o.tenant.name} (${o.tenant.floor})\n${lines}\nSubtotal ${o.subtotal} + delivery ${o.deliveryFee} + ${o.taxLabel} ${o.tax}\nTOTAL: ${o.total} ETB\nBuyer: ${o.buyer.name} ${o.buyer.phone}\n${o.buyer.method === 'pickup' ? 'Pickup' : 'Deliver: ' + o.buyer.area + ' — ' + o.buyer.addr}${o.buyer.geo ? '\nMap: ' + o.buyer.geo : ''}\nPay to: ${o.bank.name} ${o.bank.acct}`;
  fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text })
  }).catch(e => console.error('[telegram]', e.message));
}

/* ════════ app ════════ */
const app = express();
app.use(express.json({ limit: '200kb' }));
app.disable('x-powered-by');

app.get('/api/health', (req, res) => res.json({ ok: true, db: db.kind }));

app.get('/api/config', (req, res) => res.json({
  googleClientId: GOOGLE_ID || null,
  demoAuth: !GOOGLE_ID,
  building: { name: B.name }
}));

app.get('/api/catalog', (req, res) => res.json(catalog));

/* ── auth ── */
app.post('/api/auth/google', async (req, res) => {
  try {
    if (!GOOGLE_ID) return res.status(400).json({ error: 'Google sign-in not configured' });
    const cred = (req.body && req.body.credential) || '';
    if (!cred) return res.status(400).json({ error: 'Missing credential' });
    // Verify the ID token with Google (issuer-side verification)
    const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(cred));
    if (!r.ok) return res.status(401).json({ error: 'Invalid token' });
    const info = await r.json();
    if (info.aud !== GOOGLE_ID) return res.status(401).json({ error: 'Token audience mismatch' });
    if (info.exp && Date.now() / 1000 > +info.exp) return res.status(401).json({ error: 'Token expired' });
    const user = await db.upsertUser({ sub: info.sub, name: info.name || info.email, email: info.email, picture: info.picture || '' });
    setSession(res, { uid: user.id, sub: info.sub, name: user.name, email: user.email, picture: user.picture });
    res.json({ user: { name: user.name, email: user.email, picture: user.picture, sub: info.sub } });
  } catch (e) { res.status(500).json({ error: 'Sign-in failed' }); }
});

app.post('/api/auth/demo', async (req, res) => {
  if (GOOGLE_ID && process.env.ALLOW_DEMO !== '1') return res.status(403).json({ error: 'Demo auth disabled' });
  const sub = 'demo-' + crypto.randomBytes(6).toString('hex');
  const name = ((req.body && req.body.name) || 'Guest Shopper').slice(0, 60);
  const user = await db.upsertUser({ sub, name, email: name.toLowerCase().replace(/\s+/g, '.') + '@demo.local', picture: '' });
  setSession(res, { uid: user.id, sub, name: user.name, email: user.email, picture: '' });
  res.json({ user: { name: user.name, email: user.email, picture: '', sub }, demo: true });
});

app.get('/api/auth/me', (req, res) => {
  const s = getSession(req);
  res.json({ user: s ? { name: s.name, email: s.email, picture: s.picture || '', sub: s.sub } : null });
});

app.post('/api/auth/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'amb_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  res.json({ ok: true });
});

/* ── orders ── */
app.post('/api/orders', async (req, res) => {
  try {
    const order = computeOrder(req.body || {});
    const s = getSession(req);
    order.userId = s ? s.uid : null;
    await db.insertOrder(order);
    notifySeller(order);
    res.json({ order });
  } catch (e) { res.status(400).json({ error: e.message || 'Could not place order' }); }
});

app.get('/api/my/orders', async (req, res) => {
  const s = getSession(req);
  let rows = [];
  if (s) rows = await db.ordersByUser(s.uid);
  else if (req.query.phone) rows = await db.ordersByPhone(('' + req.query.phone).slice(0, 25));
  res.json({ orders: rows });
});

/* ── notify-me ── */
app.post('/api/notify', async (req, res) => {
  const pid = (req.body && req.body.productId) || '';
  const phone = ('' + ((req.body && req.body.phone) || '')).trim().slice(0, 25);
  if (!PRODUCTS[pid] || !phone) return res.status(400).json({ error: 'Invalid request' });
  await db.insertNotify({ productId: pid, phone });
  res.json({ ok: true });
});

/* ── admin (key-protected) ── */
function requireAdmin(req, res, next){
  if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin not configured' });
  if ((req.headers['x-admin-key'] || req.query.key) !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
app.get('/api/admin/orders', requireAdmin, async (req, res) => res.json({ orders: await db.allOrders() }));
app.get('/api/admin/notify', requireAdmin, async (req, res) => res.json({ requests: await db.allNotify() }));

/* ── static frontend ── */
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h', index: 'index.html' }));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

db.ready().then(() => {
  app.listen(PORT, () => console.log(`Ambassador store running on :${PORT} (db: ${db.kind})`));
}).catch(e => { console.error('DB init failed:', e); process.exit(1); });
