/* ════════════════════════════════════════════════════════════════
   AMBASSADOR SHOPPING CENTER — Full-stack server v2 (Express)
   New in v2:
   • Catalog lives in the DATABASE (seeded from catalog.json on first boot)
     and is editable from the admin UI — no redeploys to add sellers/products.
   • SELLER PORTAL: phone + access code login, per-seller order list,
     order status lifecycle, stock/price management  → /seller.html
   • BUYER SMS notifications (order placed + status changes) via
     AfroMessage or Twilio (set env vars), with a log-only fallback.
   • Admin CRUD: tenants, products, seller access codes  → /admin.html
═══════════════════════════════════════════════════════════════════ */
'use strict';
const express = require('express');
const crypto  = require('crypto');
const fs      = require('fs');
const path    = require('path');

const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
const GOOGLE_ID  = process.env.GOOGLE_CLIENT_ID || '';
const ADMIN_KEY  = process.env.ADMIN_KEY || '';
const TG_TOKEN   = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT    = process.env.TELEGRAM_CHAT_ID || '';
const DATA_FILE  = process.env.DATA_FILE || path.join(__dirname, 'data.json');

if (!process.env.JWT_SECRET) console.warn('[warn] JWT_SECRET not set — using a random one (sessions reset on restart).');
if (!ADMIN_KEY) console.warn('[warn] ADMIN_KEY not set — admin endpoints disabled.');

const SEED = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalog.json'), 'utf8'));

/* ── live catalog (loaded from DB at boot; re-indexed after every mutation) ── */
let catalog = null, B = null, PRODUCTS = {}, TENANTS = {}, SERVICES = {};
function indexCatalog(){
  B = catalog.building;
  PRODUCTS = {}; TENANTS = {}; SERVICES = {};
  (B.tenants || []).forEach(t => {
    if (t.active === undefined) t.active = true;
    TENANTS[t.id] = t;
    (t.products || []).forEach(p => {
      if (p.active === undefined) p.active = true;
      PRODUCTS[p.id] = Object.assign({ tenantId: t.id }, p);
    });
  });
  (B.services || []).forEach(s => {
    if (s.active === undefined) s.active = true;
    SERVICES[s.id] = s;
  });
}
/* Public-facing catalog: identical shape, but inactive tenants/products/services
   are removed entirely — "off" means genuinely hidden from buyers, not just
   flagged. Admin (and the seller portal, for a seller's own shop) sees everything
   via the unfiltered `catalog` object so disabled items can be found and re-enabled. */
function publicCatalog(){
  const c = JSON.parse(JSON.stringify(catalog));
  c.building.tenants = (c.building.tenants || [])
    .filter(t => t.active !== false)
    .map(t => Object.assign({}, t, { products: (t.products || []).filter(p => p.active !== false) }));
  c.building.services = (c.building.services || []).filter(s => s.active !== false);
  return c;
}
async function mutateCatalog(fn){
  fn(catalog);
  await db.saveCatalog(catalog);
  indexCatalog();
}

