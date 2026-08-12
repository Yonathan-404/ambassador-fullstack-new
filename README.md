# Ambassador Shopping Mall — Full-Stack Marketplace Storefront

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

### v27.1 — Postgres SSL detection fixed for all providers

The SSL rule matched only `render.com`, so a connection string from Neon,
Supabase, Railway or Heroku got `ssl: undefined` and the connection was
rejected. Detection is now based on the host shape: Render's private
`dpg-…` hostname and localhost connect without SSL, everything else uses SSL
with a self-signed cert. Verified against six real connection-string formats.
Boot now also logs which mode it chose.

### v27 — shop logos, colour picker, labelled vacancies, Amharic sweep

**Seller cards redesigned.** The "Verified" tag is gone. The circle now shows
the shop's own logo, falling back to the two initials until one is uploaded
(and falling back again if the image fails to load). Floor and unit now sit
horizontally beside the logo instead of floating over the window.

**Shop logo + card colour are now self-service.** Both admin and each seller
can upload a logo and pick a card colour from a **30-swatch palette** across
six families (Wine, Gold & Bronze, Plum & Rose, Earth, Blue, Deep & Neutral),
with a live preview. Logos are square-cropped and downscaled to 256px in the
browser so they never bloat the catalog. Colours are validated server-side
against a strict `#rrggbb` pattern — a CSS-injection attempt is rejected and
the previous colour kept (verified by test).

**Vacancy cards now label every field.** A bare "6000" or "9:00–18:00" told
the reader nothing; each row now reads SALARY / WORKING HOURS / EMPLOYMENT /
LOCATION / APPLY BY / DESCRIPTION, in English or Amharic.

**Vacancy section is responsive and self-hiding.** Cards reflow to a single
column under 640px, and when there are no posts the whole section collapses
on desktop rather than leaving a wide empty band — small screens keep a short
"No job posts right now" notice.

**Amharic coverage extended.** Added `data-i18n-ph` support so input
placeholders translate too, then swept the render code for hardcoded English.
Found and fixed the **entire "Share Your Experience" feedback section** — its
heading, all four field labels, placeholders, send button and both taglines
had no i18n bindings at all and stayed English on switch — plus the Trusted
Partners heading and the cart/bank-transfer labels.

### v26 — durability fix, shop analytics, vacancy section, UI fixes

**Data loss fixed (two real causes).** (1) The catalog reseed was
*destructive* — a `dataVersion` bump replaced the whole document, wiping
ratings, blurbs, socials, product edits and hidden flags. It now **merges**:
new structure comes from the seed, every live edit is preserved. (2) Ratings
were only stored inside that document; they are now **rebuilt on every boot
from the `tenant_ratings` table**, which is their durable source. Verified by
shipping a new catalog version with a new shop and confirming a rating, an
admin blurb edit and a vacancy all survived.

**The likeliest production cause is environmental**, so it now fails loudly
instead of silently: without `DATABASE_URL` the server falls back to a JSON
file, which is *ephemeral* on free hosting — wiped on every restart. Boot logs
a large warning, `/api/health` reports `persistent:false`, and the admin
dashboard shows a red **"DATA IS NOT BEING SAVED PERMANENTLY"** banner with
the fix.

**Per-shop analytics.** A new `shop_events` table counts profile visits and
shares per shop per day. Sellers see their own numbers (today / 7 days / all
time) atop their portal; admin gets a **Shop Analytics** tab ranking every
shop with 7/30/90-day windows. Tracking is fire-and-forget via `sendBeacon`,
so it can never slow or break browsing, and unknown event types are rejected.

**Vacancies are now their own page section** with nav and drawer links,
instead of living behind a button in the Office-for-Rent block. The card
builder is shared with the older modal so the two can't drift apart.

**Appointment booking is now opt-in per shop**, switchable by both the seller
(Shop Profile toggle) and admin (tenant editor checkbox). It defaults off and
only appears when a WhatsApp number exists.

**vCards now carry social profiles** — Instagram, Facebook, TikTok, Telegram,
YouTube, X, LinkedIn and website — as `X-SOCIALPROFILE` plus plain `URL`
lines, and they respect each link's on/off switch.

