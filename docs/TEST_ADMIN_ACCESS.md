# CASPIAN LOGISTICS — two isolated local test administrators

## Status
- UI and session endpoints are implemented in development/foundation-v03.
- Accounts and their credentials are NOT active until provisioned against a real staging PostgreSQL instance.
- No passwords are stored in GitHub. Do not copy chat-shared credentials into repository files.
- Only loopback requests are supported; never publish this temporary mechanism for internet access.

## Accounts
- nedka-admin — test_admin
- tsvetan-admin — test_admin
- Independent account IDs, password hashes and sessions.
- These are TEST ADMIN accounts and not company memberships.
- They share equal test roles. Company registration and business authorization remain separate and incomplete.

## Provision manually (not in GitHub Actions)
1. Prepare a private PostgreSQL 16+ database.
2. Apply migrations 001_foundation.sql and 002_test_accounts.sql, in that order, only once.
3. In apps/api, install dependencies (`npm install`).
4. Use a secure local secret source for DATABASE_URL and two desired passwords:
   TEST_ADMIN_PASSWORD and TEST_TSVETAN_PASSWORD.
5. Set ENABLE_TEST_AUTH=true and NODE_ENV=development.
6. Run `node scripts/create-test-accounts.mjs` once. This creates or rotates both logins.
7. Start the API with HOST=127.0.0.1, then open http://127.0.0.1:3001/test-login.
8. Test login, invalid credentials, separate browser sessions, and logout.

NOTE: An intentionally shared password may work in private development but is NOT recommended
for any publicly reachable environment. Rotate it before wider access. Accounts must not
be exposed via GitHub Pages or any reverse proxy.

## Security limitations
- Session cookies are HttpOnly and SameSite=Strict; local HTTP is permitted only on loopback.
- No public network access. This is not a production identity provider.
- No application-wide administration endpoints are exposed yet, regardless of test role.
- Before a remote demo for Tsvetan, implement HTTPS, proper identity/auth flow, password recovery,
  full auditing and stronger rate limits, then perform integration and penetration tests.
- The existing published v0.2 index.html remains independent and unchanged.
