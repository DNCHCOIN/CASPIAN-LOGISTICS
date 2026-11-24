# CASPIAN LOGISTICS — PostgreSQL data foundation v0.4

**Status: schema implemented and tested in isolated PostgreSQL 17 instance. Not yet deployed to a permanent database; not connected to GitHub Pages or the tracking Node API.**

This project must use its **own database**. The connected Supabase project "DNCH Community" belongs to another product and was intentionally **not modified**.

## Database layout

Schema: \`caspian\`. Tables:

1. \`organizations\`: legal entities, country and verification status
2. \`users\`: identity mapping (no passwords stored here)
3. \`memberships\`: user ↔ company with owner/admin/dispatcher/viewer roles
4. \`cargo_requests\`: offers / cargo enquiries, weights, pallets, dates
5. \`shipments\`: actual shipment records, destination, ETA and status
6. \`route_stops\`: ordered road/rail/sea/terminal/customs stages
7. \`tracking_events\`: deduplicated milestone events with observed and received timestamps, source, verification and demo flags
8. \`document_metadata\`: document type, status, external secure storage key; files **not** stored in the database
9. \`audit_log\`: audit trail foundation

Data uses UUID keys, foreign keys, check constraints, unique transport references per company, and timeline indexes. Cross-organization shipment→cargo and stage→shipment references require matching organization IDs.

## Local test

Requirements: PostgreSQL 15+ binaries available (\`initdb\`, \`pg_ctl\`, \`psql\`), POSIX shell.

From the repository root:

\`\`\`bash
bash db/smoke-test.sh
\`\`\`

It starts a **disposable PostgreSQL instance bound only to a temporary Unix socket**, executes the migration twice, inserts two organizations plus example freight and tracking events, and verifies the tenant isolation constraints. It then shuts down and deletes the temporary test instance.

On the user's NixOS machine (where PostgreSQL was made available through Nix):

\`\`\`bash
nix --extra-experimental-features 'nix-command flakes' shell nixpkgs#postgresql_17 -c bash db/smoke-test.sh
\`\`\`

The real schema definition is \`db/migrations/0001_initial.sql\`. Apply **only** to a new dedicated CASPIAN LOGISTICS PostgreSQL database, as the DB owner.

## Security constraints

The schema is **private**, public grants are revoked, and RLS is enabled on every table. For a trusted server-side transaction, the backend must authenticate the user, verify active organization membership and specific role, then use \`SET LOCAL app.organization_id = 'uuid'\` for tenant scoping before executing queries. Never permit clients to supply tenant IDs without membership verification. Never expose raw SQL or direct database credentials to GitHub Pages.

\`app.organization_id\` is **not by itself authentication**; a malicious SQL client could choose it. Only a trusted, separately authenticated backend may use a limited database role with appropriate table grants. The table owner / migrator should not be used for ordinary API requests. \`users\` intentionally has no ordinary API RLS policy; it is owned by the identity service. \`audit_log\` supports only tenant-scoped SELECT for ordinary access.

The current migration does not implement password-based authentication, rate limiting, role-based backend authorization, backups, encrypted document storage, or public API endpoints. Grant the application only minimum operations after its authorization layer exists.

## Next integration work

- Provision **dedicated** hosted PostgreSQL (a new project, separate from DNCH Community) or persistent private DB on NixOS.
- Store connection URL in private server configuration; do not commit it.
- Implement API identity/login and membership checks.
- Replace browser-local cargo and SQLite tracking storage with authorized PostgreSQL-backed endpoints, with migration/export of test data only after review.
- Integration tests with two distinct users and organizations.
- Add backup, recovery and monitoring before handling real customer records.

**Never expose an unauthenticated public PostgreSQL endpoint or replace production data during development.**