**Kiosk cards fixed:** the shop "ceiling" was overhanging and clipping the
floor badge. The awning is shorter, its bars went from 3 to 5, and the
Verified/floor badges now sit above it — floor and unit read in full.

### v25 — vacancies, vCards, appointments, seller self-service

**Job vacancy board.** Shops, mall management and building operations can all
post openings — position, salary (fixed or negotiable), working hours,
employment type, location, description, deadline and contact. Posts appear on
one public board with Call and WhatsApp-Apply buttons. Tenants manage their
own posts from a Vacancies tab; admin and BMS can post as the mall or
building operations and edit or pause anything.

**vCard contact saving.** Every shop profile has a Save Contact button that
downloads a proper `.vcf` — name, category, phone, WhatsApp, mall address and
unit — straight into the phone's address book.

**WhatsApp appointment booking** for service tenants: the visitor picks a date
and time first, then the app hands WhatsApp a complete, pre-written message.

**Seller self-service.** Tenants now have the same catalog control admin has
over their own shop — create, edit and delete products with photos — plus a
Shop Profile tab and the ability to **change their own access code**. Codes
are stored only as SHA-256 hashes, so a forgotten code cannot be read back;
admin issues a fresh one instead. Verified end-to-end: changing the code
invalidates the old one and the new one works.

**Staff pages** (seller, admin, BMS) share a wine-and-gold shell carrying both
the Ambassador and Bisinka logos, and seller/admin are installable as apps.

**Three real bugs found and fixed during verification:** both header logos
were rendering the Bisinka mark (the Ambassador slot pointed at an app icon
generated from the Bisinka logo); the modal close button was anchoring to the
viewport corner instead of the modal's, because the modal box was not a
positioning context; and free-text salaries rendered as "ETB 8000 ETB /
month" — the currency prefix is now added only to bare numbers.

### v24 — installable mobile app (PWA), video hero, corner close buttons

**Installable as a real mobile app.** Added a web app manifest, service
worker, and full icon set generated from the Bisinka logo (regular +
maskable, plus an Apple touch icon). Visitors get an "Install app" button —
in the mobile drawer and the footer — that appears only when the browser
reports the site as installable, with an iOS-specific fallback message since
Safari never fires `beforeinstallprompt`. The service worker caches the app
shell for offline use, uses network-first for `/api/*` so the directory still
opens on a weak signal, and **never** caches the admin/seller/BMS tools.
`sw.js` is served with no-cache headers so clients can't get stuck on a stale
shell, and the manifest gets its proper `application/manifest+json` type.

**Mobile nav fixed — cart and hamburger are always reachable.** The long mall
name was pushing the action buttons past the right edge. The brand now
shrinks and truncates with an ellipsis, nav actions never shrink, and every
control has a guaranteed 44px tap target so nothing collapses even if the
icon font fails to load. Verified by measuring the rendered geometry at
390px: cart, search and menu all sit fully inside the viewport. iOS safe-area
insets are honoured for notched devices in standalone mode.

**Hero showcase now carries video.** The carousel handles mixed media — the
supplied Bisinka clip plays first (muted + `playsinline`, required for mobile
autoplay), holds the slide until it ends rather than being cut off, and falls
back to a timer if autoplay is refused. It pauses entirely when scrolled out
of view. Added captions, a VIDEO badge, clickable dots, and a progress bar.
The frame is now `aspect-ratio: 16/9` and scales up to 760px/880px on large
screens instead of staying letterboxed at a fixed height. Still images get a
subtle ken-burns drift; video doesn't.

**Close buttons pinned to the true top-right corner** of every panel — modal,
floor panel, mobile drawer, cart and checkout — floating above their own
content at a consistent 10px inset, verified by measurement, and clear of the
notch when installed.

Bisinka's logo now appears in the footer attribution and is the source of
every app icon. Verified with a 27-point suite plus live checks of all PWA
endpoints.

### v23 — wine & gold redesign (no green), dramatic hero

