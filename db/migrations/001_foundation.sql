-- CASPIAN LOGISTICS v0.3 foundation
-- Apply to an EMPTY, project-specific PostgreSQL 16+ database.
-- Schema intentionally stores no passwords or identity documents.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL CHECK(length(btrim(legal_name)) BETWEEN 2 AND 240),
  registration_country char(2) NOT NULL CHECK(registration_country ~ '^[A-Z]{2}$'),
  registration_number text NOT NULL CHECK(length(btrim(registration_number)) BETWEEN 2 AND 80),
  vat_number text,
  contact_email text,
  verification_status text NOT NULL DEFAULT 'pending'
    CHECK(verification_status IN ('pending','verified','rejected','suspended')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(registration_country,registration_number)
);

-- Authentication identity is supplied by a future trusted identity provider.
-- No passwords or API tokens stored here.
CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_subject text NOT NULL UNIQUE,
  email text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE company_memberships (
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK(role IN ('owner','manager','dispatcher','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(company_id,user_id)
);
CREATE INDEX company_memberships_user_idx ON company_memberships(user_id);

CREATE TABLE cargo_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  created_by uuid NOT NULL REFERENCES app_users(id),
  title text NOT NULL CHECK(length(btrim(title)) BETWEEN 3 AND 240),
  origin_country char(2) NOT NULL CHECK(origin_country ~ '^[A-Z]{2}$'),
  origin_place text NOT NULL,
  destination_country char(2) NOT NULL CHECK(destination_country ~ '^[A-Z]{2}$'),
  destination_place text NOT NULL,
  gross_weight_kg numeric(12,3) CHECK(gross_weight_kg > 0),
  volume_m3 numeric(12,3) CHECK(volume_m3 > 0),
  ready_date date,
  status text NOT NULL DEFAULT 'draft'
    CHECK(status IN ('draft','published','matched','in_transit','delivered','cancelled')),
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cargo_requests_company_idx ON cargo_requests(company_id,created_at DESC);
CREATE INDEX cargo_requests_search_idx ON cargo_requests(status,origin_country,destination_country);

CREATE TABLE route_legs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_request_id uuid NOT NULL REFERENCES cargo_requests(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK(position >= 1),
  mode text NOT NULL CHECK(mode IN ('road','rail','sea')),
  origin_location text NOT NULL,
  destination_location text NOT NULL,
  planned_departure timestamptz,
  planned_arrival timestamptz,
  external_operator_reference text,
  CHECK(planned_arrival IS NULL OR planned_departure IS NULL OR planned_arrival >= planned_departure),
  UNIQUE(cargo_request_id,position)
);

CREATE TABLE shipment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_request_id uuid NOT NULL REFERENCES cargo_requests(id) ON DELETE CASCADE,
  route_leg_id uuid REFERENCES route_legs(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  description text NOT NULL,
  source text NOT NULL CHECK(source IN ('manual','operator_api','system')),
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES app_users(id),
  external_event_id text
);
CREATE INDEX shipment_events_timeline_idx ON shipment_events(cargo_request_id,occurred_at DESC);

CREATE TABLE document_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo_request_id uuid NOT NULL REFERENCES cargo_requests(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES app_users(id),
  document_type text NOT NULL,
  object_key text NOT NULL UNIQUE,
  original_filename text NOT NULL,
  content_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK(size_bytes > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON audit_log(created_at DESC);

-- CRITICAL: This migration does not implement tenant isolation.
-- Do not expose these tables directly to browsers, use production data, or
-- connect a public API before authenticated, tested authorization is in place.
COMMIT;
