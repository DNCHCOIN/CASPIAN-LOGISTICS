-- CASPIAN LOGISTICS: independent PostgreSQL 15+ schema v0.4
-- This migration is private. Do not execute against DNCH Community or TRADE.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS caspian;

CREATE TABLE IF NOT EXISTS caspian.organizations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 legal_name text NOT NULL CHECK (length(btrim(legal_name)) BETWEEN 2 AND 180),
 country_code char(2) NOT NULL CHECK (country_code ~ '^[A-Z]{2}$'),
 registration_number text,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','suspended')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(country_code,registration_number)
);

CREATE TABLE IF NOT EXISTS caspian.users (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 external_auth_id text UNIQUE,
 email text NOT NULL,
 display_name text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT valid_email CHECK (position('@' in email)>1)
);
CREATE UNIQUE INDEX IF NOT EXISTS caspian_users_email_lower ON caspian.users(lower(email));

CREATE TABLE IF NOT EXISTS caspian.memberships (
 organization_id uuid NOT NULL REFERENCES caspian.organizations(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES caspian.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('owner','admin','dispatcher','viewer')),
 status text NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','disabled')),
 joined_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(organization_id,user_id)
);
CREATE INDEX IF NOT EXISTS caspian_memberships_by_user ON caspian.memberships(user_id);

CREATE TABLE IF NOT EXISTS caspian.cargo_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES caspian.organizations(id),
 reference text NOT NULL CHECK (length(reference) BETWEEN 2 AND 50),
 created_by uuid REFERENCES caspian.users(id),
 origin_name text NOT NULL CHECK (length(btrim(origin_name))>1),
 destination_name text NOT NULL CHECK (length(btrim(destination_name))>1),
 transport_mode text NOT NULL CHECK (transport_mode IN ('LTL','FTL','CONTAINER','MULTIMODAL')),
 weight_kg numeric(12,2) NOT NULL CHECK (weight_kg>0 AND weight_kg<=200000),
 volume_m3 numeric(12,3) CHECK (volume_m3>0),
 pallets integer CHECK (pallets>=0),
 description text NOT NULL DEFAULT '',
 pickup_date date,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','matched','closed','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,reference),
 UNIQUE(id,organization_id)
);
CREATE INDEX IF NOT EXISTS caspian_cargo_org_status ON caspian.cargo_requests(organization_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS caspian.shipments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES caspian.organizations(id),
 cargo_request_id uuid,
 reference text NOT NULL CHECK(length(reference) BETWEEN 2 AND 50),
 container_number text,
 origin_name text NOT NULL,
 destination_name text NOT NULL,
 transport_mode text NOT NULL DEFAULT 'MULTIMODAL' CHECK(transport_mode IN ('LTL','FTL','CONTAINER','MULTIMODAL')),
 status text NOT NULL DEFAULT 'registered' CHECK(status IN ('registered','in_transit','delayed','delivered','cancelled')),
 eta timestamptz,
 demo boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(organization_id,reference),
 UNIQUE(id,organization_id),
 FOREIGN KEY(cargo_request_id,organization_id) REFERENCES caspian.cargo_requests(id,organization_id)
);
CREATE INDEX IF NOT EXISTS caspian_shipments_org_status ON caspian.shipments(organization_id,status,updated_at DESC);

CREATE TABLE IF NOT EXISTS caspian.route_stops (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 shipment_id uuid NOT NULL,
 ordinal integer NOT NULL CHECK(ordinal>=0),
 location_name text NOT NULL,
 mode text NOT NULL CHECK(mode IN ('road','rail','sea','terminal','customs')),
 expected_arrival timestamptz,
 expected_departure timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(shipment_id,organization_id) REFERENCES caspian.shipments(id,organization_id) ON DELETE CASCADE,
 UNIQUE(shipment_id,ordinal)
);

