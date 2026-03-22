# Local development

## Prerequisites

- Node.js 20+ recommended
- MySQL (e.g. XAMPP) with a database the app can use
- Copy `backend/.env` from `.env.example` if present, or configure at least DB connection variables your schema expects (see `backend/src/services/schemaService.ts` and `backend/.env`).

## Backend

```bash
cd backend
npm install
npm run dev
```

- Default URL: `http://localhost:5000` (override with `PORT` in `.env`).
- Health check: `GET http://localhost:5000/api/health`

### Tests (no running server required)

```bash
cd backend
npm test
```

Builds TypeScript, then runs API smoke tests against `createApp()` (health, auth guards, client log endpoint).

## Frontend

```bash
cd frontend
npm install
npm run dev
```

- Vite dev server: `http://localhost:5173`
- CORS is configured in the backend for `http://localhost:5173` with credentials.

### Build / lint

```bash
cd frontend
npm run build
npm run lint
```

A clean `npm run lint` is expected on `main` / release branches; ESLint config lives in `frontend/eslint.config.js`.

## Typical workflow

1. Start MySQL and ensure `.env` matches your DB.
2. Terminal A: `cd backend && npm run dev`
3. Terminal B: `cd frontend && npm run dev`
4. Open the app in the browser; sign-in flows depend on your `SESSION_COOKIE_NAME` / auth setup.
