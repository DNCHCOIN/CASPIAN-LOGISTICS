/**
 * CASPIAN authorization policy (pure policy functions).
 * Only a VERIFIED identity subject from a server-side identity verifier may be passed.
 * This code is not an authentication mechanism; never use request-supplied role/subject.
 * Database membership must be loaded server-side for the current verified identity.
 */
export const MEMBERSHIP_ROLES = Object.freeze(['owner','manager','dispatcher','viewer']);
export const ACTIONS = Object.freeze([
  'company:read', 'company:update', 'members:read', 'members:manage',
  'cargo:read', 'cargo:create', 'cargo:update', 'cargo:publish',
  'documents:read', 'documents:upload', 'audit:read'
]);

const roleCapabilities = Object.freeze({
  owner: new Set(ACTIONS),
  manager: new Set(ACTIONS.filter(action => action !== 'audit:read')),
  dispatcher: new Set(['company:read','members:read','cargo:read','cargo:create',
    'cargo:update','cargo:publish','documents:read','documents:upload']),
  viewer: new Set(['company:read','cargo:read','documents:read'])
});

export function canAccess({ identity, company, membership, action } = {}) {
  // Fail closed on missing or unverified identity and unrecognized actions.
  if (!identity || identity.verified !== true || typeof identity.subject !== 'string'
    || !identity.subject.trim() || !ACTIONS.includes(action)) return false;
  if (!company || typeof company.id !== 'string' || !company.id) return false;
  if (!membership || membership.active !== true || membership.companyId !== company.id
    || membership.identitySubject !== identity.subject) return false;
  if (!MEMBERSHIP_ROLES.includes(membership.role)) return false;
  if (company.verificationStatus === 'suspended' || company.verificationStatus === 'rejected')
    return false;
  // Pending firms may inspect their profile, but may not transact or browse documents.
  if (company.verificationStatus !== 'verified') {
    return action === 'company:read' || (
      action === 'company:update' && ['owner','manager'].includes(membership.role)
    );
  }
  return roleCapabilities[membership.role].has(action);
}

/** Maps a request to authorization using server-side membership lookups only. */
export async function authorizeCompanyAction({ verifiedIdentity, companyId, action,
  getCompanyById, getMembershipByIdentity } = {}) {
  if (!verifiedIdentity || verifiedIdentity.verified !== true
    || typeof verifiedIdentity.subject !== 'string' || !verifiedIdentity.subject.trim()
    || typeof companyId !== 'string' || !companyId
    || !ACTIONS.includes(action)
    || typeof getCompanyById !== 'function' || typeof getMembershipByIdentity !== 'function') {
    return false;
  }
  const company = await getCompanyById(companyId);
  if (!company || company.id !== companyId) return false;
  const membership = await getMembershipByIdentity(companyId, verifiedIdentity.subject);
  return canAccess({ identity: verifiedIdentity, company, membership, action });
}
