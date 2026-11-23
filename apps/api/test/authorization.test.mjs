import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccess, authorizeCompanyAction } from '../src/authorization.mjs';

const identity = { verified: true, subject: 'oidc|alice' };
const company = { id: 'company-a', verificationStatus: 'verified' };
const membership = { companyId: 'company-a', identitySubject: 'oidc|alice', active: true, role: 'owner' };
const allows = (changes = {}) => canAccess({ identity, company, membership, action: 'cargo:read', ...changes });

test('missing or unverified identity never grants access', () => {
  assert.equal(allows({identity: null}), false);
  assert.equal(allows({identity: {subject:'oidc|alice'}}), false);
  assert.equal(allows({identity: {verified:false,subject:'oidc|alice'}}), false);
});
test('a forged or inactive membership fails closed', () => {
  assert.equal(allows({membership:{...membership, identitySubject:'oidc|mallory'}}),false);
  assert.equal(allows({membership:{...membership,active:false}}),false);
  assert.equal(allows({membership:{...membership,role:'superuser'}}),false);
});
test('cross-company membership is always rejected', () => {
  assert.equal(allows({company:{id:'company-b',verificationStatus:'verified'}}),false);
  assert.equal(allows({membership:{...membership,companyId:'company-b'}}),false);
});
test('owners can manage memberships, viewers cannot', () => {
  assert.equal(allows({action:'members:manage'}),true);
  assert.equal(allows({membership:{...membership,role:'viewer'},action:'members:manage'}),false);
  assert.equal(allows({membership:{...membership,role:'viewer'},action:'cargo:read'}),true);
});
test('dispatchers can manage cargo, but not company or members', () => {
  const dispatcher = {...membership,role:'dispatcher'};
  assert.equal(allows({membership:dispatcher,action:'cargo:publish'}),true);
  assert.equal(allows({membership:dispatcher,action:'company:update'}),false);
  assert.equal(allows({membership:dispatcher,action:'members:manage'}),false);
});
test('pending company is restricted to profile inspection and owner edits', () => {
  const pending = {...company,verificationStatus:'pending'};
  assert.equal(allows({company:pending,action:'cargo:read'}),false);
  assert.equal(allows({company:pending,action:'company:read'}),true);
  assert.equal(allows({company:pending,action:'company:update'}),true);
  assert.equal(allows({company:pending,membership:{...membership,role:'viewer'},action:'company:update'}),false);
});
test('suspended and rejected companies are always blocked', () => {
  for (const verificationStatus of ['suspended','rejected']) {
    assert.equal(allows({company:{...company,verificationStatus},action:'company:read'}),false);
  }
});
test('unknown action or missing membership fails closed', () => {
  assert.equal(allows({action:'admin:everything'}),false);
  assert.equal(allows({membership:null}),false);
});
test('server-side resolver does not call membership lookup for unknown company', async () => {
  let queried = false;
  const allowed = await authorizeCompanyAction({
    verifiedIdentity:identity,companyId:'company-b',action:'cargo:read',
    getCompanyById: async()=>null,
    getMembershipByIdentity:async()=>{queried=true;return membership;}
  });
  assert.equal(allowed,false);assert.equal(queried,false);
});
test('server-side resolver only accepts matching verified subject and tenant', async () => {
  const allowed = await authorizeCompanyAction({
    verifiedIdentity: identity,companyId:'company-a',action:'cargo:read',
    getCompanyById:async()=>company,
    getMembershipByIdentity:async(id,subject)=>{
      assert.equal(id,'company-a');assert.equal(subject,'oidc|alice');
      return membership;
    }
  });
  assert.equal(allowed,true);
});
