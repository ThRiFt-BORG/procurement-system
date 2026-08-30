# Procurement System

A procurement management system for a restaurant's purchasing operation — suppliers, products, prices, purchase orders (LPOs), deliveries, credit notes, and reports, with role-based accounts (Admin / Manager / Procurement Officer / Viewer).

This is a private business application built for a single restaurant, not a public product.

## Documentation

- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** — set this up on a new laptop from scratch, start to finish. Start here if you're the one installing it.
- **[docs/USER_GUIDE.md](docs/USER_GUIDE.md)** — how to actually use the app day to day: suppliers, products, LPOs, deliveries, credit notes, reports, accounts. Start here if you're using the app, not installing it.

## Stack

| Layer | Choice |
|---|---|
| Application | Next.js 16 (App Router), React 19 |
| Database | PostgreSQL |
| Data layer | Prisma ORM 7 |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Auth | Custom session cookies (scrypt password hashing, no external service) |

Everything runs on one machine — the app and the database both live on the laptop that runs the restaurant's procurement. There's no cloud dependency.

## Repository layout

```
prisma/
  schema.prisma        Database schema
  migrations/           Version-controlled schema history
  seed.mjs              DEMO data only — fake suppliers/products/LPOs, for trying the app out
  bootstrap.mjs          REAL setup — standard categories + the first admin account
src/
  app/(app)/             Every page behind login (dashboard, suppliers, products, ...)
  app/login/              The one page that isn't behind login
  components/             Shared UI
  lib/
    actions/               Server-side mutations (one file per module)
    auth.js                 Sessions, login/role checks
    db.js                   Prisma client
    money.js                VAT and totals math — the one place this logic lives
    queries.js               Server-side reads
scripts/
  prepare-standalone.mjs  Copies static assets into the production build
docs/                     DEPLOYMENT.md and USER_GUIDE.md
start-production.bat      Production launcher (Windows)
docker-compose.yml         Local dev database only — production uses a native PostgreSQL install, see docs/DEPLOYMENT.md
```

## Local development

For working on the code itself (not for the restaurant's production laptop — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for that):

```bash
docker compose up -d          # starts a local Postgres in Docker
npm install
npx prisma generate
npx prisma migrate dev
node prisma/seed.mjs          # optional — fills the app with demo data to click through
npm run dev
```

Then open http://localhost:3100.

Demo logins after seeding (all fake, local only):

| Role | Email | Password |
|---|---|---|
| Officer | amina@example-restaurant.co.ke | officer123 |
| Manager | david@example-restaurant.co.ke | manager123 |
| Admin | grace@example-restaurant.co.ke | admin123 |
| Viewer | joseph@example-restaurant.co.ke | viewer123 |

## What's built

Dashboard, Suppliers, Products, Categories, Prices (history + supplier comparison), LPOs (create, approve, print), Deliveries (with short-delivery detection), Credit Notes, Reports (with CSV export), Settings, and Users/roles.

## What's not built yet

- Product editing (products can be added and deactivated, but not renamed/edited — recreate instead for now)
- PDF export of LPOs (the print view works as a substitute — browser "Print → Save as PDF")
- Any cloud/remote access — this runs on one local machine

## License

Private. Not for redistribution.
