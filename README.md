# Ambassador Shopping Center — Full-Stack Marketplace Storefront

A complete e-commerce storefront for a multi-tenant shopping building (Bisinka
directory template). Buyers browse every shop in the building, build a cart,
and check out **per seller** — paying each verified seller directly into their
own bank account, with WhatsApp confirmation, PDF invoices, delivery pricing by
Addis Ababa subcity (GPS or manual), 15% VAT, Google sign-in, order history,
and an admin dashboard.

**Stack:** Node.js + Express · PostgreSQL (production) / JSON file (dev) ·
vanilla-JS single-page frontend (no build step) · Google Identity Services.

### Storefront navigation (new)

- **Floor panel** — tapping any floor in "Jump to Floor" slides in a panel
  listing **every office on that floor** (unit badge, icon, rating, product
  count, plus that floor's building services). Tapping a unit opens the full
  tenant profile; the panel stays behind it. Footer buttons: *Shop This
  Floor* and *Full Directory*. Deep-linkable via `#floor=Ground%20Floor`.
- **Building Directory section** (`#ambDirectory`) — all 44 units + 6
  services listed floor-by-floor with color-coded headers, unit counts, a
  directory search box (unit code, name, category, owner) and floor tabs.
- **Smarter search** — the header search now also matches unit codes,
  floors, owners and product descriptions, and shows a *Floors* result
  group; on mobile a search icon opens a full-screen search overlay
  (the inline bar is hidden on small screens). Enter picks the first
  result; Escape closes.
- **Filter bar** — sort, floor, price range (min/max + slider),
  availability (in stock / on sale / made to order) and 4★+ rating, with an
  active-filter counter and one-tap reset. Collapses behind a "Filters"
  toggle on mobile.
- Fully bilingual (English/Amharic) like the rest of the store.

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
│   ├── seller.html    Per-seller portal (phone + access code login)
│   └── bms.html       Ambassador BMS (leases, billing, finance, maintenance)
├── app.js             Frontend source (gets injected into public/index.html)
├── template.html      Frontend HTML shell used to rebuild index.html
├── render.yaml        One-click Render Blueprint (web service + Postgres)
├── run_tests_v2.sh    Live-server smoke test: auth, orders, SMS, seller/admin CRUD
├── run_tests_v3.sh    Live-server smoke test: on/off toggles + services CRUD
├── run_tests_v4.sh    Live-server smoke test: Chapa + USSD payment flows
├── run_tests_v5.sh    Live-server smoke test: BMS terminate/restore ↔ real store
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
- **Tenants**: name, **real unit code** (`unit`, e.g. `"607"` or `"GF5"`),
  floor, WhatsApp, bank accounts, socials, review link… The catalog now
  carries the full 44-unit Ambassador Mall directory, with the same unit
  codes as the building's management system — a tenant's floor is always
  shown as "Floor — Unit" (e.g. "6th Floor - 607") everywhere in the store:
  kiosk cards, tenant profiles, product tags, cart, checkout, receipts, and
  order history.
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
| POST   | /api/orders/:ref/pay/chapa | —      | start Chapa hosted checkout               |
| POST   | /api/webhooks/chapa | —             | Chapa payment-confirmed callback          |
| POST   | /api/orders/:ref/pay/ussd  | —      | request a USSD payment push               |
| GET    | /api/admin/ussd-log | x-admin-key   | USSD push attempts (configured or not)    |
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
**Sellers** — a real building-management view over the same 44-unit directory
used by Ambassador Mall's BMS: search by name, unit, floor, or category;
tenants are grouped by floor with their real unit code shown (e.g. "6th
Floor - 603"); a **Terminate** button (with a confirm step) turns a tenant
off — this calls the same `/api/admin/tenant/:id/toggle` endpoint as
everything else, so it takes effect on the live storefront immediately, not
a separate copy of the data. Terminated tenants surface in a **"Currently
OFF"** section at the top with a one-click **Restore** — nothing is deleted,
their products and history are untouched · **Products** (add/edit price &
stock/delete per shop, **turn a product ON/OFF**) · **Services** (add/edit/
delete Building Services listings, **turn a service ON/OFF**) · **Notify**
(back-in-stock requests) · **SMS log**. Anything turned off disappears from
the public storefront immediately (Our Sellers, On Sale Now, Shop All
Products, Building Services all respect it) but stays fully visible and
editable in the admin view. The catalog lives in the **database** (seeded
from `catalog.json` on first boot) — adding seller #45, or terminating one for
the weekend, is a click, not a redeploy.

> If you're running a separate, richer BMS tool (leases, billing, maintenance,
> finance) for the physical building, point its "terminate tenant" action at
> `POST /api/admin/tenant/:id/toggle` with `{"active": false}` (using this
> server's `ADMIN_KEY`) and it will hide that tenant from this real store
> immediately — the same mechanism `/admin.html` itself uses. That's a single
> API call, not a data-sync job, because both tools would be reading and
> writing the same live catalog.

## Payments: bank transfer, Chapa, and USSD push

Checkout offers three ways to pay, chosen per order (`paymentMethod`: `bank_
transfer` | `chapa` | `ussd`):

- **Bank transfer** (default, unchanged): buyer transfers to one of the
  seller's own accounts and sends proof on WhatsApp.
- **Chapa**: real integration against Chapa's hosted-checkout API
  (`POST /api/orders/:ref/pay/chapa` → a real `checkoutUrl` when
  `CHAPA_SECRET_KEY` is set; `POST /api/webhooks/chapa` verifies and confirms
  the order automatically once Chapa reports success). Without a key, the
  buyer is told plainly that Chapa isn't set up yet and can use bank transfer
  or WhatsApp instead — it never fakes a successful payment.
- **USSD push**: a configurable seam (`USSD_PROVIDER` / `USSD_API_URL` /
  `USSD_API_KEY`) that POSTs `{phone, amount, reference}` to whichever
  provider you contract with — there's no universal public USSD-push API in
  Ethiopia, so this needs a real agreement with a bank or aggregator before
  it does anything. Until then it logs the attempt (visible at
  `GET /api/admin/ussd-log`, same pattern as the SMS log) and tells the buyer
  honestly that it isn't available yet.

## Ambassador BMS (`/bms.html`)

A real building-management tool, sharing the exact same database as the
storefront — not a separate copy, not localStorage. Linked from `/admin.html`.

- **Dashboard**: occupancy, arrears, this-month income/expense/net, today's
  store orders and revenue, open/in-progress maintenance tickets — all
  computed live from real data, no separate reporting schema.
- **Tenants**: the same search/floor-grouping/terminate-restore view as
  `admin.html`'s Sellers tab, plus each tenant's lease at a glance.
  **Terminating a tenant here ends their lease (set to today) and hides them
  from the live storefront in the same action** — verified end-to-end: the
  tenant actually disappears from `/api/catalog`, and restoring brings it
  back.
- **Leases**: rent, billing cycle, first-period length, deposit, start/end —
  one lease per unit.
- **Billing**: a "run sweep" action generates whatever invoices a lease is
  behind on (based on its cycle) and ages overdue ones; mark any invoice
  paid, with penalty computed automatically from days late.
- **Finance**: income/expense entries with running totals.
- **Maintenance**: a simple Open → In Progress → Done ticket board.
- **Announcements**: post building-wide notices.
- **Settings**: late-payment penalty rate, collection bank accounts.

New tables: `leases`, `bms_invoices`, `bms_finance`, `bms_tickets`,
`bms_announcements`, `bms_config` (Postgres, with JSON-file equivalents for
local dev — same dual-storage pattern as the rest of the app).

## Homepage hero — Jump to Floor + carousel

The hero is now a real two-column layout: copy on the left, a live visual on
the right — a phone/QR mockup, a **"Jump to Floor"** list (every floor,
bilingual, color-coded, tap to filter products to that floor), and a rotating
image carousel. Two things worth knowing:

- **Occupancy counts are honest, not just decorative.** `/api/catalog`
  computes a `floorStats` object (total vs. active tenants per floor)
  *before* filtering out anything toggled off, so "8/9" on a floor reflects
  reality — without ever telling the buyer *which* shop is currently off.
- **Carousel prev/next are on the image itself** (left/right, overlaid),
  not in a row below it — only the dot indicators sit below.

## Search

The header search (grouped typeahead) now covers **tenants, categories,
products, and Building Services** — type a service name (e.g. "pharmacy" or
"forex") and it shows up alongside sellers and products, not just those two.

## Roadmap ideas

Done: seller dashboards, catalog admin UI (sellers/products/services), on/off
toggles at every level, BMS-aligned unit numbering, Chapa + USSD payment
seams, and now a real BMS module (leases, billing, finance, maintenance,
announcements) sharing the live database. Still open: payment-proof upload,
order status pushed to buyers via push/WebSocket instead of polling
`/api/my/orders`, real reviews, and a proper "view your saved items" page (the
heart icon saves products already, there just isn't a dedicated screen to
browse them yet — the footer/header wishlist links point at real features
only, so this was left out rather than linking to something incomplete). A
note on the on/off toggles specifically: they take effect on the
**next page load** for a buyer — there's no live push to an already-open tab,
so someone mid-checkout won't see a seller vanish under them, but they also
won't see it reappear without a refresh. That's a deliberate, simple choice;
real-time push would need WebSockets or polling and is a reasonable next step
if it matters for your traffic.