**Palette rebuilt around the Ambassador logo.** Wine/burgundy and gold are
now the only brand colours, each expanded into a full family — `--wine-deep`,
`--wine-rose`, `--wine-blush` and `--gold-deep`, `--gold-champagne`,
`--gold-bright` — so the design has depth without borrowing a foreign hue.
The old teal accent became a plum/rose family; the legacy `--teal*` variables
are kept as aliases pointing at it, so every existing rule keeps working.

**Every green traced and removed.** Rather than trusting a find-and-replace,
a pixel scanner measured the rendered hero and found 745 green-leaning
pixels, then each source was traced and fixed: teal variables, hardcoded
`rgba()` values, green category colours in tenant data (books, healthcare,
sports → bronze, plum, copper), green "in stock" pills, green Call buttons,
and — the stubborn one — a **duplicate `.amb-hero-bg` rule further down the
file silently overriding the redesign** while carrying a mint `#ecf8f5`.
Result: 745 → 1 green pixel, and that one is inside a logo image, not CSS.
Third-party brand colours (WhatsApp, Telebirr, Chapa, Telegram, Google) were
deliberately preserved — those are other companies' identities, not ours.

**Hero transformed.** Slow-drifting gold and wine aurora ribbons, three
concentric gold rings echoing the logo's circular mark, a masked gold/wine
grid, a gold hairline dividing hero from page, and a live shimmer sweeping
through the emphasised headline phrase. The Building Directory panel — the
hero's centrepiece — gained a gold-framed glass treatment, a gradient crown
along its top edge, and floor rows with a gold sheen that sweeps across on
hover. Footer moved from navy to deep wine with a gold gradient edge.

**One self-inflicted bug caught and fixed:** the white `text-shadow` added to
the headline was showing *through* the transparent gradient-clipped glyphs
and washing the shimmer out to an unreadable pale. Cancelled on the `em`.

Verified with a 21-point regression suite (content integrity, all hero
layers, palette correctness, and every interactive flow) plus visual QA
across hero, marketplace, services, footer and mobile.

### v22 — visual/CSS polish pass (no content changes)

Studied the hero section, transitions, and card micro-interactions from a
reference site (a modern travel-agency design) and selectively adopted what
Ambassador's storefront didn't already have — verified against what already
existed before adding anything, since several patterns (product card image
zoom, modal scale+fade reveal, floor-item hover slide) were already in place
and left untouched.

**Added:** an animated gradient underline on nav links (was a flat
background swap); a resting colored glow shadow on primary CTA buttons that
deepens further on hover; two softly floating decorative orbs behind the
hero content (pure CSS pseudo-elements, no markup added, with a
`prefers-reduced-motion` guard the reference site didn't bother with); a
subtle lift-on-hover for marketplace/filter chips; an icon scale-up on
service card hover; and a site-wide `:focus-visible` outline for keyboard
navigation, which was a real accessibility gap.

**Explicitly not touched:** any text, copy, data, or JS behavior. Every
change was a scoped CSS property edit or a purely decorative pseudo-element.
Verified with a 15-point regression suite (confirming real tenant data,
hero headline text, and every interactive flow — floor panel, tenant
profile, marketplace filters, e-commerce hold modal — still work exactly as
before) plus a full visual pass across desktop, mobile, and every major
section (hero, marketplace, sellers, services, footer).

### v21 — marketplace visibility fix, services rebuild, call buttons

**Marketplace products were invisible on most days — fixed.** The root
cause: only 24/130 tenants had any sample products, and "Some of our
products" only shows 1 product from tenants that are BOTH in today's
rotating 10%-per-floor sample AND have products — with such thin coverage,
that intersection was often empty. Expanded product coverage to 93/130
tenants (weighted toward Jewelry & Accessories since it's 62% of the real
mall), then stress-tested across 10 simulated days spanning different
months — every single day now shows products (6–11 per day), none show
zero. Category chips (Jewelry, Food & Beverage, Banking, Beauty, etc.) were
already correctly wired from v20; the real problem was empty results making
it look like nothing had changed.

**Building Services rebuilt with corrected, justified filtering.** Per
Ambassador's direction: banks are voided (none have a confirmed real office
number — only the 4th floor's source data included real "F0-xx" unit
codes), Beauty & Cosmetics is voided except genuine salon/wellness
businesses (Ashara Nails, Ashara Wellness — the rest of that category is
product retail: perfume, cosmetics, oils), and other genuine service-type
tenants with real office numbers are included (Nasam Print, Buna Sport
Club). The result is a small, honest pool of 4 real tenants — shown in full
rather than hidden behind unnecessary rotation. Also gets a dedicated,
enhanced card design (distinct from the plain seller kiosk card) with a
category badge, location, and a direct Call button.