/* ════════ storage: Postgres (production) / JSON file (dev) ════════ */
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
    CREATE TABLE IF NOT EXISTS catalog_doc (
      id INT PRIMARY KEY, data JSONB, updated_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS seller_codes (
      tenant_id TEXT PRIMARY KEY, phone TEXT, code_hash TEXT, created_at TIMESTAMPTZ DEFAULT now());
  `);
  db = {
    kind: 'postgres',
    async ready(){ await init; },
    async getCatalog(){ const r = await pool.query(`SELECT data FROM catalog_doc WHERE id=1`); return r.rows[0] ? r.rows[0].data : null; },
    async saveCatalog(doc){ await pool.query(`INSERT INTO catalog_doc (id,data,updated_at) VALUES (1,$1,now()) ON CONFLICT (id) DO UPDATE SET data=$1, updated_at=now()`, [doc]); },
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
    async ordersByTenant(tid){ return (await pool.query(`SELECT * FROM orders WHERE tenant_id=$1 ORDER BY id DESC LIMIT 200`,[tid])).rows; },
    async updateOrderStatus(ref, tid, status){
      const r = await pool.query(`UPDATE orders SET status=$3 WHERE ref=$1 AND tenant_id=$2 RETURNING *`,[ref,tid,status]);
      return r.rows[0] || null;
    },
    async allOrders(){ return (await pool.query(`SELECT * FROM orders ORDER BY id DESC LIMIT 500`)).rows; },
    async insertNotify(n){ await pool.query(`INSERT INTO notify_requests (product_id,phone) VALUES ($1,$2)`,[n.productId,n.phone]); },
    async allNotify(){ return (await pool.query(`SELECT * FROM notify_requests ORDER BY id DESC LIMIT 500`)).rows; },
    async setSellerCode(tid, phone, hash){
      await pool.query(`INSERT INTO seller_codes (tenant_id,phone,code_hash) VALUES ($1,$2,$3)
        ON CONFLICT (tenant_id) DO UPDATE SET phone=$2, code_hash=$3, created_at=now()`, [tid, phone, hash]);
    },
    async findSellerByPhone(phone){ const r = await pool.query(`SELECT * FROM seller_codes WHERE phone=$1`,[phone]); return r.rows[0]||null; },
    async deleteSellerCode(tid){ await pool.query(`DELETE FROM seller_codes WHERE tenant_id=$1`,[tid]); }
  };
} else {
  console.warn('[warn] DATABASE_URL not set — using JSON file store at ' + DATA_FILE + ' (dev only).');
  let mem = { users: [], orders: [], notify: [], sellerCodes: {}, catalog: null, seq: 1 };
  try { mem = Object.assign(mem, JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))); } catch (e) {}
  const flush = () => { try { fs.writeFileSync(DATA_FILE, JSON.stringify(mem)); } catch (e) {} };
  db = {
    kind: 'file',
    async ready(){},
    async getCatalog(){ return mem.catalog || null; },
    async saveCatalog(doc){ mem.catalog = doc; flush(); },
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
    async ordersByTenant(tid){ return mem.orders.filter(o => o.tenant_id === tid).slice(0, 200); },
    async updateOrderStatus(ref, tid, status){
      const o = mem.orders.find(x => x.ref === ref && x.tenant_id === tid);
      if (!o) return null;
      o.status = status; flush(); return o;
    },
    async allOrders(){ return mem.orders.slice(0, 500); },
    async insertNotify(n){ mem.notify.unshift({ id: mem.seq++, product_id:n.productId, phone:n.phone, created_at:new Date().toISOString() }); flush(); },
    async allNotify(){ return mem.notify.slice(0, 500); },
    async setSellerCode(tid, phone, hash){ mem.sellerCodes[tid] = { tenant_id: tid, phone, code_hash: hash }; flush(); },
    async findSellerByPhone(phone){ return Object.values(mem.sellerCodes).find(s => s.phone === phone) || null; },
    async deleteSellerCode(tid){ delete mem.sellerCodes[tid]; flush(); }
  };
}

/* ════════ SMS — AfroMessage (Ethiopia) or Twilio; logs when unconfigured ════════ */
const smsLog = [];
function normPhone(p){
  let d = ('' + (p || '')).replace(/\D/g, '');
  if (d.startsWith('0') && d.length === 10) d = '251' + d.slice(1);
  else if (d.length === 9 && d.startsWith('9')) d = '251' + d;
  return d;
}
function sendSMS(phone, text){
  const to = normPhone(phone);
  if (!to) return;
  smsLog.unshift({ to, text, ts: new Date().toISOString(), provider: process.env.SMS_PROVIDER || 'log' });
  if (smsLog.length > 200) smsLog.length = 200;
  const prov = (process.env.SMS_PROVIDER || '').toLowerCase();
  try {
    if (prov === 'afromessage' && process.env.AFROMESSAGE_TOKEN) {
      fetch('https://api.afromessage.com/api/send', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + process.env.AFROMESSAGE_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.AFROMESSAGE_FROM || '',
          sender: process.env.AFROMESSAGE_SENDER || '',
          to, message: text
        })
      }).catch(e => console.error('[sms:afromessage]', e.message));
    } else if (prov === 'twilio' && process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
      const auth = Buffer.from(process.env.TWILIO_SID + ':' + process.env.TWILIO_TOKEN).toString('base64');
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_SID}/Messages.json`, {
        method: 'POST',
        headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ From: process.env.TWILIO_FROM || '', To: '+' + to, Body: text })
      }).catch(e => console.error('[sms:twilio]', e.message));
    } else {
      console.log('[sms:log] to=' + to + ' :: ' + text);
    }
  } catch (e) { console.error('[sms]', e.message); }
}

