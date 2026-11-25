# CASPIAN operational service — private development

Continues `development/tracking-i18n-20261125` at `2151f13`, preserving the public demo, localized tracking and original private PostgreSQL schema.

`002_platform.sql` extends that schema without destructive changes. `api.mjs` uses the company's authenticated identity and a restricted PostgreSQL role; company IDs are never accepted as authority from clients. `planning.mjs` supplies explicitly synthetic multimodal road/rail/sea alternatives with per-leg costs, waits, transfer overhead, load share and delay ranges.

Implemented flows: cargo CRUD/versioning; route comparison with capacity/ADR/temperature exclusions; own-company matching within a departure window and all three capacity constraints; persisted consolidation; synthetic shipment and route stages; manual unverified events with idempotency/conflict and late-arrival protection; current-timeline export; protected document/checklist metadata; private virtual warehouses and transaction-locked, date-overlap reservations.

Matching uses first-fit decreasing and does not promise an optimal packing. Matching does not reserve transport. Warehouse capacity is synthetic and belongs to the company; marketplace-wide capacity and physical operators are future integrations. Delay ranges are scenario buffers, not statistical or live weather forecasts. e-CMR/e-TIR uploads do not issue legally recognized documents. Broker marketplace and operator bookings remain external work, not simulated completion.

`node --test service/planning.test.mjs` verifies calculation/constraints. Cross-company, persistence, event and concurrency integration tests are in HUB `platform/test/integration.mjs`. No real shipments, operator data, production or Cloudflare configuration are changed.
