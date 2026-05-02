# BreachAlert

BreachAlert is a personal data breach monitoring service. It watches user email addresses for exposure in public breach feeds and notifies subscribers when a new compromise is detected.

## Architecture

- Backend: FastAPI + SQLAlchemy
- Data store: SQLite by default, configurable via `DATABASE_URL`
- Cache/queue: Redis
- Frontend: React + Vite
- Notification: email templates with actionable advice
- Scan engine: ad-hoc scans on subscription and nightly queue processing

## Features

- Register and authenticate users
- Add multiple monitored email addresses
- Verify email ownership before activating monitoring
- Store breach history and exposed data types
- Send alerts when a new email is found in breach data
- Schedule nightly scans with APScheduler

## Quick Start (Local - Windows)

### Terminal 1 - Backend
```powershell
cd backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Terminal 2 - Frontend  
```powershell
cd frontend
npm install
npm run dev
```

**URLs:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/docs

## 🚀 Production Deployment (Railway - Free Tier)

1. **Sign up**: https://railway.app (GitHub login)
2. **Install Railway CLI**: `npm i -g @railway/cli`
3. **Login**: `railway login`
4. **Init**: `railway init` (select new project, name: breachalert-prod)
5. **Link DB/Redis**: `railway add` (Postgres + Redis plugins)
6. **Env vars** (Railway dashboard):
   - `DATABASE_URL`: From Postgres service
   - `REDIS_URL`: From Redis service
   - `SECRET_KEY`: Generate `openssl rand -hex 32`
   - `HIBP_API_KEY`: Optional (https://haveibeenpwned.com/API/Key)
7. **Deploy**: `railway up` → Live URL!

**Live Demo**: [Insert Railway URL after deploy]

**Note**: Delete DB/Redis plugins to stop billing (free hobby limits).

### Demo Flow (Test Emails)
1. Register: `alice@test.com` / `TestPass123!`
2. Login same creds
3. Add `test@example.com` → "Watching email" (notifier stub)
4. Go /verify → enter `test@example.com` + any token (stub verifies)
5. Back watchlist → "Scan Now" → Creates simulated breach (HIBP fallback)
6. View History → See ExampleCorp breach with password advice

**Free tier: 1 email. Upgrade to Family (5 emails) via /upgrade.**

**Optional Redis:** `winget install Redis` for queue/caching (fallback works).

✅ **Scanner Module & Queue Worker Complete** (Deliverable 1):
- Scanner: `services/hibp_client.py` + `scan_engine.py`
- Queue: Redis-backed worker (`scan_runner.py`)

## Privacy Policy (Deliverable 2)
No plain-text breach data stored. Hashed IDs, data class counts only. 90-day auto-purge.

See [API_INTEGRATION.md](API_INTEGRATION.md) (Deliverable 3).

## Environment Variables

- `DATABASE_URL` - SQL database connection string (SQLite/Postgres)
- `REDIS_URL` - Redis connection string
- `SECRET_KEY` - JWT secret for authentication
- `HIBP_API_KEY` - Optional HIBP API key ($3.50/1000 queries)
- `NOTIFY_FROM` - Email sender address (stubbed)
- `FRONTEND_URL` - Allowed origin for CORS

## Notes

This repository is built from scratch and includes all core monitoring, verification, and alerting logic for the BreachAlert service.
