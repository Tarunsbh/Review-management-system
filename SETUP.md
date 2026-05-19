# eGlobe Review Management System — Setup Guide
## Enterprise Edition v2.0

---

## Quick Start (Local Development — Recommended)

### Prerequisites
- Node.js 20+
- Microsoft SQL Server 2022 (local or Docker)
- Redis 7+ *(optional — queues & Socket.io work without it, but are paused)*

### Steps

```bash
# 1. Install dependencies
cd backend  && npm install
cd ../frontend && npm install

# 2. Configure environment
cp backend/.env.example backend/.env
# Open backend/.env and fill in:
#   DATABASE_URL  — your SQL Server connection string
#   JWT_SECRET    — any random string
#   REDIS_URL     — redis://localhost:6379  (optional)

# 3. Create the database (first time only)
# In SQL Server Management Studio or sqlcmd:
#   CREATE DATABASE eglobe_reviews;

# 4. Push schema + regenerate Prisma client
cd backend
npm run db:push          # creates all 24 tables in SQL Server
npx prisma generate      # regenerates TypeScript client from schema

# 5. Seed admin user + default data
npm run db:init

# 6. Start the backend (auto-seeds on startup)
npm run dev

# 7. Start the frontend (new terminal)
cd frontend
npm run dev

# 8. Open
open http://localhost:3000
```

**Login:** `admin@admin.com` / `admin`

---

## Quick Start (Docker — All-in-One)

Runs SQL Server 2022 + Redis + Backend + Frontend + Nginx in containers.

```bash
# 1. Copy env
cp backend/.env.example backend/.env

# 2. Start everything
docker-compose up -d

# 3. Wait ~60 seconds for SQL Server to initialise, then apply schema:
docker-compose exec backend npx prisma generate
docker-compose exec backend npm run db:push
docker-compose exec backend npm run db:init

# 4. Open
open http://localhost:8080    # via Nginx (port 8080)
open http://localhost:3000   # frontend direct
open http://localhost:4000/api/docs  # Swagger API docs
```

---

## Database Commands

```bash
cd backend

npm run db:push      # sync schema to SQL Server (safe, no data loss*)
npm run db:generate  # regenerate Prisma client after schema changes
npm run db:init      # seed admin user, plans, default business
npm run db:studio    # open Prisma Studio GUI at http://localhost:5555
npm run db:reset     # DROP all tables (DESTRUCTIVE!)
npm run db:fresh     # db:reset + db:push + db:init  (full clean slate)
```

*`db:push` uses `--accept-data-loss` flag for SQL Server column type changes.

---

## Enterprise Features

### What's included in v2.0

| Feature | Status |
|---------|--------|
| JWT Authentication | ✅ Live |
| Dashboard + Analytics | ✅ Live |
| Review Management + Replies | ✅ Live |
| AI Reply Generator (OpenAI + templates) | ✅ Live |
| Google Business Profile sync | ✅ Live (needs API credentials) |
| Settings Management | ✅ Live |
| Team Management | ✅ Live |
| Billing + Stripe | ✅ Live (needs Stripe keys) |
| Admin Panel | ✅ Live |
| BullMQ Queue Workers | ✅ Live (needs Redis) |
| Socket.io Real-time | ✅ Live (needs Redis for clustering) |
| Swagger API Docs | ✅ Live at `/api/docs` |
| Nginx Reverse Proxy | ✅ Configured |
| Redis Cache | ✅ Configured |

### Enable Optional Features

**OpenAI AI Replies:**
```
OPENAI_API_KEY=sk-your-key-here
```
Without it, the system uses built-in hospitality reply templates automatically.

**Stripe Billing:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Redis (Queues + WebSocket scaling):**
```
REDIS_URL=redis://localhost:6379
```
Start Redis with Docker: `docker run -d -p 6379:6379 redis:7-alpine`

**Google Business Profile:**
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_PLACE_ID=...
```
Get credentials at: https://console.cloud.google.com/

---

## API Documentation

Swagger UI is available at: `http://localhost:4000/api/docs`

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/reviews` | List reviews (paginated) |
| POST | `/api/reviews/:id/reply` | Post a reply |
| POST | `/api/ai/generate-reply` | Generate AI reply |
| GET | `/api/analytics` | Analytics data |
| GET | `/api/settings/:type` | Get settings section |
| PUT | `/api/settings/:type` | Update settings |
| GET | `/api/businesses` | List businesses |
| GET | `/api/teams` | List teams |
| POST | `/api/billing/plans` | List plans |
| POST | `/api/billing/checkout` | Stripe checkout |
| GET | `/api/admin/stats` | Admin overview |
| GET | `/api/health` | Health check |

---

## Infrastructure

### PM2 (production without Docker)

```bash
npm install -g pm2
cd backend  && npm run build
cd frontend && npm run build

pm2 start infrastructure/pm2.ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Nginx

Config: `infrastructure/nginx/nginx.conf`

Proxies:
- `/` → Next.js frontend (port 3000)
- `/api/` → Express backend (port 4000)
- `/socket.io/` → Socket.io WebSocket (port 4000)

---

## Troubleshooting

**`prisma db push` fails with constraint error:**
```bash
npm run db:fresh    # drops all tables and recreates cleanly
```

**TypeScript errors after schema change:**
```bash
npx prisma generate   # regenerates the Prisma client types
```

**Redis connection errors in logs:**
These are non-fatal — the server continues without Redis. Queue workers and Socket.io multi-instance scaling are paused until Redis is available.

**SQL Server won't start in Docker:**
Ensure Docker has at least 2GB RAM allocated (SQL Server requirement).
