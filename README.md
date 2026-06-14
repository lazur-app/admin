# Lazur Admin

Internal Next.js dashboard for Lazur operators. All data flows through the Python backend:

```
admin (Next.js) → backend (FastAPI) → PostgreSQL
```

## Setup

1. Copy env and point at your API:

   ```bash
   cp .env.example .env.local
   ```

2. In the backend `.env`, set:

   ```env
   ADMIN_URL=http://localhost:3001
   ```

3. Grant yourself admin in the database:

   ```sql
   UPDATE users SET is_admin = true WHERE email = 'you@example.com';
   ```

   Apply schema via `cd backend && alembic upgrade head` (or restart dev API after migration).

4. Run backend (port 8000) and admin:

   ```bash
   # terminal 1 — backend
   cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000

   # terminal 2 — admin
   cd admin && npm run dev
   ```

5. Open [http://localhost:3001/login](http://localhost:3001/login) and sign in with Google.

## API routes used

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/me` | Current admin profile |
| GET | `/admin/overview` | Platform metrics |
| GET | `/admin/users` | User list (`?search=`) |
| GET | `/admin/users/{id}` | User detail |
| GET | `/admin/analytics/timeseries` | Platform charts (`?metric=&from=&to=`) |
| GET | `/admin/analytics/compare` | Multi-user / cohort compare |
| GET | `/admin/analytics/users/{id}/hourly` | Hourly activity heatmap |

See [docs/admin-analytics-dashboard.html](../docs/admin-analytics-dashboard.html) for the full spec.

Run migration before first use:

```bash
cd backend && alembic upgrade head
```