**Call buttons added.** Both the tenant profile modal's phone row and every
Building Services card now have a one-tap Call button (green, `tel:` link)
next to the number — not just plain text. WhatsApp rows are similarly
actionable now.

**Ratings hardened.** Backend was already verified working end-to-end in
v20; this round adds optimistic UI — stars fill and lock instantly on
click, before the network round-trip completes, with an automatic rollback
if the save fails (e.g. an expired session mid-click) — so the interaction
feels immediately responsive rather than waiting on a request.

### v20 — live-data sync fix, real ratings, daily rotation, vacant offices

**The "live site shows old data" bug is fixed at the root.** Traced to the
database only ever seeding from `catalog.json` once, on the very first boot
ever — every later catalog update silently had zero effect on the live site.
Added a `dataVersion` field to `catalog.json` and a boot-time check: if the
shipped file has a newer version than what's live, the server automatically
reseeds. Verified by simulating a stale pre-existing database (old fake
tenant, no version field) and confirming the next boot correctly replaces it
with the current 130-tenant real dataset. A manual "Reseed live data now"
button and a green/red sync-status banner were also added to the admin
dashboard as a backup and for visibility.

**Real, user-submitted tenant ratings.** Signed-in buyers can now rate a
*shop* (not individual products) from its profile modal — one rating per
user, updatable any time, aggregated live into that tenant's public
rating/review count. Backed by a real `tenant_ratings` table (Postgres) with
an in-memory equivalent for dev, gated behind sign-in, and verified end-to-end
against a live server (rate → persists → re-rate updates instead of
duplicating → unauthenticated attempts correctly rejected).

**Daily-rotating storefront.** "Our Sellers" now shows a deterministic ~10%
sample from *each floor*, refreshing at local midnight (seeded by date, so
every visitor sees the same picks today and different ones tomorrow) —
relabeled "Some of our shops you can visit." The marketplace default
("Some of our products," replacing "Verified Sellers Product") now shows
exactly one product from each of today's sampled sellers rather than the
full catalog. Building Services was rebuilt to pull from real Banking &
Finance and Beauty & Cosmetics tenants (no more invented services list) and
rotates the same way.

**Vacant offices are real, editable data.** The 6 known-vacant units
(G-25, G-27, F-26, S-20, S-32, FO-01) replaced the old fictional sample
listings, sourced from `catalog.json` with an admin editor to add/remove
entries — no fabricated size or price shown where none was given. Note:
Ground/1st/2nd floor unit codes elsewhere in the directory were sequentially
generated (the original tenant list didn't include real unit numbers for
those floors), so a couple of these vacancy codes don't yet have a confirmed
cross-reference — flagged rather than guessed.

**Other fixes.** Hero background grid is now clearly visible (was ~3%
opacity, now bolder and two-tone in the brand colors). Product cards no
longer show a fabricated 4.8-star default — genuinely unrated products show
a "New" pill, matching the tenant treatment. Added sample products to 24 of
130 tenants (clearly demo content, spread across floors/categories) so the
new rotation and marketplace views have something real to demonstrate.

### v19 — real tenant data migration, e-commerce on hold, seller self-service

