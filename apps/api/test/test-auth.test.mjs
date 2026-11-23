import test from 'node:test';
import assert from 'node:assert/strict';
import { passwordDigest,passwordMatches,validTestPassword,tokenHash,parseSessionCookie,sessionCookie,ACCOUNT_NAMES } from '../src/test-auth.mjs';
test('two predefined personal testing handles',()=>assert.deepEqual(ACCOUNT_NAMES,['nedka-admin','tsvetan-admin']));
test('password digests roundtrip and reject incorrect password',async()=>{
 const d=await passwordDigest('ExamplePassword123!');
 assert.equal(await passwordMatches('ExamplePassword123!',d.salt,d.hash),true);
 assert.equal(await passwordMatches('WrongPassword456!',d.salt,d.hash),false);
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

test('accepts ten or more characters meeting the composition policy',()=>{
  assert.equal(validTestPassword('Abcdef123!'),true);
  assert.equal(validTestPassword('Zyxxxy222+'),true);
});
test('rejects missing uppercase, digits, letters or symbol',()=>{
  for (const password of ['abcdef123!','Abcdef12!','Abcde123!','Abcdef1234','Abcdef123 ','Abcdef12!']) {
    assert.equal(validTestPassword(password),false,password);
  }
});
test('rejects whitespace and overly long passwords',()=>{
  assert.equal(validTestPassword('Abcdef123! '),false);
  assert.equal(validTestPassword('Abcdef123!'+'x'.repeat(1100)),false);
});
