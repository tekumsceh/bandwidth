# Release Preflight Checklist

Run this gate before production deploy. The goal is to prevent accidental dev settings and auth misconfiguration.

## 1) Environment hygiene

- Keep a single `ADMIN_EMAIL` key and ensure value is a valid email.
- Remove duplicate keys from `backend/.env`.
- Set `NODE_ENV=production`.
- Ensure DB values are production-safe (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).

## 2) OAuth correctness

- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are from the production Google project.
- `GOOGLE_REDIRECT_URI` must match exactly:
  - `<BACKEND_URL>/api/auth/google/callback`
- In Google Console, the OAuth client must include:
  - Authorized redirect URI: `<BACKEND_URL>/api/auth/google/callback`
  - Authorized JavaScript origin: `<CLIENT_URL>`

## 3) URL consistency

- `CLIENT_URL` and `FRONTEND_URL` match intended frontend host.
- `BACKEND_URL` matches public backend host.
- No `localhost` URLs remain in production env.

## 4) Email readiness

- Configure SMTP fully: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- Validate forgot-password and email verification delivery in staging.

## 5) Run automated gate

From `backend/`:

```bash
npm run preflight:prod
```

Local dry-run (keeps localhost allowed, still checks duplicates and key validity):

```bash
npm run preflight:prod -- --allow-localhost
```

## 6) Build + tests

From `backend/`:

```bash
npm test
```

From `frontend/`:

```bash
npm run build
```

## 7) Final smoke test

- Email/password login works.
- Google login works.
- Forgot password link arrives and reset succeeds.
- Verify-email link succeeds.
- Logout and re-login behavior is correct.

