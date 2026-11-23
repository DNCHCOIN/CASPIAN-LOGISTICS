# CASPIAN LOGISTICS — identity & company authorization design

Status: authorization policy module and tests, **not a working login or registration system**.

## Roles
- owner: company and member administration, cargo and document access, audit reads
- manager: company and member administration, cargo and document access; no audit reads
- dispatcher: cargo and document operations; read company and member summary
- viewer: read company, cargo and documents only

## Rules
- Every identity must be verified server-side before the role policy is invoked.
- Never trust companyId, subject or role taken from an unsigned request claim.
- Membership is looked up server-side for the requested company and verified identity.
- No cross-company access; membership must match company AND subject and be active.
- Pending companies may view their profile and owners/managers can edit it; no cargo or document access.
- Suspended and rejected companies cannot access operations.
- Unknown roles and actions fail closed.
- Errors in data lookups must be caught by future HTTP handlers and returned without leaking database details.

## Outstanding work (required before public use)
1. Choose a portable OpenID Connect authentication provider / issuer.
2. Implement signature, issuer, audience, expiry and nonce/state validation in the API.
3. Require email verification and an anti-abuse onboarding flow.
4. Implement trusted admin approval of new companies; no public endpoint should set verified status.
5. Implement repositories for company and membership queries, with transaction-safe updates.
6. Add resource ownership checks for every cargo request and uploaded document.
7. Add database-level tenant isolation (e.g. carefully tested RLS), or isolated privilege-bounded SQL paths.
8. Add account recovery, revocation, rate limiting, audit logging and privacy/retention policy.
9. Perform integration and security tests against PostgreSQL before internet exposure.

The current API exposes **no account or company endpoints**. This policy must not be wired to unverified identities.