**Real data replaces all demo content.** Renamed "Ambassador Shopping Center"
to **Ambassador Shopping Mall** everywhere. Replaced the entire fictional
44-tenant dataset with **130 real tenants across 5 real floors** (Ground 27,
1st 33, 2nd 40, 3rd 12, 4th 18 — sourced directly from Ambassador's own floor
listings; the 2nd floor's stated count of 41 is 40 in practice because the
source data explicitly marks its 41st row as a duplicate to omit). Building
info updated to the real address (Arat Kilo, Addis Ababa), phone
(+251926785987), and hours (Mon–Sun 9AM–9PM). Marketplace categories rebuilt
to match the real mix — Jewelry & Accessories is now the dominant category
(81 of 130 tenants), matching this being a real gold/jewelry market, and
fictional categories like Gaming were removed since no real tenant fits them.

**No fabricated data about real businesses.** Fake TIN numbers, star
ratings, review counts, and "usually replies within X" claims are gone
entirely for real tenants — a genuinely-unrated shop now shows a "New" pill
instead of a fake ★0, and any profile row with no real data (owner name,
WhatsApp) simply doesn't render instead of showing a blank/broken field.
Product catalogs start empty for all 130 tenants rather than inventing
specific items or prices for real shops that never provided them.

**E-commerce is on hold.** Add to Cart and the cart icon show a stylish,
animated "Something Amazing Is Coming Soon" modal instead of functioning.
The backend order endpoint is also locked behind a `CHECKOUT_ENABLED`
environment flag (default off, returns HTTP 423) — so even a direct API
call can't place a real order right now. Flip one env var when checkout is
ready to go live.

**Sellers can now self-manage their shop profile.** A new "Shop Profile" tab
in the seller portal lets each tenant write their own brief description and
manage social links (Instagram, Facebook, TikTok, Telegram, YouTube,
Website) — each with an individual on/off toggle so a link can be hidden
without retyping it later. New `/api/seller/profile` endpoint; the admin
tenant-edit form was updated to match the same `{value, on}` schema so admin
and seller edits stay consistent.

### v18 — mobile hamburger menu, Google sign-in hardening, commission reports

**Storefront — hamburger menu.** The mobile menu button used to just scroll
to the shop section; it now opens a real slide-out drawer with Login/Account,
Sellers, Shop, Services, My Orders, Cart, Wishlist and the language toggle —
closes on the X, outside click, or Escape, matching every other overlay in
the app. On small screens the top nav bar itself is decluttered: sign-in,
orders, wishlist and language move into the drawer, leaving just search and
cart visible up top.

**Storefront — Google sign-in hardening.** The Google Identity Services
integration was already real (server verifies ID tokens, sets a session
cookie) — but every failure path silently left a blank box: a blocked script,
a slow network, or a bad/misconfigured Client ID (wrong Authorized JavaScript
Origin) all failed invisibly. Now `loadGsi` has a real onerror path plus a 6s
timeout fallback, and `renderButton` is checked a beat after calling it — any
failure shows a "couldn't load, try again" button instead of nothing.
`admin.html` also gained a self-diagnostic banner that checks `/api/config`
on load and tells you plainly whether `GOOGLE_CLIENT_ID` is actually set on
the server, with a link to create one.

**Admin — commission & sales reports.** Bisinka's 2% platform commission
(configurable, stored in `catalog.building.commission.rate`) now has a full
reporting system: a new **Reports** tab with date-range presets (Today,
Yesterday, This Week, This Month, Last 7/30 Days, Custom), live auto-refresh
every 20s while viewing Today, stat cards (orders, sales, commission, net to
sellers, delivery, VAT, cancelled-excluded), a daily sales bar chart, and a
per-seller breakdown table. **Generate Report** produces a clean print/PDF
view via a dedicated print stylesheet; **Download CSV** exports the same
breakdown. **Send to tenants** messages each seller their own period summary
over real SMS infrastructure (Afromessage/Twilio, log-only fallback) plus a
ready WhatsApp deep link — individually or in bulk — and never fakes delivery
for sellers with no phone on file. All of it was verified against a running
server with real seeded orders, not just unit tests.

### v17 — hero redesign, footer polish, banking & content swap

**Hero:** the phone/QR mockup is gone entirely. The floor list — described as
the important part — is now the sole visual on the right, elevated into a
proper glass-panel "Building Directory" card with a header icon and live
floor/office counts.

