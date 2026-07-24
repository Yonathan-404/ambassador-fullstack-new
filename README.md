# Ambassador Shopping Center — Full-Stack Marketplace Storefront

A complete e-commerce storefront for a multi-tenant shopping building (Bisinka
directory template). Buyers browse every shop in the building, build a cart,
and check out **per seller** — paying each verified seller directly into their
own bank account, with WhatsApp confirmation, PDF invoices, delivery pricing by
Addis Ababa subcity (GPS or manual), 15% VAT, Google sign-in, order history,
and an admin dashboard.

**Stack:** Node.js + Express · PostgreSQL (production) / JSON file (dev) ·
vanilla-JS single-page frontend (no build step) · Google Identity Services.

---

## Project layout

```
├── server/
│   ├── server.js      Express API + static file server (single file)
│   └── catalog.json   The catalog: building info, tenants, products, services,
│                      delivery zones, VAT, legal text. EDIT THIS to update the site.
├── public/
│   ├── index.html     The storefront (frontend, self-contained)
│   ├── admin.html     Key-protected admin dashboard (orders, sellers, products,
│   │                  services, on/off toggles, notify requests, SMS log)
│   └── seller.html    Per-seller portal (phone + access code login)
├── app.js             Frontend source (gets injected into public/index.html)
├── template.html      Frontend HTML shell used to rebuild index.html
├── render.yaml        One-click Render Blueprint (web service + Postgres)
├── run_tests_v2.sh    Live-server smoke test: auth, orders, SMS, seller/admin CRUD
├── run_tests_v3.sh    Live-server smoke test: on/off toggles + services CRUD
├── package.json
└── .env.example       All environment variables, documented
```

## Run locally

```bash
npm install
npm start            # http://localhost:3000  (uses a JSON file store — no DB needed)
```

Admin dashboard: `http://localhost:3000/admin.html` — set `ADMIN_KEY` in your
environment first (e.g. `ADMIN_KEY=mykey npm start`).

## Deploy on Render (recommended path)

1. Push this folder to a GitHub repository.
2. In Render: **New + → Blueprint**, pick the repo. Render reads `render.yaml`
   and creates a free **web service** + free **PostgreSQL** database, wiring
   `DATABASE_URL`, and auto-generating `JWT_SECRET` and `ADMIN_KEY`.
3. Deploy. Your store is live at `https://<your-service>.onrender.com`.
4. Find your `ADMIN_KEY` under the service → Environment, and use it at
   `/admin.html` to view orders.

> Free-tier notes: the web service sleeps after inactivity (first request takes
> ~30s to wake), and Render's free Postgres expires after 90 days unless
> upgraded. Without `DATABASE_URL` the app falls back to a JSON file, which is
> **wiped on every deploy/restart** on Render — keep the database attached.

## Enable real Google sign-in

1. Go to **console.cloud.google.com → APIs & Services → Credentials →
   Create credentials → OAuth client ID → Web application**.
2. Add Authorized JavaScript origins:
   - `https://<your-service>.onrender.com`
   - `http://localhost:3000` (for development)
3. Copy the **Client ID** into the `GOOGLE_CLIENT_ID` env var on Render and
   redeploy.

The frontend then renders the official Google button; the server verifies each
ID token with Google before creating the session (httpOnly cookie). Until you
set the client ID, a clearly-labeled **demo sign-in** is used so the whole flow
still works.

## Optional: Telegram order notifications

Set `TELEGRAM_BOT_TOKEN` (from @BotFather) and `TELEGRAM_CHAT_ID` (your chat or
group id). Every order is then pushed to that chat instantly — a practical way
for the marketplace operator to monitor orders until sellers have their own
dashboards.

## How money is kept honest

The client sends only product IDs, quantities, the chosen area, and the bank
key. **The server recomputes every price, the delivery fee, VAT and the total
from `catalog.json`** — a tampered client cannot change what the buyer is told
to pay. Delivery is restricted to the Addis Ababa zones listed in the catalog.

## Updating the store (no code needed)

Everything sellers/buyers see lives in `server/catalog.json`:
- **Tenants**: name, floor, WhatsApp, bank accounts, socials, review link…
- **Products**: price, images, stock state (`in | low | made | out`), variants…
- **Services**: Building Services listings (banking, health, beauty, etc.) —
  same shape as tenants, shown on the storefront but not sellable.
- **Delivery zones**: fee, ETA, coordinates (GPS snaps buyers to the nearest).
- **VAT**: `building.tax.rate` (set `0` to disable).
- **Legal**: Terms of Service & Privacy Policy text.
- **Admin contact**: phone / WhatsApp / Telegram / email.

Every tenant, product, and service carries an `active` flag (defaults to
`true`). **`GET /api/catalog` — the public endpoint the storefront actually
loads — silently drops anything with `active:false`**: the tenant disappears
from Our Sellers/On Sale/Shop All Products, the product disappears from its
seller's listing, the service disappears from Building Services. Nothing is
deleted; `/api/admin/catalog` (key-protected) always returns everything so it
can be found and switched back on. Placing an order against a disabled tenant
or product is also rejected server-side, so a stale link can't be used to buy
from something that's been turned off. Toggle from `/admin.html` (Sellers /
Products / Services tabs — one click each), or a seller can toggle their own
products from `/seller.html`.

Edit, commit, redeploy (or restart locally) — the frontend pulls the catalog
from `/api/catalog` on every load. The copy embedded in `index.html` is only a
fallback for offline/demo use.

