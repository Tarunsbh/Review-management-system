# eGlobe Review Management System

> Enterprise-grade Google Review Management Platform for a single hotel/business property — built with Next.js 15, Express.js, TypeScript, and AI-powered responses.

---

## ✨ Features

- **📊 Real-time Dashboard** — KPI cards, review trend charts, sentiment analysis, business health score
- **⭐ Review Management** — Fetch, search, filter, sort all Google reviews with pagination
- **🤖 AI Reply Generator** — GPT-4o powered contextual replies in 6 different tones
- **📈 Analytics** — Deep insights, keyword frequency, YoY comparison, rating trends
- **⚙️ Settings** — Secure management of Google API, OpenAI, SMTP, and business settings
- **🔗 Google Integration** — OAuth 2.0, auto-sync, manual sync, sync history
- **🔔 Notifications** — Real-time review alerts, negative review warnings
- **🌗 Dark/Light Mode** — Full theme support
- **📱 Responsive** — Mobile-first design

---

## 🚀 Quick Start

### Test Login Credentials
```
Email:    admin@admin.com
Password: admin
```

---

## 🏗️ Project Structure

```
eglobe-review-management/
├── frontend/               # Next.js 15 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/login/       # Login page
│   │   │   └── (dashboard)/        # Protected dashboard routes
│   │   │       ├── dashboard/      # Main dashboard
│   │   │       ├── reviews/        # Review management
│   │   │       ├── analytics/      # Analytics charts
│   │   │       ├── ai-replies/     # AI reply generator
│   │   │       ├── integrations/   # Google integration
│   │   │       ├── notifications/  # Notification center
│   │   │       └── settings/       # Settings page
│   │   ├── components/
│   │   │   ├── layout/             # Sidebar, Navbar
│   │   │   ├── providers/          # Theme, Query providers
│   │   │   └── ui/                 # Reusable components
│   │   ├── lib/                    # API client, utilities
│   │   ├── store/                  # Zustand auth store
│   │   └── types/                  # TypeScript types
│   └── package.json
│
├── backend/                # Express.js API server
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts             # JWT authentication
│   │   │   ├── reviews.ts          # Review CRUD + sync
│   │   │   ├── ai.ts               # AI reply generation
│   │   │   ├── analytics.ts        # Analytics endpoints
│   │   │   ├── settings.ts         # Settings management
│   │   │   ├── google.ts           # Google OAuth + sync
│   │   │   └── notifications.ts    # Notification management
│   │   ├── middleware/
│   │   │   ├── auth.ts             # JWT middleware
│   │   │   ├── errorHandler.ts     # Global error handler
│   │   │   └── apiLogger.ts        # Request logging
│   │   ├── jobs/
│   │   │   └── syncJob.ts          # Cron-based auto-sync
│   │   └── utils/
│   │       └── logger.ts           # Winston logger
│   ├── prisma/
│   │   └── schema.prisma           # Full database schema
│   └── package.json
│
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript |
| **Styling** | TailwindCSS 3, Framer Motion |
| **State** | Zustand, TanStack Query |
| **Charts** | Recharts |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL + Prisma ORM |
| **Auth** | JWT (jsonwebtoken) |
| **AI** | OpenAI GPT-4o |
| **Google** | Business Profile API, Places API, OAuth 2.0 |
| **Logging** | Winston |
| **Jobs** | node-cron |

---

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (or Supabase)
- npm or yarn

### 1. Clone & Install

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

### 2. Environment Setup

```bash
# Frontend
cd frontend
cp .env.local.example .env.local
# Edit NEXT_PUBLIC_API_URL if needed

# Backend
cd ../backend
cp .env.example .env
# Fill in your credentials (see Configuration below)
```

### 3. Database Setup

```bash
cd backend

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Optional: Open Prisma Studio
npx prisma studio
```

### 4. Start Development Servers

```bash
# Terminal 1 — Backend (port 4000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 3000)
cd frontend
npm run dev
```

### 5. Open in Browser

```
http://localhost:3000
```

Login with: `admin@admin.com` / `admin`

---

## ⚙️ Configuration

### Google Business Profile API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google My Business API** and **Places API**
4. Create OAuth 2.0 credentials (Web Application)
5. Add `http://localhost:4000/api/google/callback` as redirect URI
6. Copy credentials to Settings page or `.env`

### Finding Your Place ID

Visit: https://developers.google.com/maps/documentation/places/web-service/place-id

### OpenAI Setup

1. Get an API key from [OpenAI Platform](https://platform.openai.com)
2. Add to Settings → OpenAI Settings, or to `.env` as `OPENAI_API_KEY`
3. Select your preferred model (GPT-4o recommended)

> **Without OpenAI key:** The system uses built-in professional reply templates

---

## 🗃️ Database Schema

The Prisma schema includes these models:

| Model | Description |
|-------|-------------|
| `User` | Admin users with role-based access |
| `Settings` | Encrypted API keys and configuration |
| `GoogleAuth` | OAuth tokens and Google credentials |
| `Review` | All Google reviews with metadata |
| `ReviewReply` | Replies with AI/manual tracking |
| `AiReplyHistory` | History of AI-generated replies |
| `AnalyticsCache` | Cached analytics for performance |
| `SyncLog` | History of review sync operations |
| `Notification` | Review alerts and system notifications |
| `ApiLog` | API request/response logging |

---

## 🔌 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reviews` | List reviews (paginated, filtered) |
| GET | `/api/reviews/:id` | Get single review |
| POST | `/api/reviews/sync` | Trigger manual sync |
| POST | `/api/reviews/:id/reply` | Post a reply |
| PUT | `/api/reviews/:id/reply/:replyId` | Edit reply |
| DELETE | `/api/reviews/:id/reply/:replyId` | Delete reply |
| GET | `/api/reviews/export?format=csv` | Export reviews |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/generate-reply` | Generate AI reply |
| POST | `/api/ai/analyze-sentiment` | Analyze text sentiment |
| POST | `/api/ai/improve-reply` | Improve existing reply |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/summary` | Overview stats |
| GET | `/api/analytics/trends?period=1y` | Review trends |
| GET | `/api/analytics/rating-distribution` | Rating breakdown |
| GET | `/api/analytics/keywords` | Top keywords |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings` | Get all settings |
| PUT | `/api/settings/:section` | Update section |
| POST | `/api/settings/test/:type` | Test connection |

---

## 🚀 Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build

# Deploy to Vercel
npx vercel --prod
```

Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` → your backend URL

### Backend → Railway / DigitalOcean / AWS

```bash
cd backend
npm run build

# Set environment variables on your platform
# Run: node dist/server.js
```

### Database → Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Copy connection string to `DATABASE_URL`
3. Run: `npx prisma migrate deploy`

---

## 🔒 Security

- All API routes protected with JWT authentication
- API keys AES-256 encrypted at rest
- Rate limiting on all endpoints
- Helmet.js security headers
- Input validation with Zod
- SQL injection prevention via Prisma
- XSS protection via helmet

---

## 🎨 Design System

The UI follows a premium SaaS aesthetic inspired by Linear, Stripe, and Vercel:

- **Colors**: CSS variables supporting dark/light themes
- **Typography**: Inter font family
- **Components**: Custom components with ShadCN-inspired design
- **Animations**: Framer Motion for smooth transitions
- **Glassmorphism**: Backdrop blur and transparency effects

---

## 📬 Support

Built by eGlobe Solutions · tarun@eglobe-solutions.com

---

*This is a production-ready foundation. Connect your Google Business Profile API credentials in Settings to start fetching real reviews.*
