# CASPIAN LOGISTICS API — development v0.3

## What exists now
- Minimal Node.js 22+ HTTP service.
- `GET /health/live`: returns 200 when server is running.
- `GET /health/ready`: runs a PostgreSQL `SELECT 1`; returns 503 when unavailable.
- Unknown and business endpoints return 404. **There are no registration, authentication, cargo or document endpoints yet.**

## Local test (no database required)
```sh
cd apps/api
npm test
```
The tests use only built-in Node modules. The CI/test runner need not connect to PostgreSQL.

## Local start with a real database
1. Provision an isolated PostgreSQL instance and apply `db/migrations/001_foundation.sql`.
2. From `apps/api`, run `npm install` (Node.js 22+).
3. Set `DATABASE_URL` as a secret outside version control, e.g. from your private shell configuration.
4. Run `npm start` (binds to 127.0.0.1:3001 by default).
5. Visit `http://127.0.0.1:3001/health/live` and `/health/ready`.

Never expose the service to the internet yet. The API currently has no authentication, authorization, rate limiting, file scanning, or business routes.

## Next implementation milestones
1. Add migration runner, DB tests, least-privilege DB runtime account.
2. Implement external identity integration; verify tokens server-side and design membership authorization checks.
3. Add company onboarding and cargo request endpoints with validation and isolation tests.
4. Supply complete reproducible container image and staging compose file.
5. Validate backup/restore on a separate host before using real data.

## Migration and security notes
`001_foundation.sql` is an initial schema draft intended for an empty dev DB; do not run twice.
Data isolation is NOT yet enforced with row-level security or a complete API policy.
No real customer/identity documents or credentials should be loaded.
The existing `index.html` remains an unchanged static demonstration.