CREATE TABLE IF NOT EXISTS caspian.tracking_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 shipment_id uuid NOT NULL,
 source text NOT NULL CHECK(length(btrim(source))>0),
 source_event_id text NOT NULL CHECK(length(source_event_id)<=120),
 event_type text NOT NULL CHECK(event_type IN ('registered','pickup_confirmed','terminal_in','terminal_out','rail_loaded','vessel_loaded','vessel_departed','vessel_arrived','customs_cleared','delivered','delay_reported')),
 location_name text NOT NULL,
 transport_mode text NOT NULL CHECK(transport_mode IN ('road','rail','sea','terminal','customs')),
 observed_at timestamptz NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 verified boolean NOT NULL DEFAULT false,
 demo boolean NOT NULL DEFAULT false,
 note text NOT NULL DEFAULT '',
 payload jsonb NOT NULL DEFAULT '{}'::jsonb,
 FOREIGN KEY(shipment_id,organization_id) REFERENCES caspian.shipments(id,organization_id) ON DELETE CASCADE,
 UNIQUE(organization_id,source,source_event_id)
);
CREATE INDEX IF NOT EXISTS caspian_tracking_timeline ON caspian.tracking_events(shipment_id,observed_at DESC,id);

CREATE TABLE IF NOT EXISTS caspian.document_metadata (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL,
 shipment_id uuid NOT NULL,
 document_type text NOT NULL CHECK(document_type IN ('CMR','eCMR','TIR','eTIR','invoice','packing_list','bill_of_lading','other')),
 display_name text NOT NULL CHECK(length(display_name) BETWEEN 1 AND 180),
 storage_key text,
 status text NOT NULL DEFAULT 'required' CHECK(status IN ('required','uploaded','under_review','approved','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(shipment_id,organization_id) REFERENCES caspian.shipments(id,organization_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS caspian_docs_shipment ON caspian.document_metadata(shipment_id);

CREATE TABLE IF NOT EXISTS caspian.audit_log (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 organization_id uuid NOT NULL REFERENCES caspian.organizations(id),
 actor_user_id uuid REFERENCES caspian.users(id),
 entity_type text NOT NULL,
 entity_id uuid,
 action text NOT NULL,
 metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS caspian_audit_org_time ON caspian.audit_log(organization_id,created_at DESC);

-- In private API transactions set the tenant using SET LOCAL app.organization_id = '<uuid>'.
-- Clients must never have a direct SQL connection. The app role must not own tables
-- or have BYPASSRLS; don't permit direct end-user SQL access.
CREATE OR REPLACE FUNCTION caspian.current_organization() RETURNS uuid
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
 SELECT CASE WHEN current_setting('app.organization_id',true) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 THEN current_setting('app.organization_id',true)::uuid ELSE NULL END
$$;

ALTER TABLE caspian.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE caspian.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE caspian.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE caspian.cargo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE caspian.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE caspian.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE caspian.tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE caspian.document_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE caspian.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_scope ON caspian.organizations;
DROP POLICY IF EXISTS membership_scope ON caspian.memberships;
DROP POLICY IF EXISTS cargo_scope ON caspian.cargo_requests;
DROP POLICY IF EXISTS shipment_scope ON caspian.shipments;
DROP POLICY IF EXISTS route_scope ON caspian.route_stops;
DROP POLICY IF EXISTS event_scope ON caspian.tracking_events;
DROP POLICY IF EXISTS document_scope ON caspian.document_metadata;
DROP POLICY IF EXISTS audit_scope ON caspian.audit_log;
CREATE POLICY org_scope ON caspian.organizations USING(id=caspian.current_organization()) WITH CHECK(id=caspian.current_organization());
CREATE POLICY membership_scope ON caspian.memberships USING(organization_id=caspian.current_organization()) WITH CHECK(organization_id=caspian.current_organization());
CREATE POLICY cargo_scope ON caspian.cargo_requests USING(organization_id=caspian.current_organization()) WITH CHECK(organization_id=caspian.current_organization());
CREATE POLICY shipment_scope ON caspian.shipments USING(organization_id=caspian.current_organization()) WITH CHECK(organization_id=caspian.current_organization());
CREATE POLICY route_scope ON caspian.route_stops USING(organization_id=caspian.current_organization()) WITH CHECK(organization_id=caspian.current_organization());
CREATE POLICY event_scope ON caspian.tracking_events USING(organization_id=caspian.current_organization()) WITH CHECK(organization_id=caspian.current_organization());
CREATE POLICY document_scope ON caspian.document_metadata USING(organization_id=caspian.current_organization()) WITH CHECK(organization_id=caspian.current_organization());
CREATE POLICY audit_scope ON caspian.audit_log FOR SELECT USING(organization_id=caspian.current_organization());
-- User accounts are accessed only by privileged identity/auth service, never general API role.

-- Keep schemas inaccessible to public roles even on Supabase by default.
REVOKE ALL ON SCHEMA caspian FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA caspian FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA caspian FROM PUBLIC;
COMMIT;
