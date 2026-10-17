// Small helpers shared by the Netlify functions. Zero dependencies.
import { createHash } from 'node:crypto';

export function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}

/** Browser requests from other websites are refused. Requests with no Origin header (e.g. curl) are
 *  still subject to every other check, so this is only one layer of defence. */
export function originAllowed(req) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const allowed = new Set();
  try { allowed.add(new URL(req.url).origin); } catch { /* ignore */ }
  if (process.env.SITE_URL) { try { allowed.add(new URL(process.env.SITE_URL).origin); } catch { /* ignore */ } }
  return allowed.has(origin);
}

export async function readJsonBody(req, maxBytes = 20000) {
  const text = await req.text();
  if (text.length > maxBytes) return { error: 'too_large' };
  try { return { value: JSON.parse(text) }; } catch { return { error: 'bad_json' }; }
}

export function clientHash(ip) {
  const salt = process.env.IP_HASH_SALT || '';
  return createHash('sha256').update(`${salt}|${ip || 'unknown'}`).digest('hex');
}

export function bearerToken(req) {
  const h = req.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : null;
}
