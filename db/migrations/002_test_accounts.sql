-- Apply once after 001_foundation.sql in an isolated development database.
-- Temporary personal testing identities; NOT company members.
BEGIN;
CREATE TABLE test_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  login_name text NOT NULL UNIQUE CHECK(login_name ~ '^[a-z][a-z0-9_-]{2,31}$'),
  display_name text NOT NULL CHECK(length(btrim(display_name)) BETWEEN 2 AND 100),
  role text NOT NULL CHECK(role IN ('test_admin','test_reviewer')),
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE test_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES test_accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX test_sessions_account_idx ON test_sessions(account_id);
CREATE INDEX test_sessions_expiry_idx ON test_sessions(expires_at);
COMMIT;
