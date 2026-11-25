BEGIN;
ALTER TABLE caspian.cargo_requests ADD COLUMN IF NOT EXISTS loading_m numeric(8,3) NOT NULL DEFAULT 1 CHECK(loading_m>0 AND loading_m<=13.6);
ALTER TABLE caspian.cargo_requests ADD COLUMN IF NOT EXISTS temperature text NOT NULL DEFAULT 'ambient' CHECK(temperature IN ('ambient','chilled'));
ALTER TABLE caspian.cargo_requests ADD COLUMN IF NOT EXISTS hazardous boolean NOT NULL DEFAULT false;
ALTER TABLE caspian.cargo_requests ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
ALTER TABLE caspian.shipments ADD COLUMN IF NOT EXISTS plan jsonb NOT NULL DEFAULT '{}';
CREATE TABLE IF NOT EXISTS caspian.documents (
 id uuid PRIMARY KEY,company_id uuid NOT NULL,kind text NOT NULL,parent_id uuid NOT NULL,
 name text NOT NULL,mime text NOT NULL,size integer NOT NULL CHECK(size>0 AND size<=5242880),sha256 text NOT NULL,storage_key text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'quarantined' CHECK(status IN ('quarantined','reviewed','rejected')),visibility text NOT NULL DEFAULT 'company' CHECK(visibility='company'),
 review_note text NOT NULL DEFAULT '',created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(parent_id,company_id) REFERENCES caspian.shipments(id,organization_id)
);
CREATE TABLE IF NOT EXISTS caspian.consolidations (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL REFERENCES caspian.organizations(id),plan jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(id,organization_id)
);
CREATE TABLE IF NOT EXISTS caspian.allocations (
 cargo_id uuid PRIMARY KEY,organization_id uuid NOT NULL,consolidation_id uuid NOT NULL,
 FOREIGN KEY(cargo_id,organization_id) REFERENCES caspian.cargo_requests(id,organization_id),
 FOREIGN KEY(consolidation_id,organization_id) REFERENCES caspian.consolidations(id,organization_id)
);
CREATE TABLE IF NOT EXISTS caspian.warehouses (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL REFERENCES caspian.organizations(id),name text NOT NULL,location text NOT NULL,
 capacity_m3 numeric NOT NULL CHECK(capacity_m3>0),capacity_kg numeric NOT NULL CHECK(capacity_kg>0),daily_eur numeric NOT NULL CHECK(daily_eur>=0),synthetic boolean NOT NULL DEFAULT true,
 UNIQUE(id,organization_id)
);
CREATE TABLE IF NOT EXISTS caspian.reservations (
 id uuid PRIMARY KEY,organization_id uuid NOT NULL,warehouse_id uuid NOT NULL,shipment_id uuid NOT NULL,
 volume_m3 numeric NOT NULL CHECK(volume_m3>0),weight_kg numeric NOT NULL CHECK(weight_kg>0),starts_on date NOT NULL,ends_on date NOT NULL CHECK(ends_on>starts_on),
 FOREIGN KEY(warehouse_id,organization_id) REFERENCES caspian.warehouses(id,organization_id),
 FOREIGN KEY(shipment_id,organization_id) REFERENCES caspian.shipments(id,organization_id)
);
DO $$DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['documents','consolidations','allocations','warehouses','reservations'] LOOP
  EXECUTE format('ALTER TABLE caspian.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('DROP POLICY IF EXISTS tenant_scope ON caspian.%I',t);
  IF t='documents' THEN
   EXECUTE 'CREATE POLICY tenant_scope ON caspian.documents USING(company_id=caspian.current_organization() OR current_setting(''app.document_reviewer'',true)=''on'') WITH CHECK(company_id=caspian.current_organization() OR current_setting(''app.document_reviewer'',true)=''on'')';
  ELSE
   EXECUTE format('CREATE POLICY tenant_scope ON caspian.%I USING(organization_id=caspian.current_organization()) WITH CHECK(organization_id=caspian.current_organization())',t);
  END IF;
 END LOOP;
END $$;
DROP POLICY IF EXISTS audit_write ON caspian.audit_log;
CREATE POLICY audit_write ON caspian.audit_log FOR INSERT WITH CHECK(organization_id=caspian.current_organization());
REVOKE ALL ON ALL TABLES IN SCHEMA caspian FROM PUBLIC;
COMMIT;
