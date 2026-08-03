# 🃏 UNO Platform

> A production-ready, full-stack multiplayer UNO web platform.

[![CI](https://github.com/your-org/uno-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/uno-platform/actions)
[![PHP](https://img.shields.io/badge/PHP-8.2-blue.svg)](https://php.net)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🌟 Features

| Category | Features |
|----------|---------|
| **Gameplay** | Official UNO rules, stacking, 7-0 rule, jump-in, draw until playable, force play |
| **Multiplayer** | 2–10 players, real-time WebSockets, turn timer, reconnect, auto-save |
| **AI** | Easy / Medium / Hard bots |
| **Rooms** | Public/Private/Friends-only, password protection, spectator mode, invite links |
| **Social** | Friends, friend requests, in-game chat, presence indicators, invite to room |
| **Auth** | Email/password, Google OAuth, GitHub OAuth, guest play, 2FA-ready |
| **Profile** | Avatar upload, XP/leveling, statistics, achievements, match history |
| **Leaderboard** | Global rankings by XP and wins |
| **Daily Rewards** | Streak-based coin/XP rewards |
| **Admin Panel** | User management, ban system, room monitoring, reports, analytics |
| **Performance** | Redis caching, Horizon queue, optimized queries, Soketi WebSockets |
| **Security** | JWT/Sanctum, CSRF, rate limiting, input validation, audit logs |
| **DevOps** | Docker, Docker Compose, Nginx, GitHub Actions CI/CD |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Nginx (Reverse Proxy)                │
│         Port 80 → Frontend   /api/* → Backend          │
└──────────┬───────────────────────┬──────────────────────┘
           │                       │
    ┌──────▼──────┐        ┌───────▼──────┐
    │  Next.js 15  │        │  Laravel 11  │
    │  React 18    │        │  PHP 8.2     │
    │  TypeScript  │        │  REST API    │
    │  Tailwind    │        │  Sanctum     │
    │  Zustand     │        │  Socialite   │
    │  Framer      │        │  Horizon     │
    └─────────────┘        └──────┬───────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
       ┌──────▼──────┐   ┌────────▼──────┐   ┌───────▼──────┐
       │   MySQL 8   │   │   Redis 7     │   │   Soketi     │
       │  (Database) │   │ (Cache/Queue) │   │ (WebSockets) │
       └─────────────┘   └───────────────┘   └──────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js ≥ 20 (for local frontend dev)
- PHP 8.2+ & Composer (for local backend dev)

### With Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/uno-platform.git
cd uno-platform

# Copy environment files
cp backend/.env.example backend/.env
# Add Google/GitHub OAuth credentials to backend/.env

# Start all services
docker compose up -d

# Run migrations + seed
docker exec uno_backend php artisan migrate --seed

# Visit http://localhost
```

### Local Development

**Backend:**
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate

# Configure MySQL + Redis in .env, then:
php artisan migrate --seed
php artisan serve          # API on :8000
php artisan horizon        # Queue worker
```

**Frontend:**
```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev                # Dev server on :3000
```

**WebSocket Server (Soketi):**
```bash
npx @soketi/soketi start --config.port=6001
```

## 🎮 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@uno.com | Admin@1234 |
| Player | player1@uno.com | Player@1234 |

## 📁 Project Structure

```
uno-platform/
├── backend/                    # Laravel 11 API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/V1/
│   │   │   │   ├── Auth/AuthController.php
│   │   │   │   ├── Game/{Room,Game,User,Friend,Chat,Notification}Controller.php
│   │   │   │   └── Admin/AdminController.php
│   │   │   ├── Middleware/{EnsureNotBanned,UpdateLastSeen}.php
│   │   │   └── Resources/UserResource.php
│   │   ├── Models/             # Eloquent models (User, Room, Game, Round, Move, …)
│   │   ├── Services/
│   │   │   ├── Game/           # UnoCard, UnoDeck, UnoGameEngine
│   │   │   └── Auth/AuthService.php
│   │   ├── Events/             # Broadcasting events (GameStateUpdated, CardPlayed, …)
│   │   └── Policies/RoomPolicy.php
│   ├── database/
│   │   ├── migrations/         # All 8 migration files
│   │   └── seeders/DatabaseSeeder.php
│   └── routes/{api,channels}.php
│
├── frontend/                   # Next.js 15 App
│   ├── src/
│   │   ├── app/                # App Router pages
│   │   │   ├── page.tsx        # Landing page
│   │   │   ├── (auth)/         # Login, Register
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── lobby/          # Room listing + Create room
│   │   │   ├── room/[code]/    # Waiting room + Chat
│   │   │   ├── game/[gameId]/  # Live game board
│   │   │   ├── leaderboard/    # Global rankings
│   │   │   └── admin/          # Admin panel
│   │   ├── components/
│   │   │   ├── game/GameBoard.tsx   # Full UNO game board
│   │   │   └── layout/Sidebar.tsx   # Navigation
│   │   ├── lib/
│   │   │   ├── api.ts          # Axios API client
│   │   │   └── echo.ts         # Laravel Echo WebSocket
│   │   └── store/
│   │       ├── authStore.ts    # Zustand auth
│   │       └── gameStore.ts    # Zustand game state
│
├── docker/
│   ├── nginx/default.conf      # Production Nginx config
│   ├── php/Dockerfile          # PHP 8.3-FPM image
│   └── mysql/init.sql          # DB initialization
│
├── .github/workflows/ci.yml    # GitHub Actions CI/CD
└── docker-compose.yml          # Full stack orchestration
```

## 🧪 Tests

```bash
# Backend unit tests (no DB required)
cd backend && ./vendor/bin/pest tests/Unit

# Backend feature tests (requires DB)
cd backend && ./vendor/bin/pest tests/Feature

# All tests with coverage
cd backend && ./vendor/bin/pest --coverage

# Frontend type check
cd frontend && npx tsc --noEmit

# Frontend lint
cd frontend && npm run lint
```

## 🃏 UNO Rules Implemented

- ✅ Standard card play (match color or value)
- ✅ Skip, Reverse, Draw Two
- ✅ Wild, Wild Draw Four
- ✅ UNO call & penalty for forgetting
- ✅ Challenge Wild Draw Four
- ✅ **Stacking** — stack +2/+4 cards
- ✅ **7-0 Rule** — 7 swaps hands, 0 rotates all hands
- ✅ **Jump In** — play matching card out of turn
- ✅ **Draw Until Can Play** — draw cards until playable
- ✅ **Force Play** — must play if able
- ✅ Turn timer with auto-draw on timeout
- ✅ Direction indicator (CW/CCW)
- ✅ Multi-round scoring (cumulative hand points)

## 🔧 API Reference

All endpoints are prefixed with `/api/v1/`.

**Auth:** `POST /auth/register`, `/auth/login`, `/auth/guest`, `/auth/logout`  
**OAuth:** `GET /auth/social/google/redirect`, `POST /auth/social/google/callback`  
**Rooms:** `GET /rooms`, `POST /rooms`, `POST /rooms/{code}/join`, `POST /rooms/{code}/start`  
**Game:** `GET /games/{id}/state`, `POST /games/{id}/play`, `POST /games/{id}/draw`, `POST /games/{id}/uno`  
**Users:** `GET /users/{username}`, `PATCH /me`, `GET /leaderboard`  
**Friends:** `GET /friends`, `POST /friends/{userId}`, `POST /friends/requests/{id}/accept`  

Full Swagger docs available at `/api/documentation` (after running `php artisan l5-swagger:generate`).

## 🌐 Environment Variables

See [`backend/.env.example`](backend/.env.example) for all backend variables.  
See [`frontend/.env.local`](frontend/.env.local) for all frontend variables.

Key variables to configure:
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub OAuth
- `PUSHER_*` — WebSocket configuration (Soketi)
- `MAIL_*` — Email settings

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push and open a PR

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.
