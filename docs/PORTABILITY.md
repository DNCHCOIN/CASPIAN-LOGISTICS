# CASPIAN LOGISTICS — portable deployment architecture (draft)

Status: design only. The existing v0.2 index.html is a browser-local demonstration. No backend, database, or production services have been installed.

## Goals
- Keep CASPIAN LOGISTICS separate from TRADE-TSVETAN, BUSINESS HUB, and Grupaj.bg.
- Deploy the same tagged release to staging and the client's hosting with only configuration changes.
- Never depend on DNCH hardware, a fixed IP, a particular domain or one cloud vendor.
- Keep source code, user data, documents and secrets independently movable.

## Target structure (future, not yet implemented)
- apps/web: browser UI; configurable public API base URL
- apps/api: Node.js service with versioned /api/v1 endpoints, validation, authorization
- db/migrations: version-controlled PostgreSQL schema migrations
- infra/compose: Docker Compose for the API, database and reverse proxy
- docs: installation, backup/restore, DNS change, migration and rollback runbooks

## Environment variables (not credentials)
PUBLIC_BASE_URL, API_BASE_URL, DATABASE_URL, STORAGE_ENDPOINT, STORAGE_BUCKET,
STORAGE_REGION, STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, SESSION_SECRET,
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM.

Use .env.example with placeholders only. Never commit real secrets.

## Data
- PostgreSQL per project, migration-backed, with role-based access.
- Documents in private object storage (S3-compatible when possible) or private volume with explicit export/restore process.
- App reads all environment-specific values from configuration.
- Regular backups include DB + uploaded files; verify by restoring them in a fresh test environment.
- Audit logs for administrative changes; avoid collecting unnecessary personal documents.

## Deployment conditions
- VPS/container-compatible hosting for the intended backend, not assumed shared PHP-only hosting.
- HTTPS reverse proxy, scheduled backups, automatic health checks.
- Staging must use different accounts, database, buckets and secrets from production.
- Automated smoke tests and rollback to last tested release.
- Data portability verified in a test move before onboarding real customers.

## Phases
1. Keep v0.2 demo untouched and document current screens and data flows.
2. Introduce isolated API and database migrations in a development branch.
3. Add authentication, company accounts, roles and cargo CRUD with server-side validation.
4. Deploy to a staging environment and test migration+restore.
5. Add operator integrations only when partner API permissions and compliance are confirmed.
6. Provision client-owned domain/hosting, test staging with realistic anonymized data,
   freeze writes for final transfer, restore latest data, switch DNS and verify services.

## Critical boundaries
- Existing demo localStorage data is not server data; migrating it requires an explicit import/export workflow.
- Neither legitimate e-CMR/e-TIR issuance nor booking can be guaranteed without external legal/technical integration.
- Do not point the production app to an unsecured home-network service.
- Never link CASPIAN to Grupaj.bg without separate authorization.
