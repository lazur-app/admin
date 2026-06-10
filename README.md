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

OAuth: `/auth/login/google?source=admin` → redirects to `ADMIN_URL/auth/callback`.

## Deploy

- Host at `admin.lazur.app` (e.g. Vercel)
- Set `NEXT_PUBLIC_API_URL=https://api.lazur.app`
- Set backend `ADMIN_URL=https://admin.lazur.app`
- Add admin origin to CORS in `backend/app/main.py`

See [backend/ADMIN_DASHBOARD_SPEC.md](../backend/ADMIN_DASHBOARD_SPEC.md) for the full analytics roadmap.
# admin
