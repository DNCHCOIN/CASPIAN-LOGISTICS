import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordDigest,passwordMatches,tokenHash,parseSessionCookie,sessionCookie,ACCOUNT_NAMES } from '../src/test-auth.mjs';
test('two predefined personal testing handles',()=>assert.deepEqual(ACCOUNT_NAMES,['nedka-admin','tsvetan-review']));
test('password digests roundtrip and reject incorrect password',async()=>{
 const d=await passwordDigest('long-test-password-12345678');
 assert.equal(await passwordMatches('long-test-password-12345678',d.salt,d.hash),true);
 assert.equal(await passwordMatches('incorrect-password-1234',d.salt,d.hash),false);
});
test('short passwords are rejected',async()=>await assert.rejects(passwordDigest('short')));
test('session cookie is HttpOnly, same-site strict, and cookie parsing is strict',()=>{
 const token='a'.repeat(64);
 const cookie=sessionCookie(token,true);
 assert.match(cookie,/HttpOnly/);assert.match(cookie,/SameSite=Strict/);assert.match(cookie,/Secure/);
 assert.equal(parseSessionCookie('other=1; '+cookie),token);
 assert.equal(parseSessionCookie('caspian_test_session=invalid'),null);
});
test('only hash of session token is stored',()=>assert.notEqual(tokenHash('a'.repeat(64)),'a'.repeat(64)));
