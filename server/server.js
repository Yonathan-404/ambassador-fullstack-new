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
  /* SSL rules differ by host:
       • Render INTERNAL url (dpg-xxxx-a/dbname) → same private network, no SSL
       • Render EXTERNAL url and every hosted provider (Neon, Supabase, Railway,
         Heroku, ElephantSQL…) → SSL required, self-signed cert
       • localhost / 127.0.0.1 → no SSL
     Matching only "render.com" silently failed on other providers. */
  const DB_URL = process.env.DATABASE_URL;
  const isLocal    = /@(localhost|127\.0\.0\.1)/.test(DB_URL);
  const isInternal = /@dpg-[a-z0-9-]+(-a)?(:\d+)?\//.test(DB_URL);   // Render private hostname
  const needsSSL   = !isLocal && !isInternal;
  const pool = new Pool({
    connectionString: DB_URL,
    ssl: needsSSL ? { rejectUnauthorized: false } : undefined
  });
  pool.on('error', e => console.error('[db] idle client error:', e.message));
  console.log(`[db] connecting to Postgres (ssl: ${needsSSL ? 'on' : 'off'})`);
  const init = pool.query(`
        CREATE TABLE IF NOT EXISTS leases (
      unit TEXT PRIMARY KEY, tenant_id TEXT, start_date TEXT, end_date TEXT,
      cycle_months INT DEFAULT 1, first_period_months INT DEFAULT 1, first_done BOOLEAN DEFAULT false,
      next_due TEXT, deposit INT DEFAULT 0, rent INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS bms_invoices (
      id TEXT PRIMARY KEY, unit TEXT, period_start TEXT, period_end TEXT, period_months INT,
      due_date TEXT, amount INT, status TEXT DEFAULT 'due', paid_at TEXT, method TEXT, ref TEXT,
      paid_amount INT DEFAULT 0, receipt_no TEXT, kind TEXT DEFAULT 'rent',
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
    CREATE TABLE IF NOT EXISTS job_posts (
      id TEXT PRIMARY KEY, poster_type TEXT NOT NULL, poster_id TEXT, poster_name TEXT,
      position TEXT NOT NULL, salary TEXT, negotiable BOOLEAN DEFAULT false,
      hours TEXT, location TEXT, employment_type TEXT, description TEXT,
      contact_phone TEXT, contact_whatsapp TEXT, deadline TEXT,
      active BOOLEAN DEFAULT true, created_at TIMESTAMPTZ DEFAULT now());
    ALTER TABLE bms_invoices ADD COLUMN IF NOT EXISTS paid_amount INT DEFAULT 0;
    ALTER TABLE bms_invoices ADD COLUMN IF NOT EXISTS receipt_no TEXT;
    ALTER TABLE bms_invoices ADD COLUMN IF NOT EXISTS kind TEXT DEFAULT 'rent';
    ALTER TABLE bms_tickets ADD COLUMN IF NOT EXISTS photo TEXT;
    ALTER TABLE bms_tickets ADD COLUMN IF NOT EXISTS cost INT DEFAULT 0;
    ALTER TABLE bms_tickets ADD COLUMN IF NOT EXISTS note TEXT;
    ALTER TABLE bms_leases ADD COLUMN IF NOT EXISTS deposit_held INT DEFAULT 0;
    ALTER TABLE bms_leases ADD COLUMN IF NOT EXISTS deposit_note TEXT;
    CREATE TABLE IF NOT EXISTS bms_payments (
      id SERIAL PRIMARY KEY, invoice_id TEXT, unit TEXT, amount INT, penalty INT DEFAULT 0,
      method TEXT, ref TEXT, receipt_no TEXT, paid_at TEXT, taken_by TEXT, note TEXT,
      created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS bms_docs (
      id TEXT PRIMARY KEY, unit TEXT, title TEXT, kind TEXT, data TEXT,
      uploaded_by TEXT, at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS bms_pending (
      id SERIAL PRIMARY KEY, action TEXT NOT NULL, payload JSONB NOT NULL,
      summary TEXT, made_by TEXT, made_by_name TEXT, made_at TIMESTAMPTZ DEFAULT now(),
      status TEXT DEFAULT 'pending', decided_by TEXT, decided_by_name TEXT,
      decided_at TIMESTAMPTZ, reason TEXT);
    CREATE TABLE IF NOT EXISTS bms_audit (
      id SERIAL PRIMARY KEY, action TEXT, summary TEXT, actor TEXT, actor_name TEXT,
      role TEXT, at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS shop_events (
      id SERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, kind TEXT NOT NULL,
      day DATE NOT NULL DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ DEFAULT now());
    CREATE INDEX IF NOT EXISTS shop_events_tid_day ON shop_events (tenant_id, day);
    CREATE TABLE IF NOT EXISTS tenant_ratings (
      id SERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, user_id INT NOT NULL,
      rating SMALLINT NOT NULL, created_at TIMESTAMPTZ DEFAULT now(), updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(tenant_id, user_id));

    -- ═══ Ambassador BMS (building management) ═══
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
    async findSellerByTenant(tid){ const r = await pool.query(`SELECT * FROM seller_codes WHERE tenant_id=$1`,[tid]); return r.rows[0]||null; },
    async deleteSellerCode(tid){ await pool.query(`DELETE FROM seller_codes WHERE tenant_id=$1`,[tid]); },

    // ── tenant ratings (real, signed-in-user submitted) ──
    // ── shop analytics: visits & shares, counted per day ──
    // ── payments, receipts & documents ──
    async insertPayment(p){
      const r = await pool.query(
        `INSERT INTO bms_payments (invoice_id,unit,amount,penalty,method,ref,receipt_no,paid_at,taken_by,note)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [p.invoiceId,p.unit,p.amount,p.penalty||0,p.method,p.ref||'',p.receiptNo,p.paidAt,p.takenBy||'',p.note||'']);
      return r.rows[0];
    },
    async paymentsByUnit(unit){ return (await pool.query(`SELECT * FROM bms_payments WHERE unit=$1 ORDER BY paid_at DESC`,[unit])).rows; },
    async paymentByReceipt(rn){ const r = await pool.query(`SELECT * FROM bms_payments WHERE receipt_no=$1`,[rn]); return r.rows[0]||null; },
    async allPayments(){ return (await pool.query(`SELECT * FROM bms_payments ORDER BY paid_at DESC LIMIT 1000`)).rows; },
    async nextReceiptNo(){
      const r = await pool.query(`SELECT COUNT(*)::int AS n FROM bms_payments`);
      return 'RCP-' + String((r.rows[0].n || 0) + 1).padStart(5,'0');
    },
    async insertDoc(d){
      await pool.query(`INSERT INTO bms_docs (id,unit,title,kind,data,uploaded_by) VALUES ($1,$2,$3,$4,$5,$6)`,
        [d.id,d.unit,d.title,d.kind,d.data,d.uploadedBy||'']);
    },
    async docsByUnit(unit){ return (await pool.query(`SELECT id,unit,title,kind,uploaded_by,at FROM bms_docs WHERE unit=$1 ORDER BY at DESC`,[unit])).rows; },
    async getDoc(id){ const r = await pool.query(`SELECT * FROM bms_docs WHERE id=$1`,[id]); return r.rows[0]||null; },
    async deleteDoc(id){ await pool.query(`DELETE FROM bms_docs WHERE id=$1`,[id]); },


    // ── BMS maker/checker queue + audit ──
    async addPending(p){
      const r = await pool.query(
        `INSERT INTO bms_pending (action,payload,summary,made_by,made_by_name)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [p.action, JSON.stringify(p.payload), p.summary, p.madeBy, p.madeByName]);
      return r.rows[0];
    },
    async allPending(status){
      const r = status
        ? await pool.query(`SELECT * FROM bms_pending WHERE status=$1 ORDER BY made_at DESC LIMIT 300`, [status])
        : await pool.query(`SELECT * FROM bms_pending ORDER BY made_at DESC LIMIT 300`);
      return r.rows;
    },
    async getPending(id){ const r = await pool.query(`SELECT * FROM bms_pending WHERE id=$1`,[id]); return r.rows[0]||null; },
    async decidePending(id, status, by, byName, reason){
      await pool.query(`UPDATE bms_pending SET status=$2, decided_by=$3, decided_by_name=$4, decided_at=now(), reason=$5 WHERE id=$1`,
        [id, status, by, byName, reason||null]);
    },
    async addAudit(a){
      await pool.query(`INSERT INTO bms_audit (action,summary,actor,actor_name,role) VALUES ($1,$2,$3,$4,$5)`,
        [a.action, a.summary, a.actor, a.actorName, a.role]);
    },
    async allAudit(limit){ const r = await pool.query(`SELECT * FROM bms_audit ORDER BY at DESC LIMIT $1`,[limit||200]); return r.rows; },

    async logShopEvent(tid, kind){
      await pool.query(`INSERT INTO shop_events (tenant_id, kind) VALUES ($1,$2)`, [tid, kind]);
    },
    async shopStats(days){
      const r = await pool.query(
        `SELECT tenant_id, kind,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE day = CURRENT_DATE)::int AS today,
                COUNT(*) FILTER (WHERE day > CURRENT_DATE - $1::int)::int AS window
         FROM shop_events GROUP BY tenant_id, kind`, [days || 7]);
      return r.rows;
    },
    async rateTenant(tenantId, userId, rating){
      await pool.query(
        `INSERT INTO tenant_ratings (tenant_id, user_id, rating) VALUES ($1,$2,$3)
         ON CONFLICT (tenant_id, user_id) DO UPDATE SET rating=$3, updated_at=now()`,
        [tenantId, userId, rating]);
      return this.tenantRatingAgg(tenantId);
    },
    async myRatingForTenant(tenantId, userId){
      const r = await pool.query(`SELECT rating FROM tenant_ratings WHERE tenant_id=$1 AND user_id=$2`, [tenantId, userId]);
      return r.rows[0] ? r.rows[0].rating : null;
    },
    async tenantRatingAgg(tenantId){
      const r = await pool.query(`SELECT COUNT(*)::int AS n, COALESCE(AVG(rating),0)::float AS avg FROM tenant_ratings WHERE tenant_id=$1`, [tenantId]);
      const row = r.rows[0] || { n: 0, avg: 0 };
      return { reviews: row.n, rating: row.n ? Math.round(row.avg * 10) / 10 : 0 };
    },

    // ── job / vacancy posts ──
    async allJobs(){ return (await pool.query(`SELECT * FROM job_posts ORDER BY created_at DESC LIMIT 300`)).rows; },
    async jobsByPoster(type,id){ return (await pool.query(
      `SELECT * FROM job_posts WHERE poster_type=$1 AND poster_id IS NOT DISTINCT FROM $2 ORDER BY created_at DESC`,[type,id])).rows; },
    async upsertJob(j){
      await pool.query(`INSERT INTO job_posts
        (id,poster_type,poster_id,poster_name,position,salary,negotiable,hours,location,employment_type,description,contact_phone,contact_whatsapp,deadline,active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (id) DO UPDATE SET position=$5,salary=$6,negotiable=$7,hours=$8,location=$9,
          employment_type=$10,description=$11,contact_phone=$12,contact_whatsapp=$13,deadline=$14,active=$15`,
        [j.id,j.poster_type,j.poster_id,j.poster_name,j.position,j.salary,j.negotiable,j.hours,j.location,
         j.employment_type,j.description,j.contact_phone,j.contact_whatsapp,j.deadline,j.active]);
      return j;
    },
    async deleteJob(id){ await pool.query(`DELETE FROM job_posts WHERE id=$1`,[id]); },
    async getJob(id){ const r=await pool.query(`SELECT * FROM job_posts WHERE id=$1`,[id]); return r.rows[0]||null; },

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
        `INSERT INTO bms_invoices (id,unit,period_start,period_end,period_months,due_date,amount,status,paid_at,method,ref,penalty_paid,paid_amount,kind)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [i.id,i.unit,i.periodStart,i.periodEnd,i.periodMonths,i.dueDate,i.amount,i.status||'due',i.paidAt||null,i.method||null,i.ref||null,i.penaltyPaid||0,i.paidAmount||0,i.kind||'rent']);
    },
    async updateInvoice(id, patch){
      const r = await pool.query(`SELECT * FROM bms_invoices WHERE id=$1`,[id]); if (!r.rows[0]) return null;
      const row = Object.assign({}, r.rows[0], patch);
      await pool.query(`UPDATE bms_invoices SET status=$2,paid_at=$3,method=$4,ref=$5,penalty_paid=$6,paid_amount=$7,receipt_no=$8 WHERE id=$1`,
        [id, row.status, row.paid_at, row.method, row.ref, row.penalty_paid, row.paid_amount||0, row.receipt_no||null]);
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
      await pool.query(`INSERT INTO bms_tickets (id,title,loc,cat,pri,asg,status,created,done_at,photo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [tk.id,tk.title,tk.loc,tk.cat,tk.pri,tk.asg||'',tk.status||'open',tk.created,tk.doneAt||null,tk.photo||null]);
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
  let mem = { users: [], orders: [], notify: [], sellerCodes: {}, ratings: [], events: [], pending: [], audit: [], payments: [], docs: [], jobs: [], catalog: null, seq: 1,
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
    async findSellerByTenant(tid){ return mem.sellerCodes[tid] || null; },
    async deleteSellerCode(tid){ delete mem.sellerCodes[tid]; flush(); },

    // ── tenant ratings (real, signed-in-user submitted) ──
    // ── payments, receipts & documents ──
    async insertPayment(p){
      mem.payments = mem.payments || [];
      const row = { id: mem.seq++, invoice_id:p.invoiceId, unit:p.unit, amount:p.amount, penalty:p.penalty||0,
        method:p.method, ref:p.ref||'', receipt_no:p.receiptNo, paid_at:p.paidAt, taken_by:p.takenBy||'', note:p.note||'' };
      mem.payments.unshift(row); flush(); return row;
    },
    async paymentsByUnit(unit){ mem.payments = mem.payments || []; return mem.payments.filter(p => p.unit === unit); },
    async paymentByReceipt(rn){ mem.payments = mem.payments || []; return mem.payments.find(p => p.receipt_no === rn) || null; },
    async allPayments(){ mem.payments = mem.payments || []; return mem.payments.slice(0,1000); },
    async nextReceiptNo(){ mem.payments = mem.payments || []; return 'RCP-' + String(mem.payments.length + 1).padStart(5,'0'); },
    async insertDoc(d){
      mem.docs = mem.docs || [];
      mem.docs.unshift({ id:d.id, unit:d.unit, title:d.title, kind:d.kind, data:d.data,
        uploaded_by:d.uploadedBy||'', at:new Date().toISOString() });
      flush();
    },
    async docsByUnit(unit){ mem.docs = mem.docs || []; return mem.docs.filter(d => d.unit === unit)
      .map(({data, ...rest}) => rest); },
    async getDoc(id){ mem.docs = mem.docs || []; return mem.docs.find(d => d.id === id) || null; },
    async deleteDoc(id){ mem.docs = (mem.docs||[]).filter(d => d.id !== id); flush(); },


    // ── BMS maker/checker queue + audit ──
    async addPending(p){
      mem.pending = mem.pending || [];
      const row = { id: mem.seq++, action:p.action, payload:p.payload, summary:p.summary,
        made_by:p.madeBy, made_by_name:p.madeByName, made_at:new Date().toISOString(), status:'pending' };
      mem.pending.unshift(row); flush(); return row;
    },
    async allPending(status){
      mem.pending = mem.pending || [];
      return status ? mem.pending.filter(p => p.status === status) : mem.pending.slice(0,300);
    },
    async getPending(id){ mem.pending = mem.pending || []; return mem.pending.find(p => p.id === +id) || null; },
    async decidePending(id, status, by, byName, reason){
      mem.pending = mem.pending || [];
      const p = mem.pending.find(x => x.id === +id);
      if (p) { p.status=status; p.decided_by=by; p.decided_by_name=byName; p.decided_at=new Date().toISOString(); p.reason=reason||null; }
      flush();
    },
    async addAudit(a){
      mem.audit = mem.audit || [];
      mem.audit.unshift({ id: mem.seq++, action:a.action, summary:a.summary, actor:a.actor,
        actor_name:a.actorName, role:a.role, at:new Date().toISOString() });
      if (mem.audit.length > 3000) mem.audit = mem.audit.slice(0,2000);
      flush();
    },
    async allAudit(limit){ mem.audit = mem.audit || []; return mem.audit.slice(0, limit||200); },

    async logShopEvent(tid, kind){
      mem.events = mem.events || [];
      mem.events.push({ tenant_id: tid, kind, day: new Date().toISOString().slice(0,10) });
      if (mem.events.length > 50000) mem.events = mem.events.slice(-40000);   // keep the file bounded
      flush();
    },
    async shopStats(days){
      mem.events = mem.events || [];
      const today = new Date().toISOString().slice(0,10);
      const cutoff = new Date(Date.now() - (days||7)*864e5).toISOString().slice(0,10);
      const acc = {};
      mem.events.forEach(e => {
        const k = e.tenant_id + '|' + e.kind;
        acc[k] = acc[k] || { tenant_id: e.tenant_id, kind: e.kind, total: 0, today: 0, window: 0 };
        acc[k].total++;
        if (e.day === today) acc[k].today++;
        if (e.day > cutoff) acc[k].window++;
      });
      return Object.values(acc);
    },
    async rateTenant(tenantId, userId, rating){
      mem.ratings = mem.ratings || [];
      const existing = mem.ratings.find(r => r.tenant_id === tenantId && r.user_id === userId);
      if (existing) existing.rating = rating;
      else mem.ratings.push({ tenant_id: tenantId, user_id: userId, rating });
      flush();
      return this.tenantRatingAgg(tenantId);
    },
    async myRatingForTenant(tenantId, userId){
      mem.ratings = mem.ratings || [];
      const r = mem.ratings.find(r => r.tenant_id === tenantId && r.user_id === userId);
      return r ? r.rating : null;
    },
    async tenantRatingAgg(tenantId){
      mem.ratings = mem.ratings || [];
      const rows = mem.ratings.filter(r => r.tenant_id === tenantId);
      const n = rows.length;
      const avg = n ? rows.reduce((s, r) => s + r.rating, 0) / n : 0;
      return { reviews: n, rating: n ? Math.round(avg * 10) / 10 : 0 };
    },

    // ── job / vacancy posts ──
    async allJobs(){ mem.jobs=mem.jobs||[]; return mem.jobs.slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)); },
    async jobsByPoster(type,id){ mem.jobs=mem.jobs||[]; return mem.jobs.filter(j=>j.poster_type===type && (j.poster_id||null)===(id||null)); },
    async upsertJob(j){
      mem.jobs=mem.jobs||[];
      const i=mem.jobs.findIndex(x=>x.id===j.id);
      if(i>=0) mem.jobs[i]=Object.assign(mem.jobs[i],j); else mem.jobs.unshift(Object.assign({created_at:new Date().toISOString()},j));
      flush(); return j;
    },
    async deleteJob(id){ mem.jobs=(mem.jobs||[]).filter(j=>j.id!==id); flush(); },
    async getJob(id){ return (mem.jobs||[]).find(j=>j.id===id)||null; },

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
        paid_at:i.paidAt||null, method:i.method||null, ref:i.ref||null, penalty_paid:i.penaltyPaid||0,
        paid_amount:i.paidAmount||0, receipt_no:i.receiptNo||null, kind:i.kind||'rent' });
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
        status:tk.status||'open', created:tk.created, done_at:tk.doneAt||null, photo:tk.photo||null });
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
  set('photo', ''); set('logo', ''); set('blurb', ''); set('rating', 0); set('reviews', 0);
  set('reviewLink', ''); set('responseTime', '');
  // up to 5 horizontal shop photos, normally uploaded by the seller from their portal
  if (Array.isArray(input.gallery)) t.gallery = input.gallery.filter(isImageRef).slice(0, 5);
  else if (!Array.isArray(t.gallery)) t.gallery = [];
  t.active = input.active !== undefined ? !!input.active : (t.active !== undefined ? t.active : true);
  t.hidden = input.hidden !== undefined ? !!input.hidden : !!t.hidden;
  /* appointment booking is opt-in per shop; admin and the seller can both flip it */
  t.appointments = input.appointments !== undefined ? !!input.appointments : !!t.appointments;
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
  set('old', null); set('badge', null); set('rating', 0); set('reviews', 0);
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
    /* 'single'  — one operator does everything, changes apply immediately
       'dual'    — maker/checker: an inputer submits, an authorisor approves
                   before anything is written. Standard control for money. */
    mode: 'single',
    users: [],            // [{ id, name, phone, role:'inputer'|'authorisor'|'manager', codeHash, active }]
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

app.get('/api/health', (req, res) => res.json({
  ok: true, db: db.kind,
  persistent: db.kind === 'postgres',
  warning: db.kind === 'postgres' ? null
    : 'Running on a local JSON file. On free hosting this disk is ephemeral — ratings, vacancies and edits are lost on restart. Attach Postgres and set DATABASE_URL.'
}));
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
function requireBuyer(req, res, next){
  const s = getSession(req);
  if (!s || !s.uid) return res.status(401).json({ error: 'Please sign in to do that.' });
  req.buyerUid = s.uid; next();
}

/* ── tenant ratings — real, one per signed-in user, updatable ──
   Buyers rate the SHOP, not individual products (this mall's trust signal
   is "is this seller reliable", not per-item reviews). Rating a tenant
   they've never bought from is fine — it mirrors browsing/visiting trust,
   same as Google Maps reviews don't require a receipt. */
app.post('/api/tenant/:id/rate', requireBuyer, async (req, res) => {
  const tid = req.params.id;
  const t = TENANTS[tid];
  if (!t) return res.status(404).json({ error: 'Shop not found' });
  const rating = parseInt(req.body && req.body.rating, 10);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be 1–5' });
  const agg = await db.rateTenant(tid, req.buyerUid, rating);
  await mutateCatalog(c => {
    const ct = c.building.tenants.find(x => x.id === tid);
    if (ct) { ct.rating = agg.rating; ct.reviews = agg.reviews; }
  });
  res.json({ ok: true, rating: agg.rating, reviews: agg.reviews, myRating: rating });
});
app.get('/api/tenant/:id/my-rating', requireBuyer, async (req, res) => {
  const mine = await db.myRatingForTenant(req.params.id, req.buyerUid);
  res.json({ myRating: mine });
});

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
/* ── access code / password self-service ──
   A seller changes their own code by proving they know the current one.
   Only the SHA-256 hash is ever stored, so a forgotten code cannot be
   recovered — admin can only issue a fresh one (see /api/admin/seller-code). */
app.post('/api/seller/change-code', async (req, res) => {
  const s = getSeller(req);
  if (!s || s.role !== 'seller' || !TENANTS[s.tid]) return res.status(401).json({ error: 'Please sign in' });
  const current = ('' + ((req.body && req.body.current) || '')).trim();
  const next    = ('' + ((req.body && req.body.next) || '')).trim();
  if (!current || !next) return res.status(400).json({ error: 'Both the current and the new code are required' });
  if (next.length < 6)   return res.status(400).json({ error: 'New code must be at least 6 characters' });
  if (next === current)  return res.status(400).json({ error: 'The new code must be different from the current one' });
  // looked up by tenant id from the signed-in session, so a seller can only
  // ever change their OWN shop's code
  const stored = await db.findSellerByTenant(s.tid);
  if (!stored) return res.status(400).json({ error: 'No access code is set for this shop yet — ask management to issue one.' });
  if (stored.code_hash !== sha256(current)) return res.status(401).json({ error: 'Current access code is incorrect' });
  await db.setSellerCode(s.tid, stored.phone, sha256(next));
  res.json({ ok: true });
});

/* ══════════ BMS USERS, ROLES & MAKER–CHECKER ══════════
   Building operations no longer share the master ADMIN_KEY. Admin creates
   BMS users and grants each a role:
     manager    — single-person mode: does everything, applies immediately
     inputer    — submits changes; they wait in a queue
     authorisor — approves or rejects what an inputer submitted
   In 'dual' mode an inputer can never approve their own submission. */
const getBmsUser = req => readCookie(req, 'amb_bms');

async function bmsUsers(){ const c = await getBmsConfigSafe(); return c.users || []; }
async function bmsMode(){ const c = await getBmsConfigSafe(); return c.mode === 'dual' ? 'dual' : 'single'; }

app.post('/api/bms/login', async (req, res) => {
  const phone = normPhone(('' + ((req.body && req.body.phone) || '')).trim());
  const code  = ('' + ((req.body && req.body.code) || '')).trim();
  if (!phone || !code) return res.status(400).json({ error: 'Phone and access code are required' });
  const u = (await bmsUsers()).find(x => x.phone === phone && x.active !== false);
  if (!u || u.codeHash !== sha256(code)) return res.status(401).json({ error: 'Wrong phone or access code' });
  writeCookie(res, 'amb_bms', { role: 'bms', id: u.id, name: u.name, bmsRole: u.role }, 7);
  res.json({ user: { id: u.id, name: u.name, role: u.role }, mode: await bmsMode() });
});
app.post('/api/bms/logout', (req, res) => { clearCookie(res, 'amb_bms'); res.json({ ok: true }); });
app.get('/api/bms/me', async (req, res) => {
  const s = getBmsUser(req);
  if (!s) return res.json({ user: null });
  const u = (await bmsUsers()).find(x => x.id === s.id && x.active !== false);
  if (!u) return res.json({ user: null });   // revoked while signed in
  res.json({ user: { id: u.id, name: u.name, role: u.role }, mode: await bmsMode() });
});

/* Accepts EITHER the master admin key OR a signed-in BMS user, so the
   existing admin console keeps working unchanged. */
async function requireBms(req, res, next){
  if (ADMIN_KEY && req.get('x-admin-key') === ADMIN_KEY) {
    req.bms = { id: 'admin', name: 'Administrator', role: 'manager', isAdmin: true };
    return next();
  }
  const s = getBmsUser(req);
  if (!s || s.role !== 'bms') return res.status(401).json({ error: 'Please sign in to the building console' });
  const u = (await bmsUsers()).find(x => x.id === s.id && x.active !== false);
  if (!u) return res.status(401).json({ error: 'This account is no longer active' });
  req.bms = { id: u.id, name: u.name, role: u.role, isAdmin: false };
  next();
}
/* Only an authorisor (or admin/manager) may approve. */
function requireAuthorisor(req, res, next){
  const r = req.bms && req.bms.role;
  if (r === 'authorisor' || r === 'manager' || (req.bms && req.bms.isAdmin)) return next();
  return res.status(403).json({ error: 'Only an authorisor can approve or reject changes' });
}

/* The heart of maker–checker: in dual mode a write is parked for approval
   instead of applied. Returns true when the caller should stop. */
async function queueIfDual(req, res, action, payload, summary){
  if (await bmsMode() !== 'dual') return false;
  if (req.bms && req.bms.isAdmin) return false;              // master key bypasses
  if (req.bms && req.bms.role === 'manager') return false;   // manager acts alone
  const row = await db.addPending({ action, payload, summary,
    madeBy: req.bms.id, madeByName: req.bms.name });
  await db.addAudit({ action: 'submit:' + action, summary, actor: req.bms.id,
    actorName: req.bms.name, role: req.bms.role });
  res.json({ ok: true, pending: true, id: row.id,
    message: 'Submitted for approval — an authorisor must approve it before it takes effect.' });
  return true;
}
async function bmsAudit(req, action, summary){
  await db.addAudit({ action, summary,
    actor: req.bms ? req.bms.id : 'admin', actorName: req.bms ? req.bms.name : 'Administrator',
    role: req.bms ? req.bms.role : 'manager' });
}

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
/* sellers get the same create / edit / delete power over their OWN catalog
   that admin has over everyone's — name, category, price, description, photos */
app.put('/api/seller/product', requireSeller, async (req, res) => {
  const input = (req.body && req.body.product) || {};
  const existing = input.id ? PRODUCTS[input.id] : null;
  if (existing && existing.tenantId !== req.sellerTid)
    return res.status(403).json({ error: 'That product belongs to another shop' });
  if (!existing && !('' + (input.name || '')).trim())
    return res.status(400).json({ error: 'Product name is required' });
  let saved = null;
  await mutateCatalog(c => {
    const t = c.building.tenants.find(x => x.id === req.sellerTid);
    t.products = t.products || [];
    let prod = input.id ? t.products.find(x => x.id === input.id) : null;
    if (!prod) {
      // normProduct(tenant, input, existing) — it derives the next id from the
      // tenant's own product list, so the tenant must be passed first
      prod = normProduct(t, input, null);
      t.products.push(prod);
    } else {
      Object.assign(prod, normProduct(t, input, prod), { id: prod.id });
    }
    saved = prod;
  });
  res.json({ ok: true, product: saved });
});
app.delete('/api/seller/product/:pid', requireSeller, async (req, res) => {
  const p = PRODUCTS[req.params.pid];
  if (!p || p.tenantId !== req.sellerTid) return res.status(404).json({ error: 'Product not found' });
  await mutateCatalog(c => {
    const t = c.building.tenants.find(x => x.id === req.sellerTid);
    t.products = (t.products || []).filter(x => x.id !== req.params.pid);
  });
  res.json({ ok: true });
});
/* ── a tenant's own building account: rent, invoices, maintenance ──
   Cuts the phone calls to management, and makes the portal useful to the
   many tenants who will never sell online. Strictly scoped to their unit. */
app.get('/api/seller/rent', requireSeller, async (req, res) => {
  const t = TENANTS[req.sellerTid];
  const unit = (t.unit || t.id.toUpperCase());
  const lease = await db.leaseByUnit(unit);
  const config = await getBmsConfigSafe();
  const invoices = (await db.invoicesByUnit(unit)).map(i => Object.assign({}, i, {
    daysLate: bDaysLate(i), penaltyDue: bPenaltyOf(i, config)
  }));
  const outstanding = invoices
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + (i.amount || 0) + i.penaltyDue, 0);
  res.json({
    unit, lease: lease || null, invoices, outstanding,
    accounts: config.accounts || [],           // where to pay
    penalty: config.penalty || null
  });
});
app.get('/api/seller/tickets', requireSeller, async (req, res) => {
  const t = TENANTS[req.sellerTid];
  const unit = (t.unit || t.id.toUpperCase());
  const mine = (await db.allTickets()).filter(x => (x.loc || '').toUpperCase() === unit);
  res.json({ tickets: mine });
});
app.post('/api/seller/ticket', requireSeller, async (req, res) => {
  const t = TENANTS[req.sellerTid];
  const unit = (t.unit || t.id.toUpperCase());
  const title = ('' + ((req.body && req.body.title) || '')).trim().slice(0, 160);
  if (!title) return res.status(400).json({ error: 'Describe the problem' });
  const cat = ('' + ((req.body && req.body.cat) || 'other')).slice(0, 30);
  const pri = ['low','med','high'].indexOf(req.body && req.body.pri) >= 0 ? req.body.pri : 'med';
  const photo = ('' + ((req.body && req.body.photo) || '')).slice(0, 900000);   // a phone snap says more than a paragraph
  const tk = { id: 'tk-' + Date.now().toString(36), title, loc: unit, cat, pri,
    asg: '', status: 'open', created: new Date().toISOString(), doneAt: null, photo };
  await db.insertTicket(tk);
  res.json({ ok: true, ticket: tk });
});

app.post('/api/seller/profile', requireSeller, async (req, res) => {
  // sellers can update their OWN shop's brief description and social links.
  // Each social platform is stored as { value, on } so a seller can turn a
  // link off without losing/retyping it later.
  const SOCIAL_KEYS = ['instagram','facebook','tiktok','telegram','youtube','website'];
  const blurb = req.body && typeof req.body.blurb === 'string' ? req.body.blurb.slice(0, 240) : undefined;
  const appointments = typeof (req.body && req.body.appointments) === 'boolean' ? req.body.appointments : undefined;
  const logo = req.body && typeof req.body.logo === 'string' ? req.body.logo.slice(0, 400000) : undefined;
  // only accept a real #rrggbb value — never trust a colour string straight into CSS
  const colorIn = req.body && typeof req.body.color === 'string' ? req.body.color.trim() : undefined;
  const color = (colorIn !== undefined && /^#[0-9a-fA-F]{6}$/.test(colorIn)) ? colorIn : undefined;
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
  // up to 5 horizontal shop photos shown in the shop window on the storefront
  const galleryIn = req.body && req.body.gallery;
  const gallery = Array.isArray(galleryIn) ? galleryIn.filter(isImageRef).slice(0, 5) : undefined;
  if (Array.isArray(galleryIn) && !gallery.length && galleryIn.length) {
    return res.status(400).json({ error: 'Images must be URLs or data-URLs under 1.5MB each' });
  }
  await mutateCatalog(c => {
    const t = c.building.tenants.find(x => x.id === req.sellerTid);
    if (blurb !== undefined) t.blurb = blurb;
    if (socials !== undefined) t.socials = socials;
    if (appointments !== undefined) t.appointments = appointments;
    if (logo !== undefined) t.logo = logo;
    if (color !== undefined) t.color = color;
    if (gallery !== undefined) t.gallery = gallery;
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
/* manual escape hatch: force-reload catalog.json into the live database right
   now, regardless of dataVersion. Requires explicit confirm:true so this
   can never fire by accident — it overwrites ALL live tenant/product edits
   with whatever is currently bundled in catalog.json. */
app.post('/api/admin/reseed', requireAdmin, async (req, res) => {
  if (req.body?.confirm !== true) return res.status(400).json({ error: 'Pass {"confirm":true} to overwrite live data with catalog.json.' });
  catalog = SEED;
  await db.saveCatalog(catalog);
  indexCatalog();
  res.json({ ok: true, dataVersion: catalog.dataVersion || 0, tenants: (catalog.building.tenants || []).length });
});
app.get('/api/admin/data-status', requireAdmin, async (req, res) => {
  const live = await db.getCatalog();
  res.json({
    storage: db.kind,
    persistent: db.kind === 'postgres',
    fileVersion: SEED.dataVersion || 0,
    liveVersion: live ? (live.dataVersion || 0) : null,
    liveTenantCount: live ? (live.building.tenants || []).length : 0,
    fileTenantCount: (SEED.building.tenants || []).length,
    inSync: !!live && (live.dataVersion || 0) >= (SEED.dataVersion || 0)
  });
});
app.get('/api/admin/ussd-log', requireAdmin, (req, res) => res.json({ messages: ussdLog }));

/* ════════════════════════════════════════════════════════════════
   AMBASSADOR BMS API — all key-protected (same ADMIN_KEY as everything
   else in /admin.html). Operates on the same tenants as the storefront.
═══════════════════════════════════════════════════════════════════ */

app.get('/api/admin/bms/tenants', requireBms, async (req, res) => {
  const leases = await db.allLeases();
  const byUnit = {}; leases.forEach(l => { byUnit[l.unit] = l; });
  const tenants = (B.tenants || []).map(t => Object.assign({}, t, { lease: byUnit[t.unit || t.id.toUpperCase()] || null }));
  res.json({ tenants });
});

app.get('/api/admin/bms/leases', requireBms, async (req, res) => res.json({ leases: await db.allLeases() }));
app.put('/api/admin/bms/lease', requireBms, async (req, res) => {
  try {
    const input = (req.body && req.body.lease) || {};
    const unit = ('' + (input.unit || '')).toUpperCase();
    const t = (B.tenants || []).find(x => (x.unit || x.id.toUpperCase()) === unit);
    if (!t) return res.status(404).json({ error: 'No tenant on unit ' + unit });
    const existing = await db.leaseByUnit(unit);
    const start = input.start || bIso(new Date());
    const payload = {
      unit, start,
      end: input.end || bIso(bAddMonths(new Date(start), 12)),
      cycleMonths: Math.max(1, parseInt(input.cycleMonths, 10) || (existing ? existing.cycle_months : 1)),
      firstPeriodMonths: Math.max(1, parseInt(input.firstPeriodMonths, 10) || (existing ? existing.first_period_months : 1)),
      deposit: input.deposit !== undefined ? parseInt(input.deposit, 10) || 0 : (existing ? existing.deposit : 0),
      rent: input.rent !== undefined ? parseInt(input.rent, 10) || 0 : (existing ? existing.rent : 0)
    };
    const summary = 'Lease ' + unit + ' · ' + t.name + ' · rent ' + payload.rent +
                    ' · ' + payload.start + ' → ' + payload.end;
    if (await queueIfDual(req, res, 'lease.save', payload, summary)) return;
    const lease = await applyBmsAction('lease.save', payload);
    await bmsAudit(req, 'lease.save', summary);
    res.json({ lease });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/bms/lease/:unit', requireBms, async (req, res) => {
  const unit = req.params.unit.toUpperCase();
  const summary = 'Delete lease on ' + unit;
  if (await queueIfDual(req, res, 'lease.delete', { unit }, summary)) return;
  await applyBmsAction('lease.delete', { unit });
  await bmsAudit(req, 'lease.delete', summary);
  res.json({ ok: true });
});

app.get('/api/admin/bms/invoices', requireBms, async (req, res) => {
  const rows = req.query.unit ? await db.invoicesByUnit(req.query.unit.toUpperCase()) : await db.allInvoices();
  const config = await getBmsConfigSafe();
  const withPenalty = rows.map(i => Object.assign({}, i, { daysLate: bDaysLate(i), penaltyDue: bPenaltyOf(i, config) }));
  res.json({ invoices: withPenalty });
});
/* Record a payment against an invoice. Supports PARTIAL payment — common when
   a tenant pays half now — and issues a sequential receipt number. Money is
   never marked received without an amount, method and audit entry. */
app.post('/api/admin/bms/invoice/:id/pay', requireBms, async (req, res) => {
  const config = await getBmsConfigSafe();
  const inv = (await db.allInvoices()).find(i => i.id === req.params.id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  const penalty = bPenaltyOf(inv, config);
  const alreadyPaid = inv.paid_amount || 0;
  const owed = (inv.amount || 0) + penalty - alreadyPaid;
  const amount = req.body && req.body.amount !== undefined
    ? parseInt(req.body.amount, 10) : owed;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Enter the amount received' });
  if (amount > owed) return res.status(400).json({ error: 'That is more than the ' + owed + ' still owed on this invoice' });
  const payload = {
    invoiceId: inv.id, unit: inv.unit, amount, penalty,
    method: ('' + ((req.body && req.body.method) || 'bank_transfer')).slice(0, 30),
    ref: ('' + ((req.body && req.body.ref) || '')).slice(0, 60),
    note: ('' + ((req.body && req.body.note) || '')).slice(0, 200),
    paidAt: (req.body && req.body.paidAt) || bIso(new Date())
  };
  const summary = 'Payment ' + amount + ' on ' + inv.unit + ' invoice ' + inv.id +
                  ' (' + payload.method + (payload.ref ? ' ref ' + payload.ref : '') + ')';
  if (await queueIfDual(req, res, 'invoice.pay', payload, summary)) return;
  const out = await applyBmsAction('invoice.pay', Object.assign({}, payload, {
    takenBy: req.bms ? req.bms.name : 'Administrator' }));
  await bmsAudit(req, 'invoice.pay', summary);
  res.json(out);
});
/* A receipt any tenant or manager can print. */
app.get('/api/admin/bms/receipt/:no', requireBms, async (req, res) => {
  const pay = await db.paymentByReceipt(req.params.no);
  if (!pay) return res.status(404).json({ error: 'No such receipt' });
  const t = (B.tenants || []).find(x => (x.unit || x.id.toUpperCase()) === pay.unit);
  res.json({ payment: pay, tenant: t ? { name: t.name, floor: t.floor, unit: t.unit } : null,
    building: { name: B.name, location: B.location, phone: B.phone } });
});
app.get('/api/admin/bms/payments', requireBms, async (req, res) => {
  res.json({ payments: req.query.unit ? await db.paymentsByUnit(req.query.unit.toUpperCase()) : await db.allPayments() });
});
app.post('/api/admin/bms/sweep', requireBms, async (req, res) => {
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
  await bmsAudit(req, 'invoice.sweep', 'Generated ' + created + ' invoice(s), ' + overdue + ' marked overdue');
  res.json({ invoicesCreated: created, markedOverdue: overdue });
});

/* ── lease renewal: one click instead of retyping the whole lease ── */
app.post('/api/admin/bms/lease/:unit/renew', requireBms, async (req, res) => {
  const unit = req.params.unit.toUpperCase();
  const l = await db.leaseByUnit(unit);
  if (!l) return res.status(404).json({ error: 'No lease on ' + unit });
  const months = Math.max(1, parseInt(req.body && req.body.months, 10) || 12);
  const base = bDateOnly(l.end_date || l.end) > bDateOnly(bIso(new Date()))
    ? new Date(l.end_date || l.end) : new Date();          // extend, don't backdate
  const newEnd = bIso(bAddMonths(base, months));
  const newRent = req.body && req.body.rent !== undefined ? parseInt(req.body.rent, 10) : undefined;
  const payload = { unit, newEnd, newRent };
  const summary = 'Renew ' + unit + ' by ' + months + ' months → ' + newEnd +
                  (newRent !== undefined ? ' at rent ' + newRent : '');
  if (await queueIfDual(req, res, 'lease.renew', payload, summary)) return;
  await applyBmsAction('lease.renew', payload);
  await bmsAudit(req, 'lease.renew', summary);
  res.json({ ok: true, end: newEnd });
});

/* ── deposit: held, deducted, refunded — was stored but never used ── */
app.get('/api/admin/bms/deposits', requireBms, async (req, res) => {
  const leases = await db.allLeases();
  const rows = leases.map(l => {
    const t = (B.tenants || []).find(x => (x.unit || x.id.toUpperCase()) === l.unit);
    return { unit: l.unit, tenant: t ? t.name : l.unit, deposit: l.deposit || 0,
             end: l.end_date || l.end, active: t ? t.active !== false : false };
  }).filter(r => r.deposit > 0);
  res.json({ deposits: rows, totalHeld: rows.reduce((s, r) => s + r.deposit, 0) });
});
app.post('/api/admin/bms/deposit/:unit/settle', requireBms, async (req, res) => {
  const unit = req.params.unit.toUpperCase();
  const l = await db.leaseByUnit(unit);
  if (!l) return res.status(404).json({ error: 'No lease on ' + unit });
  const held = l.deposit || 0;
  const deducted = Math.max(0, parseInt((req.body && req.body.deducted) || 0, 10));
  const refunded = Math.max(0, parseInt((req.body && req.body.refunded) || 0, 10));
  if (deducted + refunded > held)
    return res.status(400).json({ error: 'Deducted + refunded cannot exceed the ' + held + ' held' });
  const payload = { unit, deducted, refunded, note: ('' + ((req.body && req.body.note) || '')).slice(0, 200) };
  const summary = 'Settle deposit ' + unit + ': deduct ' + deducted + ', refund ' + refunded;
  if (await queueIfDual(req, res, 'deposit.settle', payload, summary)) return;
  await applyBmsAction('deposit.settle', payload);
  await bmsAudit(req, 'deposit.settle', summary);
  res.json({ ok: true });
});

/* ── utilities & service charges: bill anything that isn't rent ── */
app.post('/api/admin/bms/charge', requireBms, async (req, res) => {
  const b = req.body || {};
  const unit = ('' + (b.unit || '')).toUpperCase();
  const t = (B.tenants || []).find(x => (x.unit || x.id.toUpperCase()) === unit);
  if (!t) return res.status(404).json({ error: 'No tenant on ' + unit });
  const amount = parseInt(b.amount, 10);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount is required' });
  const kind = ['water','electricity','service','cleaning','security','other'].indexOf(b.kind) >= 0 ? b.kind : 'other';
  const inv = {
    id: 'CHG-' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase(),
    unit, periodStart: b.periodStart || bIso(new Date()), periodEnd: b.periodEnd || bIso(new Date()),
    periodMonths: 1, dueDate: b.dueDate || bIso(bAddMonths(new Date(), 1)),
    amount, status: 'due', kind, paidAmount: 0
  };
  const summary = 'Charge ' + unit + ' · ' + kind + ' · ' + amount;
  if (await queueIfDual(req, res, 'charge.add', { invoice: inv }, summary)) return;
  await applyBmsAction('charge.add', { invoice: inv });
  await bmsAudit(req, 'charge.add', summary);
  res.json({ ok: true, invoice: inv });
});
/* apply the same charge to every occupied unit — e.g. a monthly service fee */
app.post('/api/admin/bms/charge/bulk', requireBms, async (req, res) => {
  const b = req.body || {};
  const amount = parseInt(b.amount, 10);
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Amount is required' });
  const kind = ['water','electricity','service','cleaning','security','other'].indexOf(b.kind) >= 0 ? b.kind : 'service';
  const units = (B.tenants || []).filter(t => t.active !== false).map(t => t.unit || t.id.toUpperCase());
  const summary = 'Bulk ' + kind + ' charge of ' + amount + ' to ' + units.length + ' units';
  if (await queueIfDual(req, res, 'charge.bulk', { units, amount, kind, dueDate: b.dueDate }, summary)) return;
  const r = await applyBmsAction('charge.bulk', { units, amount, kind, dueDate: b.dueDate });
  await bmsAudit(req, 'charge.bulk', summary);
  res.json(r);
});

/* ── documents: lease agreements, IDs, trade licences ── */
app.post('/api/admin/bms/doc', requireBms, async (req, res) => {
  const b = req.body || {};
  const unit = ('' + (b.unit || '')).toUpperCase();
  const data = '' + (b.data || '');
  if (!unit || !data) return res.status(400).json({ error: 'Unit and file are required' });
  if (data.length > 3000000) return res.status(413).json({ error: 'File is too large (max ~2MB)' });
  const doc = { id: 'doc-' + Date.now().toString(36), unit,
    title: ('' + (b.title || 'Document')).slice(0, 120),
    kind: ('' + (b.kind || 'other')).slice(0, 30), data,
    uploadedBy: req.bms ? req.bms.name : 'Administrator' };
  await db.insertDoc(doc);
  await bmsAudit(req, 'doc.upload', 'Uploaded "' + doc.title + '" for ' + unit);
  res.json({ ok: true, id: doc.id });
});
app.get('/api/admin/bms/docs', requireBms, async (req, res) => {
  const unit = ('' + (req.query.unit || '')).toUpperCase();
  res.json({ docs: unit ? await db.docsByUnit(unit) : [] });
});
app.get('/api/admin/bms/doc/:id', requireBms, async (req, res) => {
  const d = await db.getDoc(req.params.id);
  if (!d) return res.status(404).json({ error: 'Not found' });
  res.json({ doc: d });
});
app.delete('/api/admin/bms/doc/:id', requireBms, async (req, res) => {
  await db.deleteDoc(req.params.id);
  await bmsAudit(req, 'doc.delete', 'Deleted document ' + req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/bms/finance', requireBms, async (req, res) => res.json({ entries: await db.allFinance() }));
app.put('/api/admin/bms/finance', requireBms, async (req, res) => {
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
    const summary = (entry.type === 'income' ? 'Income ' : 'Expense ') + entry.amount +
                    ' · ' + entry.category + (entry.unit ? ' · ' + entry.unit : '');
    if (await queueIfDual(req, res, 'finance.save', { entry }, summary)) return;
    await applyBmsAction('finance.save', { entry });
    await bmsAudit(req, 'finance.save', summary);
    res.json({ entry });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.delete('/api/admin/bms/finance/:id', requireBms, async (req, res) => {
  const summary = 'Delete ledger entry ' + req.params.id;
  if (await queueIfDual(req, res, 'finance.delete', { id: req.params.id }, summary)) return;
  await applyBmsAction('finance.delete', { id: req.params.id });
  await bmsAudit(req, 'finance.delete', summary);
  res.json({ ok: true });
});

app.get('/api/admin/bms/tickets', requireBms, async (req, res) => res.json({ tickets: await db.allTickets() }));
app.put('/api/admin/bms/ticket', requireBms, async (req, res) => {
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
app.post('/api/admin/bms/ticket/:id/status', requireBms, async (req, res) => {
  const status = (req.body && req.body.status) || '';
  if (!['open','prog','done'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  // closing a job with a repair cost posts it to the expense ledger, so
  // maintenance spend shows up in the building's finances automatically
  const cost = parseInt((req.body && req.body.cost) || 0, 10);
  if (status === 'done' && cost > 0) {
    const tk = (await db.allTickets()).find(t => t.id === req.params.id);
    await db.insertFinance({
      id: 'EXP-' + req.params.id, type: 'expense', date: bIso(new Date()),
      category: 'Maintenance', amount: cost, unit: tk ? tk.loc : null,
      note: 'Ticket ' + req.params.id + (tk ? ' · ' + tk.title : '')
    });
    await bmsAudit(req, 'ticket.cost', 'Maintenance cost ' + cost + ' on ' + req.params.id);
  }
  const row = await db.updateTicketStatus(req.params.id, status, status === 'done' ? bIso(new Date()) : null);
  if (!row) return res.status(404).json({ error: 'Ticket not found' });
  res.json({ ticket: row });
});

app.get('/api/admin/bms/announcements', requireBms, async (req, res) => res.json({ announcements: await db.allAnnouncements() }));
app.put('/api/admin/bms/announcement', requireBms, async (req, res) => {
  const input = (req.body && req.body.announcement) || {};
  if (!input.title || !input.body) return res.status(400).json({ error: 'Title and message are required' });
  const a = { id: 'AN-' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase(),
    title: ('' + input.title).slice(0, 120), aud: input.aud || 'all', body: ('' + input.body).slice(0, 1000), at: bIso(new Date()) };
  await db.insertAnnouncement(a);
  res.json({ announcement: a });
});
app.delete('/api/admin/bms/announcement/:id', requireBms, async (req, res) => { await db.deleteAnnouncement(req.params.id); res.json({ ok: true }); });

app.get('/api/admin/bms/config', requireBms, async (req, res) => res.json({ config: await getBmsConfigSafe() }));
app.put('/api/admin/bms/config', requireBms, async (req, res) => {
  const input = (req.body && req.body.config) || {};
  /* BUG FIX: this used to rebuild from defaultBmsConfig(), which silently wiped
     the BMS users list and the mode on every settings save. Start from the
     CURRENT config and change only what was sent. */
  const cur = await getBmsConfigSafe();
  const parts = [];
  let penalty = cur.penalty, accounts = cur.accounts;
  if (input.penalty && typeof input.penalty.amount === 'number') {
    penalty = { amount: input.penalty.amount, per: input.penalty.per === 'week' ? 'week' : 'day' };
    parts.push('penalty ' + penalty.amount + '/' + penalty.per);
  }
  if (Array.isArray(input.accounts)) {
    accounts = input.accounts
      .map(a => ({ bank: ('' + (a.bank||'')).trim().slice(0,60),
                   number: ('' + (a.number||'')).trim().slice(0,40),
                   holder: ('' + (a.holder||'')).trim().slice(0,80) }))
      .filter(a => a.bank && a.number);
    parts.push(accounts.length + ' bank account(s)');
  }
  const summary = 'Building settings: ' + (parts.join(', ') || 'no change');
  if (input.penalty && await queueIfDual(req, res, 'config.penalty', { penalty }, summary)) return;
  if (Array.isArray(input.accounts) && await queueIfDual(req, res, 'config.accounts', { accounts }, summary)) return;
  const cfg = Object.assign({}, cur, { penalty, accounts });
  await db.saveBmsConfig(cfg);
  await bmsAudit(req, 'config.save', summary);
  res.json({ config: cfg });
});

/* Applies a BMS action. Called directly in single mode, or by an authorisor
   approving a queued item in dual mode — so both paths share identical logic. */
async function applyBmsAction(action, p){
  if (action === 'lease.save') {
    const t = (B.tenants || []).find(x => (x.unit || x.id.toUpperCase()) === p.unit);
    if (!t) throw new Error('No tenant on unit ' + p.unit);
    const existing = await db.leaseByUnit(p.unit);
    const lease = {
      unit: p.unit, tenantId: t.id, start: p.start,
      end: p.end, cycleMonths: p.cycleMonths, firstPeriodMonths: p.firstPeriodMonths,
      firstDone: existing ? existing.first_done : false,
      nextDue: existing ? existing.next_due : p.start,
      deposit: p.deposit, rent: p.rent
    };
    await db.upsertLease(lease);
    return lease;
  }
  if (action === 'lease.delete') { await db.deleteLease(p.unit); return true; }
  if (action === 'config.accounts') {
    const c = await getBmsConfigSafe(); c.accounts = p.accounts; await db.saveBmsConfig(c); return c.accounts;
  }
  if (action === 'config.penalty') {
    const c = await getBmsConfigSafe(); c.penalty = p.penalty; await db.saveBmsConfig(c); return c.penalty;
  }
  if (action === 'finance.save')   { await db.insertFinance(p.entry); return true; }
  if (action === 'finance.delete') { await db.deleteFinance(p.id); return true; }
  if (action === 'invoice.pay') {
    const inv = (await db.allInvoices()).find(i => i.id === p.invoiceId);
    if (!inv) throw new Error('Invoice no longer exists');
    const receiptNo = await db.nextReceiptNo();
    const paidTotal = (inv.paid_amount || 0) + p.amount;
    const fullyPaid = paidTotal >= (inv.amount || 0) + (p.penalty || 0);
    await db.updateInvoice(p.invoiceId, {
      status: fullyPaid ? 'paid' : 'partial',
      paid_at: fullyPaid ? (p.paidAt || bIso(new Date())) : null,
      paid_amount: paidTotal, method: p.method, ref: p.ref,
      receipt_no: receiptNo, penalty_paid: fullyPaid ? (p.penalty || 0) : 0
    });
    const payment = await db.insertPayment(Object.assign({}, p, { receiptNo }));
    // rent received is real income — post it to the ledger automatically
    await db.insertFinance({
      id: 'INC-' + receiptNo, type: 'income', date: p.paidAt || bIso(new Date()),
      category: 'Rent', amount: p.amount, unit: p.unit,
      note: 'Invoice ' + p.invoiceId + ' · receipt ' + receiptNo
    });
    return { receiptNo, payment, fullyPaid, outstanding: Math.max(0, (inv.amount||0) + (p.penalty||0) - paidTotal) };
  }
  if (action === 'charge.add') { await db.insertInvoice(p.invoice); return true; }
  if (action === 'charge.bulk') {
    let n = 0;
    for (const unit of p.units) {
      await db.insertInvoice({
        id: 'CHG-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2,6).toUpperCase(),
        unit, periodStart: bIso(new Date()), periodEnd: bIso(new Date()), periodMonths: 1,
        dueDate: p.dueDate || bIso(bAddMonths(new Date(), 1)),
        amount: p.amount, status: 'due', kind: p.kind, paidAmount: 0
      });
      n++;
    }
    return { created: n };
  }
  if (action === 'lease.renew') {
    const l = await db.leaseByUnit(p.unit);
    if (!l) throw new Error('No lease on ' + p.unit);
    await db.upsertLease({
      unit: l.unit, tenantId: l.tenant_id, start: l.start_date, end: p.newEnd,
      cycleMonths: l.cycle_months, firstPeriodMonths: l.first_period_months,
      firstDone: l.first_done, nextDue: l.next_due,
      deposit: p.deposit !== undefined ? p.deposit : l.deposit,
      rent: p.newRent !== undefined ? p.newRent : l.rent
    });
    return true;
  }
  if (action === 'deposit.settle') {
    const l = await db.leaseByUnit(p.unit);
    if (!l) throw new Error('No lease on ' + p.unit);
    if (p.deducted > 0) {
      await db.insertFinance({ id: 'INC-DEP-' + Date.now().toString(36).toUpperCase(),
        type: 'income', date: bIso(new Date()), category: 'Deposit forfeited',
        amount: p.deducted, unit: p.unit, note: p.note || 'Deducted from deposit' });
    }
    if (p.refunded > 0) {
      await db.insertFinance({ id: 'EXP-DEP-' + Date.now().toString(36).toUpperCase(),
        type: 'expense', date: bIso(new Date()), category: 'Deposit refund',
        amount: p.refunded, unit: p.unit, note: p.note || 'Deposit returned to tenant' });
    }
    return true;
  }
  throw new Error('Unknown action ' + action);
}

/* ── admin grants BMS access ── */
app.get('/api/admin/bms/users', requireAdmin, async (req, res) => {
  const c = await getBmsConfigSafe();
  res.json({ mode: c.mode || 'single',
    users: (c.users || []).map(u => ({ id:u.id, name:u.name, phone:u.phone, role:u.role, active:u.active !== false })) });
});
app.put('/api/admin/bms/mode', requireAdmin, async (req, res) => {
  const mode = req.body && req.body.mode === 'dual' ? 'dual' : 'single';
  const c = await getBmsConfigSafe(); c.mode = mode;
  await db.saveBmsConfig(c);
  res.json({ ok: true, mode });
});
app.post('/api/admin/bms/user', requireAdmin, async (req, res) => {
  const b = req.body || {};
  const name = ('' + (b.name || '')).trim().slice(0, 80);
  const phone = normPhone(('' + (b.phone || '')).trim());
  const role = ['inputer','authorisor','manager'].indexOf(b.role) >= 0 ? b.role : 'inputer';
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone are required' });
  const c = await getBmsConfigSafe();
  c.users = c.users || [];
  if (c.users.some(u => u.phone === phone && u.id !== b.id))
    return res.status(400).json({ error: 'That phone already has a building-console account' });
  // a fresh code is shown ONCE; only its hash is stored
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const existing = b.id ? c.users.find(u => u.id === b.id) : null;
  if (existing) {
    existing.name = name; existing.phone = phone; existing.role = role;
    if (b.resetCode) existing.codeHash = sha256(code);
  } else {
    c.users.push({ id: 'bms-' + Date.now().toString(36), name, phone, role,
      codeHash: sha256(code), active: true });
  }
  await db.saveBmsConfig(c);
  res.json({ ok: true, code: (!existing || b.resetCode) ? code : null, phone });
});
app.post('/api/admin/bms/user/:id/active', requireAdmin, async (req, res) => {
  const c = await getBmsConfigSafe();
  const u = (c.users || []).find(x => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'No such user' });
  u.active = !!(req.body && req.body.active);
  await db.saveBmsConfig(c);
  res.json({ ok: true, active: u.active });
});
app.delete('/api/admin/bms/user/:id', requireAdmin, async (req, res) => {
  const c = await getBmsConfigSafe();
  c.users = (c.users || []).filter(x => x.id !== req.params.id);
  await db.saveBmsConfig(c);
  res.json({ ok: true });
});

/* ── approval queue ── */
app.get('/api/bms/pending', requireBms, async (req, res) => {
  res.json({ mode: await bmsMode(), pending: await db.allPending('pending'),
    recent: (await db.allPending()).filter(p => p.status !== 'pending').slice(0, 40) });
});
app.post('/api/bms/pending/:id/decide', requireBms, requireAuthorisor, async (req, res) => {
  const row = await db.getPending(req.params.id);
  if (!row || row.status !== 'pending') return res.status(404).json({ error: 'Nothing pending with that id' });
  const approve = !!(req.body && req.body.approve);
  // an inputer must never be able to wave through their own entry
  if (approve && !req.bms.isAdmin && row.made_by === req.bms.id)
    return res.status(403).json({ error: 'You cannot approve a change you submitted yourself' });
  if (!approve) {
    await db.decidePending(row.id, 'rejected', req.bms.id, req.bms.name, (req.body && req.body.reason) || '');
    await bmsAudit(req, 'reject:' + row.action, row.summary);
    return res.json({ ok: true, status: 'rejected' });
  }
  const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
  try {
    await applyBmsAction(row.action, payload);
  } catch (e) {
    return res.status(400).json({ error: 'Could not apply: ' + e.message });
  }
  await db.decidePending(row.id, 'approved', req.bms.id, req.bms.name, '');
  await bmsAudit(req, 'approve:' + row.action, row.summary);
  res.json({ ok: true, status: 'approved' });
});
app.get('/api/bms/audit', requireBms, async (req, res) => {
  res.json({ entries: await db.allAudit(200) });
});

/* ── ONE source of truth for vacancy ──
   Previously the BMS dashboard counted (tenants − active tenants) while the
   storefront showed a separate hand-typed list, so the two could disagree.
   Now both read this: a unit is vacant if it has no active tenant, or it was
   explicitly listed by management. Leases ending soon are surfaced too, so a
   unit becomes a leasing lead before it actually empties. */
async function vacancyPicture(){
  const tenants = B.tenants || [];
  const leases = await db.allLeases();
  const today = bDateOnly(bIso(new Date()));
  const manual = (B.vacantUnits || []).map(v => ({
    unit: v.unit, floor: v.floor, source: 'listed', tenant: null
  }));
  const inactive = tenants.filter(t => t.active === false).map(t => ({
    unit: t.unit || t.id.toUpperCase(), floor: t.floor, source: 'terminated', tenant: t.name
  }));
  const byUnit = {};
  [...manual, ...inactive].forEach(v => { if (!byUnit[v.unit]) byUnit[v.unit] = v; });
  const vacant = Object.values(byUnit);

  const expiring = leases.map(l => {
    const t = tenants.find(x => (x.unit || x.id.toUpperCase()) === l.unit);
    const end = bDateOnly(l.end);
    const days = Math.round((end - today) / 86400000);
    return { unit: l.unit, tenant: t ? t.name : l.unit, floor: t ? t.floor : '',
             end: l.end, daysLeft: days, rent: l.rent };
  }).filter(x => x.daysLeft <= 90).sort((a,b) => a.daysLeft - b.daysLeft);

  return {
    vacant,
    vacantCount: vacant.length,
    occupiedCount: tenants.filter(t => t.active !== false).length - 0,
    totalUnits: tenants.length,
    expiringSoon: expiring.filter(x => x.daysLeft >= 0),
    expired: expiring.filter(x => x.daysLeft < 0)
  };
}
/* Public: the storefront's office-for-rent list now reads the same picture. */
app.get('/api/vacant-units', async (req, res) => {
  const v = await vacancyPicture();
  res.json({ vacantUnits: v.vacant.map(x => ({ unit: x.unit, floor: x.floor })) });
});

app.get('/api/admin/bms/dashboard', requireBms, async (req, res) => {
  const tenants = B.tenants || [];
  const occupied = tenants.filter(t => t.active !== false).length;
  const vac = await vacancyPicture();
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
    totalUnits: tenants.length, occupiedUnits: occupied,
    vacantUnits: vac.vacantCount,            // same number the storefront shows
    vacantList: vac.vacant,
    expiringSoon: vac.expiringSoon, expired: vac.expired,
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

/* ── unoccupied offices (Ground/1st/2nd/4th floor slots with no tenant) ──
   Single source of truth for the storefront's "See Offices" gallery, the
   admin dashboard, and the BMS's own office-for-rent manager — no more
   hardcoded/sample vacancy data.
   Full shape: { unit, floor, size, price, care, carePrice, images[<=3],
   phone, showCall, notes }. price/care/carePrice are free-text (a unit
   might be "negotiable" rather than a fixed number) — leave blank to show
   "Contact for pricing" on the storefront. showCall only ever renders a
   Call button when a phone number is also present. */
function normVacantUnit(input, existing){
  const v = existing ? Object.assign({}, existing) : {};
  if (input.unit !== undefined)  v.unit  = ('' + input.unit).trim().slice(0, 20);
  if (input.floor !== undefined) v.floor = ('' + input.floor).trim().slice(0, 40);
  if (input.size !== undefined)      v.size = ('' + input.size).trim().slice(0, 40);
  if (input.price !== undefined)     v.price = ('' + input.price).trim().slice(0, 40);
  if (input.care !== undefined)      v.care = ('' + input.care).trim().slice(0, 60);
  if (input.carePrice !== undefined) v.carePrice = ('' + input.carePrice).trim().slice(0, 40);
  if (input.notes !== undefined)     v.notes = ('' + input.notes).trim().slice(0, 500);
  if (input.phone !== undefined)     v.phone = ('' + input.phone).trim().slice(0, 30);
  if (input.showCall !== undefined)  v.showCall = !!input.showCall;
  if (Array.isArray(input.images))   v.images = input.images.filter(isImageRef).slice(0, 3);
  return v;
}
app.get('/api/admin/vacant-units', requireAdmin, (req, res) => {
  res.json({ vacantUnits: B.vacantUnits || [] });
});
app.put('/api/admin/vacant-units', requireAdmin, async (req, res) => {
  // admin's editor only ever sends {unit, floor} per row — match against the
  // existing list by unit code so any richer fields the BMS already filled
  // in (price, care fee, photos…) survive an admin-side save instead of
  // being silently wiped out.
  const input = Array.isArray(req.body && req.body.vacantUnits) ? req.body.vacantUnits : [];
  const existingList = B.vacantUnits || [];
  const clean = input
    .map(v => {
      const unit = ('' + (v.unit || '')).trim().slice(0, 20);
      const floor = ('' + (v.floor || '')).trim().slice(0, 40);
      if (!unit || !floor) return null;
      const prior = existingList.find(e => e.unit === unit);
      return normVacantUnit({ unit, floor }, prior);
    })
    .filter(Boolean)
    .slice(0, 100);
  await mutateCatalog(c => { c.building.vacantUnits = clean; });
  res.json({ vacantUnits: clean });
});
/* BMS's own office-for-rent manager — full read/write of every field above.
   Reads/writes the exact same catalog.building.vacantUnits list as the
   platform-admin route; either side can list/manage vacant units. */
app.get('/api/admin/bms/vacant-units', requireBms, (req, res) => {
  res.json({ vacantUnits: B.vacantUnits || [] });
});
app.put('/api/admin/bms/vacant-units', requireBms, async (req, res) => {
  const input = Array.isArray(req.body && req.body.vacantUnits) ? req.body.vacantUnits : [];
  let imageError = false;
  const clean = input
    .map(v => {
      const unit = ('' + (v.unit || '')).trim().slice(0, 20);
      const floor = ('' + (v.floor || '')).trim().slice(0, 40);
      if (!unit || !floor) return null;
      if (Array.isArray(v.images) && v.images.length && !v.images.some(isImageRef)) imageError = true;
      return normVacantUnit(v, null);
    })
    .filter(Boolean)
    .slice(0, 100);
  if (imageError) return res.status(400).json({ error: 'Images must be URLs or data-URLs under 1.5MB each' });
  await mutateCatalog(c => { c.building.vacantUnits = clean; });
  res.json({ vacantUnits: clean });
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

/* ════════ JOB / VACANCY POSTS ════════
   Three kinds of poster, one shared board:
     • tenant  — a shop hiring its own staff (signed in on /seller.html)
     • mall    — Ambassador management hiring (admin console)
     • bms     — building operations hiring (BMS console)
   Shown publicly alongside the office-for-rent listings. ══════════ */
function normJob(input, existing, poster){
  const j = Object.assign({}, existing || {});
  const str=(v,n)=>('' + (v==null?'':v)).trim().slice(0,n);
  j.id = (existing && existing.id) || 'job-' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex');
  if (poster) { j.poster_type = poster.type; j.poster_id = poster.id || null; j.poster_name = poster.name || ''; }
  j.position    = str(input.position, 120);
  j.salary      = str(input.salary, 60);
  j.negotiable  = !!input.negotiable;
  j.hours       = str(input.hours, 120);
  j.location    = str(input.location, 120);
  j.employment_type = str(input.employmentType || input.employment_type, 40);
  j.description = str(input.description, 1200);
  j.contact_phone    = str(input.contactPhone || input.contact_phone, 30);
  j.contact_whatsapp = str(input.contactWhatsapp || input.contact_whatsapp, 30).replace(/\D/g,'');
  j.deadline    = str(input.deadline, 30);
  j.active      = input.active === undefined ? (existing ? existing.active : true) : !!input.active;
  return j;
}
function publicJob(j){
  return { id:j.id, posterType:j.poster_type, posterName:j.poster_name, position:j.position,
    salary:j.salary, negotiable:j.negotiable, hours:j.hours, location:j.location,
    employmentType:j.employment_type, description:j.description,
    contactPhone:j.contact_phone, contactWhatsapp:j.contact_whatsapp,
    deadline:j.deadline, createdAt:j.created_at };
}
/* public board — active posts only */
app.get('/api/jobs', async (req, res) => {
  const all = await db.allJobs();
  res.json({ jobs: all.filter(j => j.active !== false).map(publicJob) });
});
/* tenant-posted vacancies (a shop hiring for itself) */
app.get('/api/seller/jobs', requireSeller, async (req, res) => {
  res.json({ jobs: (await db.jobsByPoster('tenant', req.sellerTid)).map(publicJob) });
});
app.post('/api/seller/jobs', requireSeller, async (req, res) => {
  const t = TENANTS[req.sellerTid];
  const body = req.body || {};
  const existing = body.id ? await db.getJob(body.id) : null;
  if (existing && !(existing.poster_type === 'tenant' && existing.poster_id === req.sellerTid))
    return res.status(403).json({ error: 'That post belongs to another shop' });
  const j = normJob(body, existing, { type:'tenant', id:t.id, name:t.name });
  if (!j.position) return res.status(400).json({ error: 'Position is required' });
  if (!j.contact_phone && !j.contact_whatsapp) { j.contact_phone = t.mobile || ''; j.contact_whatsapp = t.whatsapp || ''; }
  await db.upsertJob(j);
  res.json({ ok:true, job: publicJob(j) });
});
app.delete('/api/seller/jobs/:id', requireSeller, async (req, res) => {
  const j = await db.getJob(req.params.id);
  if (!j || j.poster_type !== 'tenant' || j.poster_id !== req.sellerTid)
    return res.status(404).json({ error: 'Not found' });
  await db.deleteJob(req.params.id);
  res.json({ ok:true });
});
/* mall / building-operations vacancies — admin + BMS share one guard set */
function jobAdminRoutes(prefix, guard, posterType, posterName){
  app.get(prefix + '/jobs', guard, async (req, res) => {
    res.json({ jobs: (await db.allJobs()).map(publicJob) });   // staff see every post, incl. paused
  });
  app.post(prefix + '/jobs', guard, async (req, res) => {
    const body = req.body || {};
    const existing = body.id ? await db.getJob(body.id) : null;
    // staff may edit any post; a new post is attributed to whoever created it
    const j = normJob(body, existing, existing ? null : { type: posterType, id: null, name: posterName });
    if (!j.position) return res.status(400).json({ error: 'Position is required' });
    await db.upsertJob(j);
    res.json({ ok:true, job: publicJob(j) });
  });
  app.delete(prefix + '/jobs/:id', guard, async (req, res) => {
    await db.deleteJob(req.params.id);
    res.json({ ok:true });
  });
}
jobAdminRoutes('/api/admin', requireAdmin, 'mall', 'Ambassador Shopping Mall');
/* BMS shares the admin key but attributes its posts to building operations */
jobAdminRoutes('/api/admin/bms', requireAdmin, 'bms', 'Ambassador Building Management');

/* ── shop analytics: visits (profile opened) and shares, per shop per day ──
   Fire-and-forget from the storefront; never blocks the UI and never fails loudly. */
app.post('/api/tenant/:id/event', async (req, res) => {
  const t = TENANTS[req.params.id];
  const kind = ('' + ((req.body && req.body.kind) || '')).trim();
  if (!t) return res.status(404).json({ error: 'Unknown shop' });
  if (['visit', 'share'].indexOf(kind) < 0) return res.status(400).json({ error: 'Unknown event' });
  try { await db.logShopEvent(t.id, kind); } catch (e) { /* analytics must never break browsing */ }
  res.json({ ok: true });
});
/* admin: every shop, ranked */
app.get('/api/admin/shop-stats', requireAdmin, async (req, res) => {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 7));
  const rows = await db.shopStats(days);
  const by = {};
  rows.forEach(r => {
    by[r.tenant_id] = by[r.tenant_id] || { tenantId: r.tenant_id,
      name: (TENANTS[r.tenant_id] || {}).name || r.tenant_id,
      floor: (TENANTS[r.tenant_id] || {}).floor || '',
      unit: (TENANTS[r.tenant_id] || {}).unit || '',
      visitsToday: 0, visitsWindow: 0, visitsTotal: 0,
      sharesToday: 0, sharesWindow: 0, sharesTotal: 0 };
    const o = by[r.tenant_id];
    if (r.kind === 'visit') { o.visitsToday = r.today; o.visitsWindow = r.window; o.visitsTotal = r.total; }
    if (r.kind === 'share') { o.sharesToday = r.today; o.sharesWindow = r.window; o.sharesTotal = r.total; }
  });
  const list = Object.values(by).sort((a, b) => b.visitsWindow - a.visitsWindow);
  res.json({ days, shops: list,
    totals: list.reduce((t, s) => ({
      visitsToday: t.visitsToday + s.visitsToday, visitsWindow: t.visitsWindow + s.visitsWindow,
      sharesToday: t.sharesToday + s.sharesToday, sharesWindow: t.sharesWindow + s.sharesWindow
    }), { visitsToday: 0, visitsWindow: 0, sharesToday: 0, sharesWindow: 0 }) });
});
/* seller: only ever their own shop's numbers */
app.get('/api/seller/stats', requireSeller, async (req, res) => {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days, 10) || 7));
  const rows = (await db.shopStats(days)).filter(r => r.tenant_id === req.sellerTid);
  const pick = k => rows.find(r => r.kind === k) || { today: 0, window: 0, total: 0 };
  const v = pick('visit'), sh = pick('share');
  res.json({ days,
    visits: { today: v.today, window: v.window, total: v.total },
    shares: { today: sh.today, window: sh.window, total: sh.total } });
});

/* ── vCard: one tap to save a shop's contact into the phone's address book ── */
const SOCIAL_VCARD = {
  instagram:{ type:'instagram', base:'https://instagram.com/' },
  facebook: { type:'facebook',  base:'https://facebook.com/' },
  tiktok:   { type:'tiktok',    base:'https://tiktok.com/@' },
  telegram: { type:'telegram',  base:'https://t.me/' },
  youtube:  { type:'youtube',   base:'https://youtube.com/' },
  x:        { type:'twitter',   base:'https://x.com/' },
  twitter:  { type:'twitter',   base:'https://x.com/' },
  linkedin: { type:'linkedin',  base:'https://linkedin.com/company/' },
  website:  { type:'website',   base:'https://' }
};
function socialVcardLines(socials, esc){
  if (!socials) return [];
  const out = [];
  Object.keys(SOCIAL_VCARD).forEach(k => {
    const entry = socials[k];
    if (!entry) return;
    // stored either as a plain string or as { value, on } — respect the toggle
    const raw = typeof entry === 'object' ? entry.value : entry;
    const on  = typeof entry === 'object' ? entry.on !== false : true;
    if (!raw || !on) return;
    const def = SOCIAL_VCARD[k];
    const url = /^https?:\/\//i.test(raw) ? raw : def.base + String(raw).replace(/^@/, '');
    out.push('X-SOCIALPROFILE;TYPE=' + def.type + ':' + esc(url));
    out.push('URL;TYPE=' + def.type + ':' + esc(url));
  });
  return out;
}
app.get('/api/tenant/:id/vcard', (req, res) => {
  const t = TENANTS[req.params.id];
  if (!t) return res.status(404).send('Not found');
  const esc = v => ('' + (v || '')).replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const tel = (t.mobile || (t.whatsapp ? '+' + t.whatsapp : '')).replace(/\s/g, '');
  const where = [t.floor, t.unit].filter(Boolean).join(' - ');
  const lines = [
    'BEGIN:VCARD', 'VERSION:3.0',
    'N:;' + esc(t.name) + ';;;',
    'FN:' + esc(t.name),
    'ORG:' + esc(t.name) + ';' + esc(B.name || 'Ambassador Shopping Mall'),
    t.cat ? 'TITLE:' + esc(t.cat) : null,
    tel ? 'TEL;TYPE=CELL,VOICE:' + tel : null,
    t.whatsapp ? 'TEL;TYPE=WhatsApp:+' + t.whatsapp : null,
    'ADR;TYPE=WORK:;;' + esc(where + ', ' + (B.name || '')) + ';' + esc((B.location || 'Addis Ababa')) + ';;;Ethiopia',
    t.blurb ? 'NOTE:' + esc(t.blurb) : null,
    'URL:' + (req.protocol + '://' + req.get('host') + '/#tenant=' + t.id),
    /* social profiles — X-SOCIALPROFILE is what iOS/Android contacts read,
       and a plain URL line is added too so apps that ignore it still show them */
    ...socialVcardLines(t.socials, esc),
    'REV:' + new Date().toISOString(),
    'END:VCARD'
  ].filter(Boolean);
  const slug = ('' + t.name).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'contact';
  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="' + slug + '.vcf"');
  res.send(lines.join('\r\n'));
});

/* ── static frontend ── */
/* the service worker must never be cached long or clients get stuck on an
   old shell; the manifest needs its proper MIME type to be installable */
app.get('/sw.js', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.type('application/javascript');
  res.sendFile(path.join(__dirname, '..', 'public', 'sw.js'));
});
app.get('/manifest.webmanifest', (req, res) => {
  res.type('application/manifest+json');
  res.sendFile(path.join(__dirname, '..', 'public', 'manifest.webmanifest'));
});
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h', index: 'index.html' }));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

/* ── boot: load catalog from DB, auto-reseed when catalog.json has a newer
   dataVersion than what's live. This is what actually fixes "I updated
   catalog.json but the live site still shows old data" — previously the DB
   was seeded ONCE on first boot ever and catalog.json was never consulted
   again, so every later data update silently had zero effect in production.
   Now: bump dataVersion in catalog.json whenever you ship new real data, and
   the next deploy/restart picks it up automatically — no manual step, no
   wiping admin edits made after the last version bump. ── */
/* Fields a tenant or admin edits at runtime. A version bump must NEVER wipe
   these — the seed only supplies structure (new shops, floors, categories). */
const LIVE_TENANT_FIELDS = ['rating','reviews','blurb','socials','photo','logo','color','mobile','whatsapp',
  'owner','manager','responseTime','reviewLink','active','hidden','banks','products','appointments'];

function mergeSeedIntoLive(seed, live){
  if (!live || !live.building) return seed;
  const merged = JSON.parse(JSON.stringify(seed));
  const liveById = {};
  (live.building.tenants || []).forEach(t => { liveById[t.id] = t; });
  merged.building.tenants = (merged.building.tenants || []).map(st => {
    const lt = liveById[st.id];
    if (!lt) return st;                       // brand-new shop from the seed
    const out = Object.assign({}, st);
    LIVE_TENANT_FIELDS.forEach(f => { if (lt[f] !== undefined) out[f] = lt[f]; });
    return out;
  });
  // building-level things staff configure live
  ['sections','vacantUnits','commission'].forEach(k => {
    if (live.building[k] !== undefined) merged.building[k] = live.building[k];
  });
  return merged;
}

/* Ratings are authoritative in the tenant_ratings table; the copy inside the
   catalog doc is only a display cache. Rebuild it on every boot so a reseed,
   a restart, or a wiped catalog can never lose real votes. */
async function rehydrateRatings(){
  if (!db.tenantRatingAgg) return;
  const ids = (catalog.building.tenants || []).map(t => t.id);
  let changed = false;
  for (const id of ids) {
    try {
      const agg = await db.tenantRatingAgg(id);
      const t = catalog.building.tenants.find(x => x.id === id);
      if (t && (t.rating !== agg.rating || t.reviews !== agg.reviews)) {
        t.rating = agg.rating; t.reviews = agg.reviews; changed = true;
      }
    } catch (e) { /* a rating lookup failing must not block boot */ }
  }
  if (changed) await db.saveCatalog(catalog);
}

db.ready()
  .then(() => db.getCatalog())
  .then(doc => {
    const fileVer = SEED.dataVersion || 0;
    const dbVer = doc ? (doc.dataVersion || 0) : -1;
    if (doc && dbVer >= fileVer) { catalog = doc; return; }
    // NON-DESTRUCTIVE: take new structure from the seed, keep every live edit
    catalog = mergeSeedIntoLive(SEED, doc);
    const reason = doc
      ? `live data was v${dbVer}, catalog.json is v${fileVer} — merged, live edits preserved`
      : 'no live data yet — first seed';
    return db.saveCatalog(catalog).then(() => console.log(`[catalog] ${reason}`));
  })
  .then(() => { indexCatalog(); return rehydrateRatings(); })
  .then(() => {
    indexCatalog();
    if (db.kind !== 'postgres') {
      console.warn('');
      console.warn('  ****************************************************************');
      console.warn('  *  WARNING: no DATABASE_URL — using a JSON file on local disk. *');
      console.warn('  *  On Render/Heroku free tiers that disk is EPHEMERAL: ratings, *');
      console.warn('  *  vacancies, product edits and orders WILL BE LOST on restart. *');
      console.warn('  *  Attach a Postgres database and set DATABASE_URL.             *');
      console.warn('  ****************************************************************');
      console.warn('');
    }
    app.listen(PORT, () => console.log(`Ambassador store v2 on :${PORT} (db: ${db.kind}, sms: ${process.env.SMS_PROVIDER || 'log-only'})`));
  })
  .catch(e => { console.error('Boot failed:', e); process.exit(1); });