**Footer:** social icons are brand-colored (Telegram, Instagram, Facebook,
TikTok), plus new Call (green, tel: link) and Share (gold, Web Share API with
a clipboard/SMS fallback) buttons. "Returns & Buyer Safety" moved out of a
standalone section into a footer modal next to Privacy Policy, matching how
"How Ordering Works" already worked.

**Banking:** Awash Bank replaced with Bank of Abyssinia everywhere a tenant
lists payment accounts — catalog data, demo fallback data, and all checkout
copy. Verified live against a running server that the cart's bank list no
longer contains "Awash" anywhere in the rendered app.

**Trusted Partners:** Amazon → Bank of Abyssinia, Etsy → Ambassador Mall's own
logo. Cards got a real visual upgrade — white bordered tiles with brand-tinted
hover glow — replacing the flat grayscale-on-hover treatment.

**Content swap:** the "Find Us" map section is now "Share Your Experience" —
a working feedback form (mailto-based, validates a message is present) next
to the original location photo and the "Come for the shopping," / "stay for
the fun!" tag cards. Office for Rent gained a "See Offices" button next to
"Call Us to Visit" that opens a gallery of unoccupied units with photo
placeholders, floor/size/price, and a WhatsApp inquiry link.

**Marketplace Support** enhanced with a "usually replies within..." badge and
four quick-topic buttons (order issue, payment issue, seller complaint,
general question) that pre-fill the WhatsApp message.

### v16 — Lenis smooth scroll

Added [Lenis](https://github.com/darkroomengineering/lenis) (darkroom.engineering)
for buttery inertia-based page scrolling, loaded from the unpkg CDN with a
clean fallback: if the script doesn't load, every `ambScrollTo` call (nav
links, "Shop This Floor", search picks, etc.) degrades to native
`scrollIntoView` — nothing breaks either way. Modals, the cart, the floor
panel, and search dropdowns are marked `data-lenis-prevent` so they keep
ordinary scrolling instead of being smoothed. Sections now fade/rise into
view on scroll (IntersectionObserver, respects `prefers-reduced-motion`), the
mosaic/spotlight/vibe grids stagger their children in, and the hero photo
carousel gets a subtle parallax drift tied to Lenis's scroll position on
desktop. Verified constructor and event API directly against the installed
`lenis@1.3.23` package source to make sure the integration is correct.

### v15 — mall showcase + marketplace categories

Storefront: hero rebalanced (left: headline + building-photo carousel only;
right: light-burgundy floor list, no label, sized so the phone mockup reads at
true proportions). Marketplace chips are now category groups — All, **Verified
Sellers Product (default)**, Jewelry, Food & Drinks, Fashion, Gaming,
Furniture, Electronics, Books & Stationery — and viewing one seller shows a
removable chip. Floor → office → **Shop Products** now closes everything and
lands directly on that seller's products. New sections from the original mall
directory: Shop Smart / Save Big / Play Hard / Eat Well strip, Visit Our Mall
photo mosaic, In The Spotlight media videos, Office for Rent, an embedded
Google Map with directions, and the Trusted Partners logo marquee. Tenant
social links render as brand-colored pills (12 platforms), are seeded for all
44 tenants, and are editable in the admin Seller form. New mall logo applied.

### v14 — layout polish + full admin control

Storefront: cleaner header (no subtitle), compact phone mockup, the photo
carousel now sits under the hero copy (no captions/dots) so the floor list is
fully visible without scrolling, "How Ordering Works" moved into a footer
modal next to Privacy Policy, midnight-navy footer, and every modal closes on
outside-click as well as its ✕.

Admin: every Seller / Product / Service row now has **Edit** (full inline
form), **Hide/Unhide**, on/off and Delete. *Hidden* is softer than *off*: the
item leaves the main storefront sections but stays searchable, orderable, and
listed in the floor/office panel. A new **Storefront** tab controls the
Marketplace ("Shop All Products") and "Our Sellers" sections — visibility plus
custom titles. Product forms take up to **3 uploaded images** (compressed
client-side to data-URLs), services up to **2**; sellers can upload 3 product
photos from their own portal. Also fixed: service toggles now actually reach
the storefront (the public catalog's top-level services copy is kept in sync).

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
