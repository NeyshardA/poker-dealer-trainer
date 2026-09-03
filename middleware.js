import { next } from '@vercel/functions';

const COOKIE_NAME = 'pdt_class_access';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SESSION_PAYLOAD = 'poker101class:v1:class-beta';
const encoder = new TextEncoder();

export const config = {
  matcher: '/:path*',
};

function env(name) {
  return String(process.env[name] || '').trim();
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  }
  return out;
}

function toBase64Url(bytes) {
  let binary = '';
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function signSession(secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(SESSION_PAYLOAD));
  return toBase64Url(signature);
}

async function secureEqual(a, b) {
  const [da, db] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(String(a))),
    crypto.subtle.digest('SHA-256', encoder.encode(String(b))),
  ]);
  const aa = new Uint8Array(da);
  const bb = new Uint8Array(db);
  let diff = aa.length ^ bb.length;
  for (let i = 0; i < Math.min(aa.length, bb.length); i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

function securityHeaders(extra = {}) {
  return {
    'Cache-Control': 'no-store, private',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    ...extra,
  };
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: securityHeaders({
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    }),
  });
}

function accessCookie(value, maxAge = SESSION_TTL_SECONDS) {
  return `${COOKIE_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

async function isAuthorized(request) {
  const secret = env('SESSION_SECRET');
  if (!secret) return false;
  const cookie = parseCookies(request.headers.get('cookie'))[COOKIE_NAME];
  if (!cookie) return false;
  const expected = await signSession(secret);
  return secureEqual(cookie, expected);
}

async function handleLogin(request) {
  const requiredCode = env('CLASS_ACCESS_CODE');
  const secret = env('SESSION_SECRET');
  if (!requiredCode || !secret) {
    return json({ ok: false, error: 'Private access is not configured yet.' }, 503);
  }

  let submitted = '';
  try {
    const data = await request.json();
    submitted = String(data?.code || '').trim();
  } catch {
    return json({ ok: false, error: 'Invalid request.' }, 400);
  }

  if (!submitted || !(await secureEqual(submitted, requiredCode))) {
    return json({ ok: false, error: 'Incorrect passcode.' }, 401);
  }

  const token = await signSession(secret);
  return json(
    { ok: true },
    200,
    { 'Set-Cookie': accessCookie(token) }
  );
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Private-access API endpoints are handled directly by middleware.
  if (pathname === '/_access-login' && request.method === 'POST') {
    return handleLogin(request);
  }

  if (pathname === '/_access-logout' && request.method === 'POST') {
    return json(
      { ok: true },
      200,
      { 'Set-Cookie': accessCookie('', 0) }
    );
  }

  const authorized = await isAuthorized(request);

  // The login screen itself must remain reachable before authentication.
  if (pathname === '/access.html') {
    if (authorized) return Response.redirect(new URL('/', request.url), 302);
    return next({ headers: securityHeaders() });
  }

  // Do not expose internal access endpoints through GET requests.
  if (pathname.startsWith('/_access-')) {
    return new Response('Not found', { status: 404, headers: securityHeaders() });
  }

  // Protect EVERYTHING else, including /, /index.html and direct static paths.
  if (!authorized) {
    const loginUrl = new URL('/access.html', request.url);
    return Response.redirect(loginUrl, 302);
  }

  return next({ headers: securityHeaders() });
}
