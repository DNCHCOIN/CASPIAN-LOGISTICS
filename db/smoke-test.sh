#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
tmp="$(mktemp -d /tmp/caspian-pg-XXXXXX)"
port=55437
cleanup() { pg_ctl -D "$tmp/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$tmp"; }
trap cleanup EXIT
mkdir -p "$tmp/data" "$tmp/socket"
initdb -D "$tmp/data" --auth-local=trust --auth-host=reject -U postgres --no-instructions >/dev/null
pg_ctl -D "$tmp/data" -o "-c listen_addresses='' -c unix_socket_directories='$tmp/socket' -p $port" -l "$tmp/pg.log" -w start >/dev/null
export PGHOST="$tmp/socket" PGPORT="$port" PGUSER=postgres PGDATABASE=postgres
psql -v ON_ERROR_STOP=1 -q -f db/migrations/0001_initial.sql
psql -v ON_ERROR_STOP=1 -q -f db/migrations/0001_initial.sql
psql -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO caspian.organizations(id,legal_name,country_code)
VALUES ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','Example Transport BG','BG'),
       ('bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb','Example Transport KZ','KZ');
INSERT INTO caspian.cargo_requests(organization_id,reference,origin_name,destination_name,transport_mode,weight_kg)
VALUES ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','REQ-001','Пловдив','Алмати','LTL',1200);
INSERT INTO caspian.shipments(id,organization_id,reference,origin_name,destination_name,demo)
VALUES ('cccccccc-cccc-4ccc-cccc-cccccccccccc','aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','SHIP-001','Пловдив','Алмати',true);
INSERT INTO caspian.tracking_events(organization_id,shipment_id,source,source_event_id,event_type,location_name,transport_mode,observed_at,demo)
VALUES ('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa','cccccccc-cccc-4ccc-cccc-cccccccccccc','test','evt-1','terminal_in','Баку','terminal',now(),true);
CREATE ROLE caspian_test_user LOGIN NOINHERIT;
GRANT USAGE ON SCHEMA caspian TO caspian_test_user;
GRANT EXECUTE ON FUNCTION caspian.current_organization() TO caspian_test_user;
GRANT SELECT ON caspian.shipments,caspian.tracking_events,caspian.cargo_requests TO caspian_test_user;
SET ROLE caspian_test_user;
DO $$
BEGIN
  IF (SELECT count(*) FROM caspian.shipments) <> 0 THEN RAISE EXCEPTION 'Unscoped tenant data leak'; END IF;
END $$;
BEGIN;
SET LOCAL app.organization_id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
DO $$
BEGIN
 IF (SELECT count(*) FROM caspian.shipments) <> 1 THEN RAISE EXCEPTION 'Tenant A shipments inaccessible'; END IF;
 IF (SELECT count(*) FROM caspian.tracking_events) <> 1 THEN RAISE EXCEPTION 'Tenant A milestones inaccessible'; END IF;
END $$;
COMMIT;
BEGIN;
SET LOCAL app.organization_id='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
DO $$
BEGIN
 IF (SELECT count(*) FROM caspian.shipments) <> 0 THEN RAISE EXCEPTION 'Tenant B can see tenant A'; END IF;
 IF (SELECT count(*) FROM caspian.cargo_requests) <> 0 THEN RAISE EXCEPTION 'Tenant B can see cargo A'; END IF;
END $$;
COMMIT;
RESET ROLE;
DO $$
BEGIN
 IF (SELECT count(*) FROM information_schema.tables WHERE table_schema='caspian' AND table_type='BASE TABLE') <> 9 THEN RAISE EXCEPTION 'Incorrect table count'; END IF;
END $$;
SQL
echo "PASS: repeatable migration, 9 tables, organization data isolation, shipment and timeline sample"