> ⚠️ The shipped catalog contains **SAMPLE data**: bank account numbers, owner
> names/phones, TINs, review links and several photos are placeholders. Replace
> them before going live.

## Rebuilding the frontend after editing `app.js`

`public/index.html` = `template.html` with `app.js` injected into its single
`<script>` tag:

```bash
python3 - << 'EOF'
import re
html = open('template.html').read(); js = open('app.js').read()
m = re.search(r'<script>.*?</script>', html, flags=re.S)
open('public/index.html','w').write(html[:m.start()]+'<script>\n'+js+'\n</script>'+html[m.end():])
EOF
```

## API reference

| Method | Path                | Auth          | Purpose                                  |
|--------|---------------------|---------------|------------------------------------------|
| GET    | /api/health         | —             | liveness + storage kind                  |
| GET    | /api/config         | —             | runtime config (Google client id…)       |
| GET    | /api/catalog        | —             | full catalog                             |
| POST   | /api/auth/google    | —             | verify Google ID token → session cookie  |
| POST   | /api/auth/demo      | —             | demo session (when Google not configured)|
| GET    | /api/auth/me        | cookie        | current user                             |
| POST   | /api/auth/logout    | cookie        | clear session                            |
| POST   | /api/orders         | optional      | place order (server-side totals)         |
| GET    | /api/my/orders      | cookie/?phone | order history                            |
| POST   | /api/notify         | —             | back-in-stock request                    |
| GET    | /api/admin/orders   | x-admin-key   | all orders                               |
| GET    | /api/admin/notify   | x-admin-key   | all notify requests                      |
| GET    | /api/admin/catalog  | x-admin-key   | full catalog, **unfiltered** (incl. off) |
| PUT    | /api/admin/tenant   | x-admin-key   | create/update a tenant                   |
| DELETE | /api/admin/tenant/:id      | x-admin-key | delete a tenant + its products      |
| POST   | /api/admin/tenant/:id/toggle | x-admin-key | flip (or set) a tenant's active flag |
| PUT    | /api/admin/product  | x-admin-key   | create/update a product                  |
| DELETE | /api/admin/product/:pid    | x-admin-key | delete a product                    |
| POST   | /api/admin/product/:pid/toggle | x-admin-key | flip (or set) a product's active flag |
| PUT    | /api/admin/service  | x-admin-key   | create/update a Building Services entry  |
| DELETE | /api/admin/service/:id     | x-admin-key | delete a service                    |
| POST   | /api/admin/service/:id/toggle | x-admin-key | flip (or set) a service's active flag |

## Seller portal (`/seller.html`)

Each shop signs in with a **phone + 6-digit access code** that you issue from the
admin dashboard (Sellers tab → "Generate access code" — the code is shown once;
only a hash is stored). Sellers can:
- see **their own orders** the moment a buyer checks out
- move each order through the lifecycle: **placed → payment confirmed →
  preparing → out for delivery → delivered / cancelled**
- change **prices** and **stock** (in / low / made-to-order / sold out) — the
  storefront updates instantly, and sold-out products refuse new orders
- **turn any of their own products ON or OFF** — an instant self-service pause
  (e.g. a dish that's out of ingredients for the day) without touching stock
  state or asking the admin. The server enforces that a seller can only ever
  toggle products belonging to their own shop.

## Buyer SMS notifications

Buyers get an SMS when the order is placed and on every key status change
(confirmed, out for delivery, delivered, cancelled). Configure a provider:

| Env var | Value |
|---|---|
| `SMS_PROVIDER` | `afromessage` (Ethiopia) or `twilio` |
| `AFROMESSAGE_TOKEN` / `AFROMESSAGE_FROM` / `AFROMESSAGE_SENDER` | from afromessage.com |
| `TWILIO_SID` / `TWILIO_TOKEN` / `TWILIO_FROM` | from twilio.com |

Without a provider, messages are **logged** (visible in admin → SMS log), so the
whole flow is testable before you buy an SMS plan. Ethiopian numbers are
normalized automatically (09… → 2519…).

## Admin dashboard (`/admin.html`)

Key-protected (`ADMIN_KEY`). Tabs: **Orders** (all, with statuses) ·
**Sellers** (add/delete shops, generate seller access codes, **turn a shop ON/
OFF** without deleting it) · **Products** (add/edit price & stock/delete per
shop, **turn a product ON/OFF**) · **Services** (add/edit/delete Building
Services listings, **turn a service ON/OFF**) · **Notify** (back-in-stock
requests) · **SMS log**. Anything turned off disappears from the public
storefront immediately (Our Sellers, On Sale Now, Shop All Products, Building
Services all respect it) but stays fully visible and editable in the admin
view, so it's a genuine pause — not a delete. The catalog lives in the
**database** (seeded from `catalog.json` on first boot) — adding seller #8, or
pausing seller #3 for the weekend, is a click, not a redeploy.

## Roadmap ideas

Done: seller dashboards, catalog admin UI (sellers/products/services), on/off
toggles at every level. Still open: payment-proof upload, order status pushed
to buyers via push/WebSocket instead of polling `/api/my/orders`, real
reviews. A note on the on/off toggles specifically: they take effect on the
**next page load** for a buyer — there's no live push to an already-open tab,
so someone mid-checkout won't see a seller vanish under them, but they also
won't see it reappear without a refresh. That's a deliberate, simple choice;
real-time push would need WebSockets or polling and is a reasonable next step
if it matters for your traffic.
