// Minimal Supabase REST client using fetch (no npm packages needed).
// SERVER ONLY: uses the service-role key, which must never reach the browser.
function cfg() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw new Error('server_not_configured');
  return { url, key };
}
const hdr = (key, extra = {}) => ({ apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json', ...extra });

export async function rpc(fn, args) {
  const { url, key } = cfg();
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: hdr(key), body: JSON.stringify(args) });
  const data = await res.json().catch(() => null);
  if (!res.ok) { const e = new Error(data?.message || 'rpc_failed'); e.status = res.status; e.code = data?.code; throw e; }
  return data;
}

export async function select(path) {
  const { url, key } = cfg();
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: hdr(key) });
  if (!res.ok) throw new Error(`select_failed_${res.status}`);
  return res.json();
}

export async function patch(path, body) {
  const { url, key } = cfg();
  const res = await fetch(`${url}/rest/v1/${path}`, { method: 'PATCH', headers: hdr(key, { prefer: 'return=minimal' }), body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`patch_failed_${res.status}`);
}

/** Returns the Supabase user for a browser access token, or null. */
export async function getUser(accessToken) {
  const { url, key } = cfg();
  const res = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return null;
  const u = await res.json().catch(() => null);
  return u?.id ? u : null;
}

export async function isAdminUser(userId) {
  const rows = await select(`admins?user_id=eq.${encodeURIComponent(userId)}&select=user_id`);
  return Array.isArray(rows) && rows.length === 1;
}
