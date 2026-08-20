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
│   └── admin.html     Key-protected admin dashboard (orders + notify requests)
├── app.js             Frontend source (gets injected into public/index.html)
├── template.html      Frontend HTML shell used to rebuild index.html
├── render.yaml        One-click Render Blueprint (web service + Postgres)
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
- **Delivery zones**: fee, ETA, coordinates (GPS snaps buyers to the nearest).
- **VAT**: `building.tax.rate` (set `0` to disable).
- **Legal**: Terms of Service & Privacy Policy text.
- **Admin contact**: phone / WhatsApp / Telegram / email.

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

## Roadmap ideas

Seller dashboards (per-tenant login to manage stock and see their own orders),
payment-proof upload, order status updates pushed to buyers, real reviews,
catalog admin UI. The schema and seams are ready for all of these.
