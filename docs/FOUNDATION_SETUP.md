# CASPIAN LOGISTICS — етап 1: сървърна основа

## Статус
SQL миграцията и локалният Docker Compose са добавени в development/foundation-v03.
Не е стартирана база данни, не е внедрен API, вход или реална регистрация.
Публичният index.html остава непроменен.

## Локална инсталация (изисква Docker Compose)
1. cd infra/compose
2. Копирай .env.example като .env и смени паролата с дълга случайна стойност.
3. docker compose up -d
4. docker compose ps  (изчакай статус healthy)
5. docker compose exec -T postgres sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /migrations/001_foundation.sql'
6. docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\\dt"'

IMPORTANT: apply the migration only ONCE to an empty database. It has no down migration.
No ports are exposed. Do not upload identity documents or real client data.

## Model
- companies — company identification and verification state
- app_users — external authentication identity references
- company_memberships — owner, manager, dispatcher, viewer
- cargo_requests — company-owned transport enquiries
- route_legs — sequenced road, rail, sea segments
- shipment_events — milestone tracking
- document_metadata — private storage references only (no file bytes)
- audit_log — change audit metadata

## Before production
- Implement and TEST server-side authentication + tenant authorization for every API endpoint.
- Separate migration/admin DB credentials from least-privilege runtime credentials.
- Add API validation, rate limits, account lifecycle, verified storage uploads, retention policy.
- Define security barriers for identities, operator integrations and audit records.
- Add migrations runner, tests, monitored backups, recovery drills and client-owned hosting.
- Resolve personal-data processing and records retention obligations.
- Confirm client ownership of domain, accounts, source and data.
- Keep projects independent of Grupaj.bg and the DNCH home server.

## Portability test
Deploy tagged version on clean host, migrate schema, restore test DB and documents,
validate API behavior, restore backup to another host, verify DNS/HTTPS and rollback.