/* ════════ sessions (HS256, httpOnly cookies; buyers and sellers separate) ════════ */
const b64u = b => Buffer.from(b).toString('base64url');
function signToken(payload, days){
  const body = Object.assign({}, payload, { exp: Date.now() + (days||30)*864e5 });
  const head = b64u(JSON.stringify({ alg:'HS256', typ:'JWT' }));
  const data = head + '.' + b64u(JSON.stringify(body));
  return data + '.' + crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
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
function readCookie(req, name){
  const raw = req.headers.cookie || '';
  const m = raw.split(/;\s*/).find(c => c.startsWith(name + '='));
  return m ? verifyToken(decodeURIComponent(m.split('=').slice(1).join('='))) : null;
}
function writeCookie(res, name, payload, days){
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    `${name}=${encodeURIComponent(signToken(payload, days))}; HttpOnly; Path=/; Max-Age=${(days||30)*86400}; SameSite=Lax${secure}`);
}
function clearCookie(res, name){
  res.setHeader('Set-Cookie', `${name}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}
const getSession = req => readCookie(req, 'amb_session');
const getSeller  = req => readCookie(req, 'amb_seller');
const sha256 = s => crypto.createHash('sha256').update(s).digest('hex');

/* ════════ order lifecycle ════════ */
const STATUS_FLOW = ['placed','confirmed','preparing','out_for_delivery','delivered','cancelled'];
const STATUS_SMS = {
  confirmed:        ref => `Ambassador: payment for order ${ref} is CONFIRMED by the seller. They are getting it ready.`,
  out_for_delivery: ref => `Ambassador: order ${ref} is OUT FOR DELIVERY. Keep your phone reachable.`,
  delivered:        ref => `Ambassador: order ${ref} marked DELIVERED. Problem with the item? Reply to the seller on WhatsApp within 24h. Thank you!`,
  cancelled:        ref => `Ambassador: order ${ref} was cancelled by the seller. Contact them on WhatsApp, or Marketplace Support 0913291265.`
};

/* ════════ order math — server is authoritative for all money ════════ */
function computeOrder(input){
  const t = TENANTS[input.tenantId];
  if (!t) throw new Error('Unknown seller');
  if (t.active === false) throw new Error(t.name + ' is currently not accepting orders');
  if (!Array.isArray(input.items) || !input.items.length) throw new Error('Empty order');
  const items = input.items.map(it => {
    const p = PRODUCTS[it.pid];
    if (!p || p.tenantId !== t.id) throw new Error('Unknown product: ' + it.pid);
    if (p.active === false) throw new Error(p.name + ' is no longer available');
    if (p.stock && p.stock.state === 'out') throw new Error(p.name + ' is sold out');
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

function notifyTelegram(o){
  if (!TG_TOKEN || !TG_CHAT) return;
  const lines = o.items.map(it => `• ${it.name}${it.variant ? ' [' + it.variant + ']' : ''} x${it.qty} — ${it.line} ETB`).join('\n');
  const text = `🛍 NEW ORDER ${o.ref}\nSeller: ${o.tenant.name} (${o.tenant.floor})\n${lines}\nTOTAL: ${o.total} ETB (incl. delivery ${o.deliveryFee} + ${o.taxLabel} ${o.tax})\nBuyer: ${o.buyer.name} ${o.buyer.phone}\n${o.buyer.method === 'pickup' ? 'Pickup' : 'Deliver: ' + o.buyer.area + ' — ' + o.buyer.addr}`;
  fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TG_CHAT, text })
  }).catch(e => console.error('[telegram]', e.message));
}

/* ════════ tenant/product normalizers (admin CRUD guarantees render-safe shapes) ════════ */
function normTenant(input, existing){
  const t = existing ? JSON.parse(JSON.stringify(existing)) : {};
  const set = (k, v) => { if (input[k] !== undefined) t[k] = input[k]; else if (t[k] === undefined) t[k] = v; };
  if (!existing) {
    t.id = ('' + (input.id || '')).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
    if (!t.id) throw new Error('Tenant id required (letters/numbers)');
  }
  set('name', 'New Shop'); set('nameAm', t.name); set('cat', 'General'); set('catKey', 'other');
  set('floor', 'Ground Floor'); set('color', '#8a1450'); set('icon', 'fa-store');
  set('whatsapp', ''); set('mobile', ''); set('owner', ''); set('manager', ''); set('tin', '');
  set('photo', ''); set('blurb', ''); set('rating', 4.8); set('reviews', 0);
  set('reviewLink', ''); set('responseTime', 'usually replies within a few hours');
  t.active = input.active !== undefined ? !!input.active : (t.active !== undefined ? t.active : true);
  if (!t.socials) t.socials = {};
  if (input.bank && input.bank.acct) {
    t.banks = [{ key:'cbe', name:'Commercial Bank of Ethiopia', acct:''+input.bank.acct, holder:input.bank.holder || t.name, color:'#5b2d8e', icon:'fa-building-columns' }];
  }
  if (!Array.isArray(t.banks) || !t.banks.length) {
    t.banks = [{ key:'cbe', name:'Commercial Bank of Ethiopia', acct:'SET-ACCOUNT-NUMBER', holder:t.name, color:'#5b2d8e', icon:'fa-building-columns' }];
  }
  if (!Array.isArray(t.products)) t.products = [];
  return t;
}
function normProduct(t, input, existing){
  const p = existing ? JSON.parse(JSON.stringify(existing)) : {};
  if (!existing) {
    let n = 1; t.products.forEach(x => { const m = ('' + x.id).match(/-(\d+)$/); if (m) n = Math.max(n, +m[1] + 1); });
    p.id = input.id || (t.id + '-' + n);
  }
  const set = (k, v) => { if (input[k] !== undefined) p[k] = input[k]; else if (p[k] === undefined) p[k] = v; };
  set('name', 'New Product'); set('cat', 'General');
  p.price = Math.max(1, parseInt(input.price !== undefined ? input.price : p.price, 10) || 1);
  set('old', null); set('badge', null); set('rating', 4.8); set('reviews', 0);
  set('img', ''); set('desc', ''); if (!p.specs) p.specs = {};
  if (!Array.isArray(p.gallery) || !p.gallery.length) p.gallery = [p.img];
  if (input.stock !== undefined) p.stock = input.stock;
  if (!p.stock) p.stock = { state:'in', label:'' };
  if (input.variant !== undefined) p.variant = input.variant;
  p.active = input.active !== undefined ? !!input.active : (p.active !== undefined ? p.active : true);
  return p;
}
function normService(input, existing){
  const s = existing ? JSON.parse(JSON.stringify(existing)) : {};
  if (!existing) {
    s.id = ('' + (input.id || 'svc-' + crypto.randomBytes(3).toString('hex'))).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  }
  const set = (k, v) => { if (input[k] !== undefined) s[k] = input[k]; else if (s[k] === undefined) s[k] = v; };
  set('name', 'New Service'); set('nameAm', s.name); set('floor', 'Ground Floor');
  set('type', 'Other'); set('icon', 'fa-concierge-bell'); set('color', '#0D7A6F');
  set('owner', ''); set('mobile', ''); set('tin', ''); set('photo', ''); set('photo2', '');
  set('blurb', ''); set('hours', ''); set('email', ''); set('established', ''); set('address', '');
  if (!s.socials) s.socials = {};
  if (!Array.isArray(s.gallery) || !s.gallery.length) s.gallery = [s.photo].filter(Boolean);
  if (!Array.isArray(s.offerings)) s.offerings = [];
  s.active = input.active !== undefined ? !!input.active : (s.active !== undefined ? s.active : true);
  return s;
}

/* ════════ app ════════ */
const app = express();
app.use(express.json({ limit: '300kb' }));
app.disable('x-powered-by');

app.get('/api/health', (req, res) => res.json({ ok: true, db: db.kind }));
app.get('/api/config', (req, res) => res.json({
  googleClientId: GOOGLE_ID || null, demoAuth: !GOOGLE_ID, building: { name: B.name }
}));
app.get('/api/catalog', (req, res) => res.json(publicCatalog()));

/* ── buyer auth ── */
app.post('/api/auth/google', async (req, res) => {
  try {
    if (!GOOGLE_ID) return res.status(400).json({ error: 'Google sign-in not configured' });
    const cred = (req.body && req.body.credential) || '';
    if (!cred) return res.status(400).json({ error: 'Missing credential' });
    const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(cred));
    if (!r.ok) return res.status(401).json({ error: 'Invalid token' });
    const info = await r.json();
    if (info.aud !== GOOGLE_ID) return res.status(401).json({ error: 'Token audience mismatch' });
    if (info.exp && Date.now() / 1000 > +info.exp) return res.status(401).json({ error: 'Token expired' });
    const user = await db.upsertUser({ sub: info.sub, name: info.name || info.email, email: info.email, picture: info.picture || '' });
    writeCookie(res, 'amb_session', { uid: user.id, sub: info.sub, name: user.name, email: user.email, picture: user.picture }, 30);
    res.json({ user: { name: user.name, email: user.email, picture: user.picture, sub: info.sub } });
  } catch (e) { res.status(500).json({ error: 'Sign-in failed' }); }
});
app.post('/api/auth/demo', async (req, res) => {
  if (GOOGLE_ID && process.env.ALLOW_DEMO !== '1') return res.status(403).json({ error: 'Demo auth disabled' });
  const sub = 'demo-' + crypto.randomBytes(6).toString('hex');
  const name = ((req.body && req.body.name) || 'Guest Shopper').slice(0, 60);
  const user = await db.upsertUser({ sub, name, email: name.toLowerCase().replace(/\s+/g, '.') + '@demo.local', picture: '' });
  writeCookie(res, 'amb_session', { uid: user.id, sub, name: user.name, email: user.email, picture: '' }, 30);
  res.json({ user: { name: user.name, email: user.email, picture: '', sub }, demo: true });
});
app.get('/api/auth/me', (req, res) => {
  const s = getSession(req);
  res.json({ user: s ? { name: s.name, email: s.email, picture: s.picture || '', sub: s.sub } : null });
});
app.post('/api/auth/logout', (req, res) => { clearCookie(res, 'amb_session'); res.json({ ok: true }); });

/* ── orders ── */
app.post('/api/orders', async (req, res) => {
  try {
    const order = computeOrder(req.body || {});
    const s = getSession(req);
    order.userId = s ? s.uid : null;
    await db.insertOrder(order);
    notifyTelegram(order);
    // buyer SMS confirmation
    sendSMS(order.buyer.phone,
      `Ambassador: order ${order.ref} placed with ${order.tenant.name}. Total ${order.total} ETB ` +
      `(incl. delivery+${order.taxLabel}). Pay to ${order.bank.name} ${order.bank.acct} (${order.bank.holder}), ` +
      `then send proof on WhatsApp. You'll get SMS updates as it progresses.`);
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

/* ════════ SELLER PORTAL (phone + access code) ════════ */
app.post('/api/seller/login', async (req, res) => {
  const phone = normPhone((req.body && req.body.phone) || '');
  const code  = ('' + ((req.body && req.body.code) || '')).trim();
  if (!phone || !code) return res.status(400).json({ error: 'Phone and access code required' });
  const row = await db.findSellerByPhone(phone);
  if (!row || row.code_hash !== sha256(code)) return res.status(401).json({ error: 'Wrong phone or access code' });
  const t = TENANTS[row.tenant_id];
  if (!t) return res.status(401).json({ error: 'Shop not found' });
  writeCookie(res, 'amb_seller', { role: 'seller', tid: t.id, name: t.name }, 30);
  res.json({ tenant: { id: t.id, name: t.name, floor: t.floor } });
});
app.post('/api/seller/logout', (req, res) => { clearCookie(res, 'amb_seller'); res.json({ ok: true }); });
function requireSeller(req, res, next){
  const s = getSeller(req);
  if (!s || s.role !== 'seller' || !TENANTS[s.tid]) return res.status(401).json({ error: 'Please sign in' });
  req.sellerTid = s.tid; next();
}
app.get('/api/seller/me', requireSeller, (req, res) => {
  const t = TENANTS[req.sellerTid];
  res.json({ tenant: { id: t.id, name: t.name, floor: t.floor, cat: t.cat } });
});
app.get('/api/seller/orders', requireSeller, async (req, res) => {
  res.json({ orders: await db.ordersByTenant(req.sellerTid), statuses: STATUS_FLOW });
});
app.post('/api/seller/order-status', requireSeller, async (req, res) => {
  const ref = (req.body && req.body.ref) || '';
  const status = (req.body && req.body.status) || '';
  if (STATUS_FLOW.indexOf(status) < 0) return res.status(400).json({ error: 'Invalid status' });
  const row = await db.updateOrderStatus(ref, req.sellerTid, status);
  if (!row) return res.status(404).json({ error: 'Order not found' });
  const buyerPhone = row.buyer && row.buyer.phone;
  if (buyerPhone && STATUS_SMS[status]) sendSMS(buyerPhone, STATUS_SMS[status](ref));
  res.json({ order: row });
});
app.post('/api/seller/product', requireSeller, async (req, res) => {
  // sellers can update price, stock, and on/off (active) of their OWN products
  const pid = (req.body && req.body.pid) || '';
  const p = PRODUCTS[pid];
  if (!p || p.tenantId !== req.sellerTid) return res.status(404).json({ error: 'Product not found' });
  const price = req.body.price !== undefined ? Math.max(1, parseInt(req.body.price, 10) || p.price) : undefined;
  const stock = req.body.stock;
  const active = typeof req.body.active === 'boolean' ? req.body.active : undefined;
  if (stock && ['in','low','made','out'].indexOf(stock.state) < 0) return res.status(400).json({ error: 'Invalid stock state' });
  await mutateCatalog(c => {
    const t = c.building.tenants.find(x => x.id === req.sellerTid);
    const prod = t.products.find(x => x.id === pid);
    if (price !== undefined) prod.price = price;
    if (stock) prod.stock = { state: stock.state, label: ('' + (stock.label || '')).slice(0, 6) };
    if (active !== undefined) prod.active = active;
  });
  res.json({ ok: true, product: PRODUCTS[pid] });
});

/* ════════ ADMIN (x-admin-key) — catalog CRUD + seller codes ════════ */
function requireAdmin(req, res, next){
  if (!ADMIN_KEY) return res.status(503).json({ error: 'Admin not configured' });
  if ((req.headers['x-admin-key'] || req.query.key) !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
app.get('/api/admin/orders', requireAdmin, async (req, res) => res.json({ orders: await db.allOrders() }));
app.get('/api/admin/notify', requireAdmin, async (req, res) => res.json({ requests: await db.allNotify() }));
app.get('/api/admin/sms',    requireAdmin, (req, res) => res.json({ messages: smsLog }));
app.get('/api/admin/catalog', requireAdmin, (req, res) => res.json(catalog));

app.post('/api/admin/seller-code', requireAdmin, async (req, res) => {
  const tid = (req.body && req.body.tenantId) || '';
  const phone = normPhone((req.body && req.body.phone) || '');
  if (!TENANTS[tid]) return res.status(404).json({ error: 'Unknown tenant' });
  if (!phone) return res.status(400).json({ error: 'Valid phone required' });
  const code = ('' + (crypto.randomInt(100000, 999999)));
  await db.setSellerCode(tid, phone, sha256(code));
  res.json({ tenantId: tid, phone, code });   // shown ONCE — only the hash is stored
});

app.put('/api/admin/tenant', requireAdmin, async (req, res) => {
  try {
    const input = (req.body && req.body.tenant) || {};
    const existing = input.id ? TENANTS[('' + input.id).toLowerCase()] : null;
    const t = normTenant(input, existing);
    await mutateCatalog(c => {
      const i = c.building.tenants.findIndex(x => x.id === t.id);
      if (i >= 0) c.building.tenants[i] = t; else c.building.tenants.push(t);
    });
    res.json({ tenant: TENANTS[t.id] });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/tenant/:id', requireAdmin, async (req, res) => {
  const tid = req.params.id;
  if (!TENANTS[tid]) return res.status(404).json({ error: 'Unknown tenant' });
  await mutateCatalog(c => { c.building.tenants = c.building.tenants.filter(x => x.id !== tid); });
  await db.deleteSellerCode(tid);
  res.json({ ok: true });
});
app.put('/api/admin/product', requireAdmin, async (req, res) => {
  try {
    const tid = (req.body && req.body.tenantId) || '';
    const input = (req.body && req.body.product) || {};
    if (!TENANTS[tid]) return res.status(404).json({ error: 'Unknown tenant' });
    let saved;
    await mutateCatalog(c => {
      const t = c.building.tenants.find(x => x.id === tid);
      const existing = input.id ? t.products.find(x => x.id === input.id) : null;
      const p = normProduct(t, input, existing);
      const i = t.products.findIndex(x => x.id === p.id);
      if (i >= 0) t.products[i] = p; else t.products.push(p);
      saved = p;
    });
    res.json({ product: saved });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/product/:pid', requireAdmin, async (req, res) => {
  const p = PRODUCTS[req.params.pid];
  if (!p) return res.status(404).json({ error: 'Unknown product' });
  await mutateCatalog(c => {
    const t = c.building.tenants.find(x => x.id === p.tenantId);
    t.products = t.products.filter(x => x.id !== req.params.pid);
  });
  res.json({ ok: true });
});

/* ── on/off toggles: hide a tenant, product, or service from the public
   storefront instantly, without deleting it — flip it back on the same way.
   These are what power the "enable/disable easily" admin controls across
   Our Sellers, On Sale Now, Shop All Products and Building Services. ── */
app.post('/api/admin/tenant/:id/toggle', requireAdmin, async (req, res) => {
  const t = TENANTS[req.params.id];
  if (!t) return res.status(404).json({ error: 'Unknown tenant' });
  const next = req.body && typeof req.body.active === 'boolean' ? req.body.active : !t.active;
  await mutateCatalog(c => { c.building.tenants.find(x => x.id === req.params.id).active = next; });
  res.json({ tenant: TENANTS[req.params.id] });
});
app.post('/api/admin/product/:pid/toggle', requireAdmin, async (req, res) => {
  const p = PRODUCTS[req.params.pid];
  if (!p) return res.status(404).json({ error: 'Unknown product' });
  const next = req.body && typeof req.body.active === 'boolean' ? req.body.active : !p.active;
  await mutateCatalog(c => {
    const t = c.building.tenants.find(x => x.id === p.tenantId);
    t.products.find(x => x.id === req.params.pid).active = next;
  });
  res.json({ product: PRODUCTS[req.params.pid] });
});
app.post('/api/admin/service/:id/toggle', requireAdmin, async (req, res) => {
  const s = SERVICES[req.params.id];
  if (!s) return res.status(404).json({ error: 'Unknown service' });
  const next = req.body && typeof req.body.active === 'boolean' ? req.body.active : !s.active;
  await mutateCatalog(c => {
    if (!Array.isArray(c.building.services)) c.building.services = [];
    c.building.services.find(x => x.id === req.params.id).active = next;
  });
  res.json({ service: SERVICES[req.params.id] });
});

/* ── admin: services CRUD (Building Services section) ── */
app.put('/api/admin/service', requireAdmin, async (req, res) => {
  try {
    const input = (req.body && req.body.service) || {};
    const existing = input.id ? SERVICES[('' + input.id).toLowerCase()] : null;
    const s = normService(input, existing);
    await mutateCatalog(c => {
      if (!Array.isArray(c.building.services)) c.building.services = [];
      const i = c.building.services.findIndex(x => x.id === s.id);
      if (i >= 0) c.building.services[i] = s; else c.building.services.push(s);
    });
    res.json({ service: SERVICES[s.id] });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/service/:id', requireAdmin, async (req, res) => {
  if (!SERVICES[req.params.id]) return res.status(404).json({ error: 'Unknown service' });
  await mutateCatalog(c => { c.building.services = (c.building.services || []).filter(x => x.id !== req.params.id); });
  res.json({ ok: true });
});

/* ── static frontend ── */
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h', index: 'index.html' }));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

/* ── boot: load catalog from DB (seed on first run), then listen ── */
db.ready()
  .then(() => db.getCatalog())
  .then(doc => {
    if (doc) { catalog = doc; return; }
    catalog = SEED;
    return db.saveCatalog(catalog).then(() => console.log('[catalog] seeded database from catalog.json'));
  })
  .then(() => {
    indexCatalog();
    app.listen(PORT, () => console.log(`Ambassador store v2 on :${PORT} (db: ${db.kind}, sms: ${process.env.SMS_PROVIDER || 'log-only'})`));
  })
  .catch(e => { console.error('Boot failed:', e); process.exit(1); });
