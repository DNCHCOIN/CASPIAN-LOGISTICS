import { randomBytes, scrypt as rawScrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(rawScrypt);
export const ACCOUNT_NAMES = Object.freeze(['nedka-admin','tsvetan-admin']);
export const COOKIE = 'caspian_test_session';
const HASH_BYTES = 64;
const SESSION_SECONDS = 60 * 60 * 8;

export function validTestPassword(password) {
  if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > 1024) return false;
  const letters = password.match(/[A-Za-z]/g) ?? [];
  const numbers = password.match(/[0-9]/g) ?? [];
  const specials = password.match(/[^A-Za-z0-9\s]/gu) ?? [];
  return [...password].length >= 10
    && letters.length >= 6
    && /[A-Z]/.test(password)
    && numbers.length >= 3
    && specials.length >= 1
    && !/\s/u.test(password);
}
export async function passwordDigest(password, salt = randomBytes(16).toString('hex')) {
  if (!validTestPassword(password))
    throw new Error('Test password requires 10+ characters, 6+ letters (1 uppercase), 3+ digits, and 1+ special symbol, with no whitespace');
  const hash = await scrypt(password,salt,HASH_BYTES);
  return { salt, hash:hash.toString('hex') };
}
export async function passwordMatches(password,salt,expected) {
  if (typeof password !== 'string' || typeof salt !== 'string' || typeof expected !== 'string'
      || !/^[0-9a-f]{32}$/.test(salt) || !/^[0-9a-f]{128}$/.test(expected)
      || Buffer.byteLength(password,'utf8') > 1024) return false;
  const actual = await scrypt(password,salt,HASH_BYTES);
  return timingSafeEqual(actual,Buffer.from(expected,'hex'));
}
export function tokenHash(token) { return createHash('sha256').update(token).digest('hex'); }
export function parseSessionCookie(raw) {
  if (typeof raw !== 'string') return null;
  const piece=raw.split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='));
  const token=piece?.slice(COOKIE.length+1);
  return typeof token === 'string' && /^[0-9a-f]{64}$/.test(token) ? token : null;
}
export function sessionCookie(token, secure=false, maxAge=SESSION_SECONDS) {
  return COOKIE+'='+token+'; Path=/api/v1/test-auth; HttpOnly; SameSite=Strict; Max-Age='+maxAge+(secure?'; Secure':'');
}
export function loginAllowed() { return process.env.ENABLE_TEST_AUTH === 'true' && process.env.NODE_ENV !== 'production'; }
export function newSessionToken() { return randomBytes(32).toString('hex'); }
export const expiry = () => new Date(Date.now()+SESSION_SECONDS*1000);
