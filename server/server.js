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
/* ── E-COMMERCE HOLD ──
   Checkout/order placement is paused while Ambassador's real tenant
   directory is being rolled out — the storefront is directory + seller
   self-listing only for now. Flip CHECKOUT_ENABLED=true in the environment
   whenever real online ordering is ready to go live; no code change needed. */
const CHECKOUT_ENABLED = /^true$/i.test(process.env.CHECKOUT_ENABLED || '');
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
  if (!B.commission || typeof B.commission.rate !== 'number') B.commission = { rate: 0.02 };  // Bisinka's 2% platform commission
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
  // computed BEFORE filtering, so the storefront can show a true "X of Y shops"
  // per floor without ever revealing which specific tenant is currently off
  const floorStats = {};
  (c.building.tenants || []).forEach(t => {
    if (!floorStats[t.floor]) floorStats[t.floor] = { total: 0, active: 0 };
    floorStats[t.floor].total++;
    if (t.active !== false) floorStats[t.floor].active++;
  });
  c.building.floorStats = floorStats;
  c.building.tenants = (c.building.tenants || [])
    .filter(t => t.active !== false)
    .map(t => Object.assign({}, t, { products: (t.products || []).filter(p => p.active !== false) }));
  c.building.services = (c.building.services || []).filter(s => s.active !== false);
  c.services = c.building.services;   // the frontend reads the top-level copy — keep it in sync so toggles/hides/edits apply
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
      status TEXT DEFAULT 'placed', payment_method TEXT DEFAULT 'bank_transfer', payment_ref TEXT,
      created_at TIMESTAMPTZ DEFAULT now());
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'bank_transfer';
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_ref TEXT;
    CREATE TABLE IF NOT EXISTS notify_requests (
      id SERIAL PRIMARY KEY, product_id TEXT, phone TEXT, created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS catalog_doc (
      id INT PRIMARY KEY, data JSONB, updated_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS seller_codes (
      tenant_id TEXT PRIMARY KEY, phone TEXT, code_hash TEXT, created_at TIMESTAMPTZ DEFAULT now());

    -- ═══ Ambassador BMS (building management) ═══
    CREATE TABLE IF NOT EXISTS leases (
      unit TEXT PRIMARY KEY, tenant_id TEXT, start_date TEXT, end_date TEXT,
      cycle_months INT DEFAULT 1, first_period_months INT DEFAULT 1, first_done BOOLEAN DEFAULT false,
      next_due TEXT, deposit INT DEFAULT 0, rent INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS bms_invoices (
      id TEXT PRIMARY KEY, unit TEXT, period_start TEXT, period_end TEXT, period_months INT,
      due_date TEXT, amount INT, status TEXT DEFAULT 'due', paid_at TEXT, method TEXT, ref TEXT,
      penalty_paid INT DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS bms_finance (
      id TEXT PRIMARY KEY, type TEXT, date TEXT, category TEXT, amount INT, note TEXT, unit TEXT,
      created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS bms_tickets (
      id TEXT PRIMARY KEY, title TEXT, loc TEXT, cat TEXT, pri TEXT, asg TEXT, status TEXT DEFAULT 'open',
      created TEXT, done_at TEXT);
    CREATE TABLE IF NOT EXISTS bms_announcements (
      id TEXT PRIMARY KEY, title TEXT, aud TEXT, body TEXT, at TEXT);
    CREATE TABLE IF NOT EXISTS bms_config (
      id INT PRIMARY KEY, data JSONB, updated_at TIMESTAMPTZ DEFAULT now());
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
        `INSERT INTO orders (ref,tenant_id,user_id,buyer,items,bank,subtotal,delivery_fee,tax,total,status,payment_method,payment_ref)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [o.ref,o.tenant.id,o.userId||null,o.buyer,JSON.stringify(o.items),o.bank,o.subtotal,o.deliveryFee,o.tax,o.total,o.status,o.paymentMethod||'bank_transfer',o.paymentRef||null]);
    },
    async ordersByUser(uid){ return (await pool.query(`SELECT * FROM orders WHERE user_id=$1 ORDER BY id DESC LIMIT 50`,[uid])).rows; },
    async ordersByPhone(ph){ return (await pool.query(`SELECT * FROM orders WHERE buyer->>'phone'=$1 ORDER BY id DESC LIMIT 50`,[ph])).rows; },
    async ordersByTenant(tid){ return (await pool.query(`SELECT * FROM orders WHERE tenant_id=$1 ORDER BY id DESC LIMIT 200`,[tid])).rows; },
    async updateOrderStatus(ref, tid, status){
      const r = await pool.query(`UPDATE orders SET status=$3 WHERE ref=$1 AND tenant_id=$2 RETURNING *`,[ref,tid,status]);
      return r.rows[0] || null;
    },
    async orderByRef(ref){ const r = await pool.query(`SELECT * FROM orders WHERE ref=$1`,[ref]); return r.rows[0] || null; },
    async setOrderPayment(ref, patch){
      const r = await pool.query(
        `UPDATE orders SET payment_method=$2, payment_ref=$3, status=COALESCE($4,status) WHERE ref=$1 RETURNING *`,
        [ref, patch.method||null, patch.providerRef||null, patch.status||null]);
      return r.rows[0] || null;
    },
    async allOrders(){ return (await pool.query(`SELECT * FROM orders ORDER BY id DESC LIMIT 500`)).rows; },
    async ordersInRange(fromISO, toISO){
      return (await pool.query(
        `SELECT * FROM orders WHERE created_at >= $1 AND created_at < $2 ORDER BY created_at ASC LIMIT 20000`,
        [fromISO, toISO])).rows;
    },
    async insertNotify(n){ await pool.query(`INSERT INTO notify_requests (product_id,phone) VALUES ($1,$2)`,[n.productId,n.phone]); },
    async allNotify(){ return (await pool.query(`SELECT * FROM notify_requests ORDER BY id DESC LIMIT 500`)).rows; },
    async setSellerCode(tid, phone, hash){
      await pool.query(`INSERT INTO seller_codes (tenant_id,phone,code_hash) VALUES ($1,$2,$3)
        ON CONFLICT (tenant_id) DO UPDATE SET phone=$2, code_hash=$3, created_at=now()`, [tid, phone, hash]);
    },
    async findSellerByPhone(phone){ const r = await pool.query(`SELECT * FROM seller_codes WHERE phone=$1`,[phone]); return r.rows[0]||null; },
    async deleteSellerCode(tid){ await pool.query(`DELETE FROM seller_codes WHERE tenant_id=$1`,[tid]); },

    // ── BMS ──
    async allLeases(){ return (await pool.query(`SELECT * FROM leases ORDER BY unit`)).rows; },
    async leaseByUnit(unit){ const r = await pool.query(`SELECT * FROM leases WHERE unit=$1`,[unit]); return r.rows[0]||null; },
    async upsertLease(l){
      await pool.query(
        `INSERT INTO leases (unit,tenant_id,start_date,end_date,cycle_months,first_period_months,first_done,next_due,deposit,rent)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (unit) DO UPDATE SET tenant_id=$2,start_date=$3,end_date=$4,cycle_months=$5,first_period_months=$6,first_done=$7,next_due=$8,deposit=$9,rent=$10`,
        [l.unit,l.tenantId||null,l.start,l.end,l.cycleMonths,l.firstPeriodMonths,l.firstDone,l.nextDue,l.deposit||0,l.rent||0]);
    },
    async deleteLease(unit){ await pool.query(`DELETE FROM leases WHERE unit=$1`,[unit]); },

    async allInvoices(){ return (await pool.query(`SELECT * FROM bms_invoices ORDER BY due_date DESC LIMIT 1000`)).rows; },
    async invoicesByUnit(unit){ return (await pool.query(`SELECT * FROM bms_invoices WHERE unit=$1 ORDER BY due_date DESC`,[unit])).rows; },
    async insertInvoice(i){
      await pool.query(
        `INSERT INTO bms_invoices (id,unit,period_start,period_end,period_months,due_date,amount,status,paid_at,method,ref,penalty_paid)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [i.id,i.unit,i.periodStart,i.periodEnd,i.periodMonths,i.dueDate,i.amount,i.status||'due',i.paidAt||null,i.method||null,i.ref||null,i.penaltyPaid||0]);
    },
    async updateInvoice(id, patch){
      const r = await pool.query(`SELECT * FROM bms_invoices WHERE id=$1`,[id]); if (!r.rows[0]) return null;
      const row = Object.assign({}, r.rows[0], patch);
      await pool.query(`UPDATE bms_invoices SET status=$2,paid_at=$3,method=$4,ref=$5,penalty_paid=$6 WHERE id=$1`,
        [id, row.status, row.paid_at, row.method, row.ref, row.penalty_paid]);
      return row;
    },
    async markInvoicesOverdue(today){
      const r = await pool.query(`UPDATE bms_invoices SET status='overdue' WHERE status='due' AND due_date<$1 RETURNING id`,[today]);
      return r.rows.length;
    },

    async allFinance(){ return (await pool.query(`SELECT * FROM bms_finance ORDER BY date DESC LIMIT 1000`)).rows; },
    async insertFinance(e){
      await pool.query(`INSERT INTO bms_finance (id,type,date,category,amount,note,unit) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [e.id,e.type,e.date,e.category,e.amount,e.note||'',e.unit||null]);
    },
    async deleteFinance(id){ await pool.query(`DELETE FROM bms_finance WHERE id=$1`,[id]); },

    async allTickets(){ return (await pool.query(`SELECT * FROM bms_tickets ORDER BY created DESC LIMIT 500`)).rows; },
    async insertTicket(tk){
      await pool.query(`INSERT INTO bms_tickets (id,title,loc,cat,pri,asg,status,created,done_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [tk.id,tk.title,tk.loc,tk.cat,tk.pri,tk.asg||'',tk.status||'open',tk.created,tk.doneAt||null]);
    },
    async updateTicketStatus(id, status, doneAt){
      const r = await pool.query(`UPDATE bms_tickets SET status=$2, done_at=$3 WHERE id=$1 RETURNING *`,[id,status,doneAt||null]);
      return r.rows[0]||null;
    },

    async allAnnouncements(){ return (await pool.query(`SELECT * FROM bms_announcements ORDER BY at DESC LIMIT 200`)).rows; },
    async insertAnnouncement(a){
      await pool.query(`INSERT INTO bms_announcements (id,title,aud,body,at) VALUES ($1,$2,$3,$4,$5)`,[a.id,a.title,a.aud,a.body,a.at]);
    },
    async deleteAnnouncement(id){ await pool.query(`DELETE FROM bms_announcements WHERE id=$1`,[id]); },

    async getBmsConfig(){ const r = await pool.query(`SELECT data FROM bms_config WHERE id=1`); return r.rows[0]?r.rows[0].data:null; },
    async saveBmsConfig(doc){ await pool.query(`INSERT INTO bms_config (id,data,updated_at) VALUES (1,$1,now()) ON CONFLICT (id) DO UPDATE SET data=$1, updated_at=now()`,[doc]); }
  };
} else {
  console.warn('[warn] DATABASE_URL not set — using JSON file store at ' + DATA_FILE + ' (dev only).');
  let mem = { users: [], orders: [], notify: [], sellerCodes: {}, catalog: null, seq: 1,
    leases: [], invoices: [], finance: [], tickets: [], announcements: [], bmsConfig: null };
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
        tax:o.tax, total:o.total, status:o.status, payment_method:o.paymentMethod||'bank_transfer',
        payment_ref:o.paymentRef||null, created_at:new Date().toISOString() });
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
    async orderByRef(ref){ return mem.orders.find(x => x.ref === ref) || null; },
    async setOrderPayment(ref, patch){
      const o = mem.orders.find(x => x.ref === ref);
      if (!o) return null;
      if (patch.method) o.payment_method = patch.method;
      if (patch.providerRef) o.payment_ref = patch.providerRef;
      if (patch.status) o.status = patch.status;
      flush(); return o;
    },
    async allOrders(){ return mem.orders.slice(0, 500); },
    async ordersInRange(fromISO, toISO){
      const f = new Date(fromISO).getTime(), t = new Date(toISO).getTime();
      return mem.orders.filter(o => {
        const ts = new Date(o.created_at || o.date).getTime();
        return ts >= f && ts < t;
      }).sort((a, b) => new Date(a.created_at||a.date) - new Date(b.created_at||b.date));
    },
    async insertNotify(n){ mem.notify.unshift({ id: mem.seq++, product_id:n.productId, phone:n.phone, created_at:new Date().toISOString() }); flush(); },
    async allNotify(){ return mem.notify.slice(0, 500); },
    async setSellerCode(tid, phone, hash){ mem.sellerCodes[tid] = { tenant_id: tid, phone, code_hash: hash }; flush(); },
    async findSellerByPhone(phone){ return Object.values(mem.sellerCodes).find(s => s.phone === phone) || null; },
    async deleteSellerCode(tid){ delete mem.sellerCodes[tid]; flush(); },

    // ── BMS ──
    async allLeases(){ return mem.leases; },
    async leaseByUnit(unit){ return mem.leases.find(l => l.unit === unit) || null; },
    async upsertLease(l){
      const row = { unit:l.unit, tenant_id:l.tenantId||null, start_date:l.start, end_date:l.end,
        cycle_months:l.cycleMonths, first_period_months:l.firstPeriodMonths, first_done:l.firstDone,
        next_due:l.nextDue, deposit:l.deposit||0, rent:l.rent||0 };
      const i = mem.leases.findIndex(x => x.unit === l.unit);
      if (i >= 0) mem.leases[i] = row; else mem.leases.push(row);
      flush();
    },
    async deleteLease(unit){ mem.leases = mem.leases.filter(l => l.unit !== unit); flush(); },

    async allInvoices(){ return mem.invoices.slice().sort((a,b) => (b.due_date||'').localeCompare(a.due_date||'')).slice(0,1000); },
    async invoicesByUnit(unit){ return mem.invoices.filter(i => i.unit === unit).sort((a,b) => (b.due_date||'').localeCompare(a.due_date||'')); },
    async insertInvoice(i){
      mem.invoices.push({ id:i.id, unit:i.unit, period_start:i.periodStart, period_end:i.periodEnd,
        period_months:i.periodMonths, due_date:i.dueDate, amount:i.amount, status:i.status||'due',
        paid_at:i.paidAt||null, method:i.method||null, ref:i.ref||null, penalty_paid:i.penaltyPaid||0 });
      flush();
    },
    async updateInvoice(id, patch){
      const row = mem.invoices.find(x => x.id === id); if (!row) return null;
      Object.assign(row, patch); flush(); return row;
    },
    async markInvoicesOverdue(today){
      let n = 0; mem.invoices.forEach(i => { if (i.status === 'due' && i.due_date < today) { i.status = 'overdue'; n++; } });
      if (n) flush(); return n;
    },

    async allFinance(){ return mem.finance.slice().sort((a,b) => (b.date||'').localeCompare(a.date||'')).slice(0,1000); },
    async insertFinance(e){
      mem.finance.push({ id:e.id, type:e.type, date:e.date, category:e.category, amount:e.amount, note:e.note||'', unit:e.unit||null });
      flush();
    },
    async deleteFinance(id){ mem.finance = mem.finance.filter(e => e.id !== id); flush(); },

    async allTickets(){ return mem.tickets.slice().sort((a,b) => (b.created||'').localeCompare(a.created||'')).slice(0,500); },
    async insertTicket(tk){
      mem.tickets.push({ id:tk.id, title:tk.title, loc:tk.loc, cat:tk.cat, pri:tk.pri, asg:tk.asg||'',
        status:tk.status||'open', created:tk.created, done_at:tk.doneAt||null });
      flush();
    },
    async updateTicketStatus(id, status, doneAt){
      const row = mem.tickets.find(t => t.id === id); if (!row) return null;
      row.status = status; row.done_at = doneAt || null; flush(); return row;
    },

    async allAnnouncements(){ return mem.announcements.slice().sort((a,b) => (b.at||'').localeCompare(a.at||'')).slice(0,200); },
    async insertAnnouncement(a){
      mem.announcements.push({ id:a.id, title:a.title, aud:a.aud, body:a.body, at:a.at });
      flush();
    },
    async deleteAnnouncement(id){ mem.announcements = mem.announcements.filter(a => a.id !== id); flush(); },

    async getBmsConfig(){ return mem.bmsConfig; },
    async saveBmsConfig(doc){ mem.bmsConfig = doc; flush(); }
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

/* ════════ CHAPA — hosted checkout (card, mobile money, bank) ════════
   Real integration against Chapa's documented API (api.chapa.co). Needs
   CHAPA_SECRET_KEY to actually charge anyone; without it, the endpoint
   below returns a clear "not configured" error so the frontend can fall
   back to manual bank transfer — never a fake success. */
const CHAPA_BASE = 'https://api.chapa.co/v1';
async function chapaInit(order, callbackUrl, returnUrl){
  const key = process.env.CHAPA_SECRET_KEY;
  if (!key) { const e = new Error('Chapa is not configured on this deployment yet'); e.code = 'CHAPA_NOT_CONFIGURED'; throw e; }
  const [first, ...rest] = (order.buyer.name || 'Buyer').trim().split(/\s+/);
  const body = {
    amount: String(order.total), currency: 'ETB', tx_ref: order.ref,
    first_name: first || 'Buyer', last_name: rest.join(' ') || order.tenant.name,
    phone_number: normPhone(order.buyer.phone) || undefined,
    callback_url: callbackUrl, return_url: returnUrl,
    customization: { title: 'Ambassador Mall', description: 'Order ' + order.ref + ' — ' + order.tenant.name }
  };
  const r = await fetch(CHAPA_BASE + '/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data || data.status !== 'success' || !data.data || !data.data.checkout_url) {
    throw new Error((data && data.message) || 'Chapa could not start this payment');
  }
  return data.data.checkout_url;
}
async function chapaVerify(txRef){
  const key = process.env.CHAPA_SECRET_KEY;
  if (!key) return null;
  const r = await fetch(CHAPA_BASE + '/transaction/verify/' + encodeURIComponent(txRef), {
    headers: { Authorization: 'Bearer ' + key }
  });
  const data = await r.json().catch(() => null);
  return (data && data.status === 'success' && data.data) ? data.data : null;
}

/* ════════ USSD PUSH — generic seam for a bank/telco push-payment API ════════
   Real USSD push (buyer gets a prompt on their phone to approve a debit,
   no app or redirect needed) requires a signed agreement with a specific
   bank or aggregator — there is no universal public API. This wraps a
   configurable HTTP call so plugging in a real provider is a config
   change, not a code change; logs (like SMS) when unconfigured, and is
   always honest with the buyer about which happened. */
const ussdLog = [];
async function ussdPush(order){
  const url = process.env.USSD_API_URL, apiKey = process.env.USSD_API_KEY;
  const provider = process.env.USSD_PROVIDER || '';
  const entry = { ref: order.ref, phone: normPhone(order.buyer.phone), amount: order.total, provider: provider || 'log', ts: new Date().toISOString(), ok: false };
  if (!provider || !url) {
    ussdLog.unshift(Object.assign(entry, { note: 'USSD_PROVIDER/USSD_API_URL not set — logged only' }));
    if (ussdLog.length > 200) ussdLog.length = 200;
    const e = new Error('USSD push is not configured on this deployment yet'); e.code = 'USSD_NOT_CONFIGURED'; throw e;
  }
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, apiKey ? { Authorization: 'Bearer ' + apiKey } : {}),
      body: JSON.stringify({ phone: entry.phone, amount: order.total, reference: order.ref, narration: 'Ambassador Mall order ' + order.ref })
    });
    const data = await r.json().catch(() => ({}));
    entry.ok = r.ok;
    entry.providerRef = data.reference || data.id || null;
    ussdLog.unshift(entry); if (ussdLog.length > 200) ussdLog.length = 200;
    if (!r.ok) throw new Error(data.message || 'Provider rejected the USSD push request');
    return entry.providerRef;
  } catch (e) {
    if (!ussdLog.includes(entry)) { ussdLog.unshift(entry); if (ussdLog.length > 200) ussdLog.length = 200; }
    throw e;
  }
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

  const paymentMethod = ['bank_transfer', 'chapa', 'ussd'].indexOf(input.paymentMethod) >= 0 ? input.paymentMethod : 'bank_transfer';
  let bank = null;
  if (paymentMethod === 'bank_transfer') {
    bank = (t.banks || []).find(b => b.key === input.bankKey);
    if (!bank) throw new Error('Please choose how to pay');
  } else if (paymentMethod === 'ussd') {
    // USSD push still debits toward one of the tenant's real bank/mobile-money accounts
    bank = (t.banks || []).find(b => b.key === input.bankKey) || (t.banks || [])[0] || null;
  }

  const ref = 'AMB-' + t.id.toUpperCase().slice(0, 3) + '-' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();
  return {
    ref, date: new Date().toISOString(), building: B.name,
    tenant: { id: t.id, name: t.name, floor: t.floor, whatsapp: t.whatsapp, owner: t.owner, mobile: t.mobile },
    buyer: {
      name: ('' + (buyer.name || '')).slice(0, 80), phone: ('' + (buyer.phone || '')).slice(0, 25),
      method, area: area ? area.name : '', addr: ('' + (buyer.addr || '')).slice(0, 200), geo: ('' + (buyer.geo || '')).slice(0, 120)
    },
    items, bank: bank ? { name: bank.name, acct: bank.acct, holder: bank.holder } : null,
    subtotal, deliveryFee: fee, tax, taxLabel: (B.tax && B.tax.label) || 'VAT', taxRate: rate, total,
    paymentMethod, paymentRef: null,
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
/* an image reference is either an http(s) URL or an inline data-URL (max ~1.5MB each) */
function isImageRef(v){
  if (typeof v !== 'string' || !v) return false;
  if (/^https?:\/\//i.test(v)) return v.length <= 2000;
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(v)) return v.length <= 1.6 * 1024 * 1024;
  return false;
}
function normTenant(input, existing){
  const t = existing ? JSON.parse(JSON.stringify(existing)) : {};
  const set = (k, v) => { if (input[k] !== undefined) t[k] = input[k]; else if (t[k] === undefined) t[k] = v; };
  if (!existing) {
    t.id = ('' + (input.id || '')).toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
    if (!t.id) throw new Error('Tenant id required (letters/numbers)');
  }
  set('name', 'New Shop'); set('nameAm', t.name); set('cat', 'General'); set('catKey', 'other');
  set('floor', 'Ground Floor'); set('color', '#8a1450'); set('icon', 'fa-store');
  set('unit', t.id.toUpperCase());
  set('whatsapp', ''); set('mobile', ''); set('owner', ''); set('manager', '');
  set('photo', ''); set('blurb', ''); set('rating', 0); set('reviews', 0);
  set('reviewLink', ''); set('responseTime', '');
  t.active = input.active !== undefined ? !!input.active : (t.active !== undefined ? t.active : true);
  t.hidden = input.hidden !== undefined ? !!input.hidden : !!t.hidden;
  if (input.socials && typeof input.socials === 'object') {
    // each platform is stored as { value, on } so a link can be turned off
    // without losing it; a plain string is still accepted for convenience
    // and normalized into the same shape.
    const soc = {};
    ['telegram','facebook','instagram','tiktok','whatsapp','youtube','pinterest','linkedin','x','snapchat','website','email'].forEach(k => {
      const entry = input.socials[k];
      if (!entry) return;
      const value = ('' + (typeof entry === 'object' ? entry.value : entry) || '').trim().slice(0, 200);
      if (!value) return;
      const on = typeof entry === 'object' ? entry.on !== false : true;
      soc[k] = { value, on };
    });
    t.socials = soc;
  }
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
  p.hidden = input.hidden !== undefined ? !!input.hidden : !!p.hidden;
  if (Array.isArray(input.gallery)) {
    const g = input.gallery.filter(isImageRef).slice(0, 3);
    if (g.length) { p.gallery = g; p.img = g[0]; }   // keep existing images if every submitted ref was invalid
  }
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
  s.hidden = input.hidden !== undefined ? !!input.hidden : !!s.hidden;
  if (Array.isArray(input.photos)) { const ph = input.photos.filter(isImageRef).slice(0, 2); if (ph[0]) s.photo = ph[0]; if (ph[1]) s.photo2 = ph[1]; }
  return s;
}

/* ════════════════════════════════════════════════════════════════
   AMBASSADOR BMS — leases, billing, finance, maintenance, announcements.
   Real database-backed building management, sharing the same live
   catalog as the storefront (a tenant here IS the tenant in the store —
   there is no separate copy to fall out of sync).
═══════════════════════════════════════════════════════════════════ */
function bIso(d){ return new Date(d).toISOString().slice(0, 10); }
function bDateOnly(d){ const x = new Date(d); x.setHours(0,0,0,0); return x; }
function bAddMonths(d, n){ const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }
function defaultBmsConfig(){
  return {
    penalty: { amount: 200, per: 'day' },
    accounts: [
      { bank: 'Bank of Abyssinia', number: '1000123456789', holder: 'Ambassador Mall PLC' },
      { bank: 'Commercial Bank of Ethiopia', number: '1000987654321', holder: 'Ambassador Mall PLC' }
    ]
  };
}
async function getBmsConfigSafe(){ return (await db.getBmsConfig()) || defaultBmsConfig(); }

/* generate any invoices a lease is behind on, as of `asOf` — mutates the
   in-memory lease object's nextDue/firstDone and returns the new invoice
   rows (not yet persisted; caller inserts them) */
function generateInvoicesForLease(lease, rent, asOf){
  const out = [];
  let guard = 0;
  while (bDateOnly(lease.nextDue) <= bDateOnly(asOf) && guard < 60) {
    guard++;
    const periodMonths = lease.firstDone ? lease.cycleMonths : lease.firstPeriodMonths;
    const periodStart = lease.nextDue;
    const periodEnd = bIso(bAddMonths(new Date(periodStart), periodMonths));
    out.push({
      id: 'INV-' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase(),
      unit: lease.unit, periodStart, periodEnd, periodMonths, dueDate: periodStart,
      amount: rent * periodMonths, status: 'due'
    });
    lease.nextDue = periodEnd;
    lease.firstDone = true;
  }
  return out;
}
function bDaysLate(inv){
  if (inv.status === 'paid') return 0;
  const diff = Math.round((bDateOnly(new Date()) - bDateOnly(inv.due_date)) / 86400000);
  return diff > 0 ? diff : 0;
}
function bPenaltyOf(inv, config){
  if (inv.status === 'paid') return inv.penalty_paid || 0;
  const p = config.penalty; if (!p || !p.amount) return 0;
  const daysLate = bDaysLate(inv); if (daysLate <= 0) return 0;
  const periods = p.per === 'week' ? Math.ceil(daysLate / 7) : daysLate;
  return periods * p.amount;
}


/* ════════ app ════════ */
const app = express();
app.use(express.json({ limit: '8mb' })   /* raised for base64 image uploads (products: 3, services: 2) */);
app.disable('x-powered-by');

app.get('/api/health', (req, res) => res.json({ ok: true, db: db.kind }));
app.get('/api/config', (req, res) => res.json({
  googleClientId: GOOGLE_ID || null, demoAuth: !GOOGLE_ID, building: { name: B.name },
  checkoutEnabled: CHECKOUT_ENABLED
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
  if (!CHECKOUT_ENABLED) {
    return res.status(423).json({
      error: 'checkout_on_hold',
      message: 'Online checkout isn\u2019t live yet \u2014 something amazing is coming soon. Please contact the seller directly for now.'
    });
  }
  try {
    const order = computeOrder(req.body || {});
    const s = getSession(req);
    order.userId = s ? s.uid : null;
    await db.insertOrder(order);
    notifyTelegram(order);
    // buyer SMS confirmation — wording depends on how they're paying
    const payLine = order.bank
      ? `Pay to ${order.bank.name} ${order.bank.acct} (${order.bank.holder}), then send proof on WhatsApp.`
      : (order.paymentMethod === 'chapa'
          ? `Complete payment via the Chapa checkout link on the site.`
          : `A USSD prompt will be sent to your phone to approve payment.`);
    sendSMS(order.buyer.phone,
      `Ambassador: order ${order.ref} placed with ${order.tenant.name}. Total ${order.total} ETB ` +
      `(incl. delivery+${order.taxLabel}). ${payLine} You'll get SMS updates as it progresses.`);
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

/* ── Chapa: start hosted checkout for an already-placed order ── */
app.post('/api/orders/:ref/pay/chapa', async (req, res) => {
  try {
    const order = await db.orderByRef(req.params.ref);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const base = proto + '://' + req.get('host');
    const checkoutUrl = await chapaInit(
      { ref: order.ref, total: order.total, tenant: { name: TENANTS[order.tenant_id] ? TENANTS[order.tenant_id].name : order.tenant_id }, buyer: order.buyer },
      base + '/api/webhooks/chapa', base + '/?order=' + encodeURIComponent(order.ref)
    );
    await db.setOrderPayment(order.ref, { method: 'chapa' });
    res.json({ checkoutUrl });
  } catch (e) {
    res.status(e.code === 'CHAPA_NOT_CONFIGURED' ? 503 : 400).json({ error: e.message, code: e.code || null });
  }
});
/* Chapa calls this once the buyer completes (or abandons) checkout */
app.post('/api/webhooks/chapa', async (req, res) => {
  try {
    const txRef = (req.body && (req.body.tx_ref || req.body.reference)) || '';
    if (!txRef) return res.status(400).json({ error: 'Missing tx_ref' });
    const verified = await chapaVerify(txRef);
    if (verified) {
      const row = await db.setOrderPayment(txRef, { status: 'confirmed', providerRef: verified.reference || txRef, method: 'chapa' });
      if (row && row.buyer && row.buyer.phone && STATUS_SMS.confirmed) sendSMS(row.buyer.phone, STATUS_SMS.confirmed(txRef));
    }
    res.json({ ok: true });
  } catch (e) { res.status(200).json({ ok: false, error: e.message }); } // 200 so Chapa doesn't endlessly retry a dead ref
});

/* ── USSD push: ask the buyer's bank/telco to prompt them to approve payment ── */
app.post('/api/orders/:ref/pay/ussd', async (req, res) => {
  try {
    const order = await db.orderByRef(req.params.ref);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const providerRef = await ussdPush({ ref: order.ref, total: order.total, buyer: order.buyer });
    await db.setOrderPayment(order.ref, { method: 'ussd', providerRef });
    res.json({ ok: true, message: 'A USSD prompt has been sent to ' + order.buyer.phone + ' — approve it on your phone to complete payment.' });
  } catch (e) {
    res.status(e.code === 'USSD_NOT_CONFIGURED' ? 503 : 400).json({ error: e.message, code: e.code || null });
  }
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
  const gallery = Array.isArray(req.body.gallery) ? req.body.gallery.filter(isImageRef).slice(0, 3) : undefined;
  if (stock && ['in','low','made','out'].indexOf(stock.state) < 0) return res.status(400).json({ error: 'Invalid stock state' });
  if (Array.isArray(req.body.gallery) && !gallery.length && req.body.gallery.length) return res.status(400).json({ error: 'Images must be URLs or data-URLs under 1.5MB each' });
  await mutateCatalog(c => {
    const t = c.building.tenants.find(x => x.id === req.sellerTid);
    const prod = t.products.find(x => x.id === pid);
    if (price !== undefined) prod.price = price;
    if (stock) prod.stock = { state: stock.state, label: ('' + (stock.label || '')).slice(0, 6) };
    if (active !== undefined) prod.active = active;
    if (gallery !== undefined) { prod.gallery = gallery.length ? gallery : prod.gallery; if (gallery[0]) prod.img = gallery[0]; }
  });
  res.json({ ok: true, product: PRODUCTS[pid] });
});
app.post('/api/seller/profile', requireSeller, async (req, res) => {
  // sellers can update their OWN shop's brief description and social links.
  // Each social platform is stored as { value, on } so a seller can turn a
  // link off without losing/retyping it later.
  const SOCIAL_KEYS = ['instagram','facebook','tiktok','telegram','youtube','website'];
  const blurb = req.body && typeof req.body.blurb === 'string' ? req.body.blurb.slice(0, 240) : undefined;
  const socialsIn = (req.body && req.body.socials) || null;
  let socials;
  if (socialsIn && typeof socialsIn === 'object') {
    socials = {};
    SOCIAL_KEYS.forEach(k => {
      const entry = socialsIn[k];
      if (!entry) return;
      const value = ('' + (entry.value || '')).trim().slice(0, 120);
      if (!value) return;
      socials[k] = { value, on: entry.on !== false };
    });
  }
  await mutateCatalog(c => {
    const t = c.building.tenants.find(x => x.id === req.sellerTid);
    if (blurb !== undefined) t.blurb = blurb;
    if (socials !== undefined) t.socials = socials;
  });
  res.json({ ok: true, tenant: TENANTS[req.sellerTid] });
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
app.get('/api/admin/ussd-log', requireAdmin, (req, res) => res.json({ messages: ussdLog }));

/* ════════════════════════════════════════════════════════════════
   AMBASSADOR BMS API — all key-protected (same ADMIN_KEY as everything
   else in /admin.html). Operates on the same tenants as the storefront.
═══════════════════════════════════════════════════════════════════ */

app.get('/api/admin/bms/tenants', requireAdmin, async (req, res) => {
  const leases = await db.allLeases();
  const byUnit = {}; leases.forEach(l => { byUnit[l.unit] = l; });
  const tenants = (B.tenants || []).map(t => Object.assign({}, t, { lease: byUnit[t.unit || t.id.toUpperCase()] || null }));
  res.json({ tenants });
});

app.get('/api/admin/bms/leases', requireAdmin, async (req, res) => res.json({ leases: await db.allLeases() }));
app.put('/api/admin/bms/lease', requireAdmin, async (req, res) => {
  try {
    const input = (req.body && req.body.lease) || {};
    const unit = ('' + (input.unit || '')).toUpperCase();
    const t = (B.tenants || []).find(x => (x.unit || x.id.toUpperCase()) === unit);
    if (!t) return res.status(404).json({ error: 'No tenant on unit ' + unit });
    const existing = await db.leaseByUnit(unit);
    const start = input.start || bIso(new Date());
    const lease = {
      unit, tenantId: t.id, start,
      end: input.end || bIso(bAddMonths(new Date(start), 12)),
      cycleMonths: Math.max(1, parseInt(input.cycleMonths, 10) || (existing ? existing.cycle_months : 1)),
      firstPeriodMonths: Math.max(1, parseInt(input.firstPeriodMonths, 10) || (existing ? existing.first_period_months : 1)),
      firstDone: existing ? existing.first_done : false,
      nextDue: existing ? existing.next_due : start,
      deposit: input.deposit !== undefined ? parseInt(input.deposit, 10) || 0 : (existing ? existing.deposit : 0),
      rent: input.rent !== undefined ? parseInt(input.rent, 10) || 0 : (existing ? existing.rent : 0)
    };
    await db.upsertLease(lease);
    res.json({ lease });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/bms/lease/:unit', requireAdmin, async (req, res) => {
  await db.deleteLease(req.params.unit.toUpperCase());
  res.json({ ok: true });
});

app.get('/api/admin/bms/invoices', requireAdmin, async (req, res) => {
  const rows = req.query.unit ? await db.invoicesByUnit(req.query.unit.toUpperCase()) : await db.allInvoices();
  const config = await getBmsConfigSafe();
  const withPenalty = rows.map(i => Object.assign({}, i, { daysLate: bDaysLate(i), penaltyDue: bPenaltyOf(i, config) }));
  res.json({ invoices: withPenalty });
});
app.post('/api/admin/bms/invoice/:id/pay', requireAdmin, async (req, res) => {
  const config = await getBmsConfigSafe();
  const rows = await db.allInvoices();
  const inv = rows.find(i => i.id === req.params.id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  const penalty = bPenaltyOf(inv, config);
  const row = await db.updateInvoice(req.params.id, {
    status: 'paid', paid_at: bIso(new Date()),
    method: (req.body && req.body.method) || 'bank_transfer',
    ref: (req.body && req.body.ref) || '', penalty_paid: penalty
  });
  res.json({ invoice: row, penaltyCharged: penalty });
});
app.post('/api/admin/bms/sweep', requireAdmin, async (req, res) => {
  const leases = await db.allLeases();
  const today = new Date();
  let created = 0;
  for (const l of leases) {
    const t = (B.tenants || []).find(x => (x.unit || x.id.toUpperCase()) === l.unit);
    if (!t || !t.active) continue;
    const lease = { unit: l.unit, nextDue: l.next_due, firstDone: l.first_done,
      cycleMonths: l.cycle_months, firstPeriodMonths: l.first_period_months };
    const made = generateInvoicesForLease(lease, l.rent, today);
    for (const inv of made) { await db.insertInvoice(inv); created++; }
    if (made.length) await db.upsertLease({ unit: l.unit, tenantId: l.tenant_id, start: l.start_date, end: l.end_date,
      cycleMonths: l.cycle_months, firstPeriodMonths: l.first_period_months, firstDone: lease.firstDone,
      nextDue: lease.nextDue, deposit: l.deposit, rent: l.rent });
  }
  const overdue = await db.markInvoicesOverdue(bIso(today));
  res.json({ invoicesCreated: created, markedOverdue: overdue });
});

app.get('/api/admin/bms/finance', requireAdmin, async (req, res) => res.json({ entries: await db.allFinance() }));
app.put('/api/admin/bms/finance', requireAdmin, async (req, res) => {
  try {
    const input = (req.body && req.body.entry) || {};
    if (!['income','expense'].includes(input.type)) return res.status(400).json({ error: 'type must be income or expense' });
    const amount = parseInt(input.amount, 10);
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount is required' });
    const entry = {
      id: (input.type === 'income' ? 'INC-' : 'EXP-') + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase(),
      type: input.type, date: input.date || bIso(new Date()), category: ('' + (input.category || 'Other')).slice(0, 40),
      amount, note: ('' + (input.note || '')).slice(0, 200), unit: input.unit ? ('' + input.unit).toUpperCase() : null
    };
    await db.insertFinance(entry);
    res.json({ entry });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/bms/finance/:id', requireAdmin, async (req, res) => { await db.deleteFinance(req.params.id); res.json({ ok: true }); });

app.get('/api/admin/bms/tickets', requireAdmin, async (req, res) => res.json({ tickets: await db.allTickets() }));
app.put('/api/admin/bms/ticket', requireAdmin, async (req, res) => {
  try {
    const input = (req.body && req.body.ticket) || {};
    if (!input.title) return res.status(400).json({ error: 'Title is required' });
    const tk = {
      id: 'TK-' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase(),
      title: ('' + input.title).slice(0, 120), loc: ('' + (input.loc || '—')).slice(0, 60),
      cat: input.cat || 'General', pri: ['low','normal','high','urgent'].includes(input.pri) ? input.pri : 'normal',
      asg: ('' + (input.asg || '')).slice(0, 60), status: 'open', created: bIso(new Date())
    };
    await db.insertTicket(tk);
    res.json({ ticket: tk });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/admin/bms/ticket/:id/status', requireAdmin, async (req, res) => {
  const status = (req.body && req.body.status) || '';
  if (!['open','prog','done'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  const row = await db.updateTicketStatus(req.params.id, status, status === 'done' ? bIso(new Date()) : null);
  if (!row) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ ticket: row });
});

app.get('/api/admin/bms/announcements', requireAdmin, async (req, res) => res.json({ announcements: await db.allAnnouncements() }));
app.put('/api/admin/bms/announcement', requireAdmin, async (req, res) => {
  const input = (req.body && req.body.announcement) || {};
  if (!input.title || !input.body) return res.status(400).json({ error: 'Title and message are required' });
  const a = { id: 'AN-' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase(),
    title: ('' + input.title).slice(0, 120), aud: input.aud || 'all', body: ('' + input.body).slice(0, 1000), at: bIso(new Date()) };
  await db.insertAnnouncement(a);
  res.json({ announcement: a });
});
app.delete('/api/admin/bms/announcement/:id', requireAdmin, async (req, res) => { await db.deleteAnnouncement(req.params.id); res.json({ ok: true }); });

app.get('/api/admin/bms/config', requireAdmin, async (req, res) => res.json({ config: await getBmsConfigSafe() }));
app.put('/api/admin/bms/config', requireAdmin, async (req, res) => {
  const input = (req.body && req.body.config) || {};
  const cfg = defaultBmsConfig();
  if (input.penalty && typeof input.penalty.amount === 'number') cfg.penalty = { amount: input.penalty.amount, per: input.penalty.per === 'week' ? 'week' : 'day' };
  if (Array.isArray(input.accounts) && input.accounts.length) cfg.accounts = input.accounts.map(a => ({ bank: ('' + (a.bank||'')).slice(0,60), number: ('' + (a.number||'')).slice(0,40), holder: ('' + (a.holder||'')).slice(0,80) }));
  await db.saveBmsConfig(cfg);
  res.json({ config: cfg });
});

app.get('/api/admin/bms/dashboard', requireAdmin, async (req, res) => {
  const tenants = B.tenants || [];
  const occupied = tenants.filter(t => t.active !== false).length;
  const leases = await db.allLeases();
  const invoices = await db.allInvoices();
  const config = await getBmsConfigSafe();
  const overdueInvoices = invoices.filter(i => i.status !== 'paid' && bDaysLate(i) > 0);
  const arrears = overdueInvoices.reduce((s, i) => s + i.amount + bPenaltyOf(i, config), 0);
  const finance = await db.allFinance();
  const thisMonth = bIso(new Date()).slice(0, 7);
  const incomeThisMonth = finance.filter(e => e.type === 'income' && ('' + e.date).startsWith(thisMonth)).reduce((s,e) => s+e.amount, 0);
  const expenseThisMonth = finance.filter(e => e.type === 'expense' && ('' + e.date).startsWith(thisMonth)).reduce((s,e) => s+e.amount, 0);
  const orders = await db.allOrders();
  const ordersToday = orders.filter(o => ('' + o.created_at).slice(0,10) === bIso(new Date())).length;
  const revenueToday = orders.filter(o => ('' + o.created_at).slice(0,10) === bIso(new Date())).reduce((s,o) => s + (o.total||0), 0);
  const tickets = await db.allTickets();
  res.json({
    totalUnits: tenants.length, occupiedUnits: occupied, vacantUnits: tenants.length - occupied,
    activeLeases: leases.length,
    arrears, overdueCount: overdueInvoices.length,
    incomeThisMonth, expenseThisMonth, netThisMonth: incomeThisMonth - expenseThisMonth,
    ordersToday, revenueToday,
    openTickets: tickets.filter(t => t.status === 'open').length,
    inProgressTickets: tickets.filter(t => t.status === 'prog').length,
    topArrears: overdueInvoices
      .map(i => ({ unit: i.unit, tenant: (tenants.find(t => (t.unit||t.id.toUpperCase())===i.unit)||{}).name || i.unit, amount: i.amount + bPenaltyOf(i, config), daysLate: bDaysLate(i) }))
      .sort((a,b) => b.amount - a.amount).slice(0, 5)
  });
});
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
  // terminating a tenant also ends their lease, if the BMS has one on file for this unit
  if (!next && t.unit) {
    const lease = await db.leaseByUnit(t.unit);
    if (lease && (!lease.end_date || lease.end_date > bIso(new Date()))) {
      await db.upsertLease({ unit: lease.unit, tenantId: lease.tenant_id, start: lease.start_date,
        end: bIso(new Date()), cycleMonths: lease.cycle_months, firstPeriodMonths: lease.first_period_months,
        firstDone: lease.first_done, nextDue: lease.next_due, deposit: lease.deposit, rent: lease.rent });
    }
  }
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

/* ── hide/unhide: `hidden` removes an item from the main storefront sections
   (Our Sellers / Shop All Products / On Sale / Building Services) while it
   stays fully searchable, orderable, and listed in the floor/office panel.
   This is softer than the on/off toggle, which pulls the item everywhere. ── */
app.post('/api/admin/tenant/:id/hide', requireAdmin, async (req, res) => {
  const t = TENANTS[req.params.id];
  if (!t) return res.status(404).json({ error: 'Unknown tenant' });
  const next = req.body && typeof req.body.hidden === 'boolean' ? req.body.hidden : !t.hidden;
  await mutateCatalog(c => { c.building.tenants.find(x => x.id === req.params.id).hidden = next; });
  res.json({ tenant: TENANTS[req.params.id] });
});
app.post('/api/admin/product/:pid/hide', requireAdmin, async (req, res) => {
  const p = PRODUCTS[req.params.pid];
  if (!p) return res.status(404).json({ error: 'Unknown product' });
  const next = req.body && typeof req.body.hidden === 'boolean' ? req.body.hidden : !p.hidden;
  await mutateCatalog(c => {
    const t = c.building.tenants.find(x => x.id === p.tenantId);
    t.products.find(x => x.id === req.params.pid).hidden = next;
  });
  res.json({ product: PRODUCTS[req.params.pid] });
});
app.post('/api/admin/service/:id/hide', requireAdmin, async (req, res) => {
  const sv = SERVICES[req.params.id];
  if (!sv) return res.status(404).json({ error: 'Unknown service' });
  const next = req.body && typeof req.body.hidden === 'boolean' ? req.body.hidden : !sv.hidden;
  await mutateCatalog(c => { c.building.services.find(x => x.id === req.params.id).hidden = next; });
  res.json({ service: SERVICES[req.params.id] });
});

/* ── storefront sections (Marketplace & Our Sellers): visibility + titles ── */
app.get('/api/admin/sections', requireAdmin, (req, res) => {
  res.json({ sections: (catalog.building && catalog.building.sections) || {} });
});
app.put('/api/admin/sections', requireAdmin, async (req, res) => {
  const input = (req.body && req.body.sections) || {};
  const clean = {};
  ['shop', 'sellers'].forEach(k => {
    const o = input[k] || {};
    clean[k] = {
      visible: o.visible !== false,
      title: ('' + (o.title || '')).slice(0, 120),
      sub: ('' + (o.sub || '')).slice(0, 300)
    };
  });
  await mutateCatalog(c => { c.building.sections = clean; });
  res.json({ sections: clean });
});

/* ════════ COMMISSION & SALES REPORTS ════════
   Bisinka charges a platform commission (default 2%) on the GOODS value of
   completed sales (order subtotal) — delivery fees and VAT pass through
   untouched, and cancelled orders never carry commission. The rate lives in
   catalog.building.commission.rate so it can be changed without a redeploy;
   every report prints the rate that was actually used, so numbers stay
   auditable even if the rate changes later. ── */

app.get('/api/admin/commission', requireAdmin, (req, res) => {
  res.json({ commission: B.commission });
});
app.put('/api/admin/commission', requireAdmin, async (req, res) => {
  const rate = parseFloat(req.body && req.body.rate);
  if (!isFinite(rate) || rate < 0 || rate > 0.5) return res.status(400).json({ error: 'Rate must be between 0 and 0.5 (0%–50%)' });
  await mutateCatalog(c => { c.building.commission = { rate }; });
  res.json({ commission: B.commission });
});

/* shared aggregation used by both the on-screen report and the CSV export */
function dayKey(d){ return new Date(d).toISOString().slice(0, 10); }
async function buildReport(fromISO, toISO, tenantId){
  const rate = B.commission.rate;
  let rows = await db.ordersInRange(fromISO, toISO);
  if (tenantId) rows = rows.filter(o => o.tenant_id === tenantId);

  const totals = { orders: rows.length, cancelledOrders: 0, subtotal: 0, deliveryFee: 0, tax: 0, total: 0, commission: 0, net: 0 };
  const byStatus = {};
  const byDayMap = new Map();
  const byTenantMap = new Map();

  rows.forEach(o => {
    byStatus[o.status] = (byStatus[o.status] || 0) + 1;
    const cancelled = o.status === 'cancelled';
    if (cancelled) { totals.cancelledOrders++; return; }  // no commission on cancelled orders

    const sub = o.subtotal || 0, dlv = o.delivery_fee || 0, tax = o.tax || 0, tot = o.total || 0;
    const comm = Math.round(sub * rate);
    totals.subtotal += sub; totals.deliveryFee += dlv; totals.tax += tax; totals.total += tot; totals.commission += comm;

    const dk = dayKey(o.created_at);
    const dRow = byDayMap.get(dk) || { date: dk, orders: 0, subtotal: 0, commission: 0 };
    dRow.orders++; dRow.subtotal += sub; dRow.commission += comm;
    byDayMap.set(dk, dRow);

    const tid = o.tenant_id;
    const tRow = byTenantMap.get(tid) || { tenantId: tid, tenantName: (TENANTS[tid] && TENANTS[tid].name) || tid, orders: 0, subtotal: 0, commission: 0, net: 0 };
    tRow.orders++; tRow.subtotal += sub; tRow.commission += comm; tRow.net += (sub - comm);
    byTenantMap.set(tid, tRow);
  });
  totals.net = totals.subtotal - totals.commission;

  return {
    range: { from: fromISO, to: toISO }, rate,
    totals,
    byStatus,
    byDay: Array.from(byDayMap.values()).sort((a, b) => a.date < b.date ? -1 : 1),
    byTenant: Array.from(byTenantMap.values()).sort((a, b) => b.subtotal - a.subtotal)
  };
}
function parseRangeQuery(q){
  // defaults to month-to-date in local server time if nothing supplied
  const now = new Date();
  let from = q.from ? new Date(q.from + 'T00:00:00') : new Date(now.getFullYear(), now.getMonth(), 1);
  let to = q.to ? new Date(q.to + 'T00:00:00') : now;
  to.setDate(to.getDate() + (q.to ? 1 : 0)); // 'to' is inclusive of that calendar day when explicitly given
  if (!(from instanceof Date) || isNaN(from)) from = new Date(now.getFullYear(), now.getMonth(), 1);
  if (!(to instanceof Date) || isNaN(to)) to = now;
  return { fromISO: from.toISOString(), toISO: to.toISOString() };
}

app.get('/api/admin/report', requireAdmin, async (req, res) => {
  try {
    const { fromISO, toISO } = parseRangeQuery(req.query);
    const report = await buildReport(fromISO, toISO, req.query.tenantId || null);
    res.json(report);
  } catch (e) { res.status(500).json({ error: 'Could not build report' }); }
});

app.get('/api/admin/report.csv', requireAdmin, async (req, res) => {
  try {
    const { fromISO, toISO } = parseRangeQuery(req.query);
    const report = await buildReport(fromISO, toISO, req.query.tenantId || null);
    const lines = ['Tenant ID,Tenant Name,Orders,Sales (Subtotal ETB),Commission (' + (report.rate * 100).toFixed(1) + '%) ETB,Net to Seller ETB'];
    report.byTenant.forEach(t => {
      lines.push([t.tenantId, '"' + t.tenantName.replace(/"/g, '""') + '"', t.orders, t.subtotal, t.commission, t.net].join(','));
    });
    lines.push('');
    lines.push(['TOTAL', '', report.totals.orders, report.totals.subtotal, report.totals.commission, report.totals.net].join(','));
    lines.push('');
    lines.push('Report range,' + report.range.from.slice(0, 10) + ' to ' + report.range.to.slice(0, 10));
    lines.push('Cancelled orders (excluded above),' + report.totals.cancelledOrders);
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ambassador-sales-report-${req.query.from || 'mtd'}-to-${req.query.to || 'today'}.csv"`);
    res.send(csv);
  } catch (e) { res.status(500).json({ error: 'Could not build CSV' }); }
});

/* send each tenant their own period summary — real SMS (Afromessage/Twilio,
   log-only fallback) plus a ready-to-tap WhatsApp deep link the admin can
   send manually for richer formatting. Never fakes delivery: if a tenant has
   no phone on file, they show up in `skipped`, not `sent`. */
app.post('/api/admin/report/send', requireAdmin, async (req, res) => {
  try {
    const { fromISO, toISO } = parseRangeQuery(req.body || {});
    const targetIds = req.body && req.body.tenantId ? [req.body.tenantId]
      : (req.body && req.body.all ? Object.keys(TENANTS) : []);
    if (!targetIds.length) return res.status(400).json({ error: 'Provide tenantId or all:true' });

    const periodLabel = fromISO.slice(0, 10) + ' to ' + new Date(new Date(toISO) - 86400000).toISOString().slice(0, 10);
    const sent = [], skipped = [], links = [];
    for (const tid of targetIds) {
      const t = TENANTS[tid]; if (!t) { skipped.push({ tenantId: tid, reason: 'unknown tenant' }); continue; }
      const r = await buildReport(fromISO, toISO, tid);
      const row = r.totals;
      const msg = `Ambassador Mall sales report (${periodLabel}) for ${t.name}: ${row.orders} order(s), sales ETB ${row.subtotal}, ` +
        `Bisinka commission ${(r.rate * 100).toFixed(1)}% = ETB ${row.commission}, net to you ETB ${row.net}. — Bisinka Marketplace`;
      const waLink = t.whatsapp ? `https://wa.me/${t.whatsapp}?text=${encodeURIComponent(msg)}` : null;
      if (t.mobile) { sendSMS(t.mobile, msg); sent.push({ tenantId: tid, name: t.name, via: 'sms', whatsappLink: waLink }); }
      else if (waLink) { sent.push({ tenantId: tid, name: t.name, via: 'whatsapp-link-only', whatsappLink: waLink }); }
      else { skipped.push({ tenantId: tid, name: t.name, reason: 'no phone on file' }); }
      if (waLink) links.push({ tenantId: tid, name: t.name, whatsappLink: waLink });
    }
    res.json({ sent, skipped, links });
  } catch (e) { res.status(500).json({ error: 'Could not send reports' }); }
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
