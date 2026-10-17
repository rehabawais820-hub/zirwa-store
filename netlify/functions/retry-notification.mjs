// POST /api/retry-notification — owner only. Re-sends the email for one order (or all failed/pending ones).
import { json, originAllowed, readJsonBody, bearerToken } from '../lib/http.mjs';
import { getUser, isAdminUser, select } from '../lib/supabase.mjs';
import { notifyOwner } from '../lib/notify.mjs';

const toPayload = (o) => ({
  order_id: o.id, order_number: o.order_number, subtotal_pkr: o.subtotal_pkr, discount_pkr: o.discount_pkr,
  shipping_pkr: o.shipping_pkr, total_pkr: o.total_pkr, payment_method: o.payment_method, payment_status: o.payment_status,
  items: (o.order_items || []).map((i) => ({ name: i.product_name, size: i.size, color: i.color, quantity: i.quantity, line_total_pkr: i.line_total_pkr })),
});

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, { allow: 'POST' });
  if (!originAllowed(req)) return json(403, { error: 'forbidden' });

  const token = bearerToken(req);
  if (!token) return json(401, { error: 'unauthorized' });
  let user;
  try { user = await getUser(token); } catch { return json(500, { error: 'server_error' }); }
  if (!user) return json(401, { error: 'unauthorized' });
  let admin = false;
  try { admin = await isAdminUser(user.id); } catch { return json(500, { error: 'server_error' }); }
  if (!admin) return json(403, { error: 'forbidden' });   // logged in, but not the owner

  const parsed = await readJsonBody(req, 2000);
  if (parsed.error) return json(400, { error: parsed.error });
  const id = parsed.value?.order_id;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let orders;
  try {
    orders = id
      ? (uuid.test(String(id)) ? await select(`orders?id=eq.${id}&select=*,order_items(*)`) : [])
      : await select('orders?notification_status=in.(failed,pending)&order=created_at.asc&limit=20&select=*,order_items(*)');
  } catch { return json(500, { error: 'server_error' }); }
  if (!orders.length) return json(404, { error: 'not_found' });

  const results = [];
  for (const o of orders) {
    const r = await notifyOwner(toPayload(o), o.notification_attempts || 0);
    results.push({ order_number: o.order_number, sent: r.sent, error: r.error || null });
  }
  return json(200, { results });
};

export const config = { path: '/api/retry-notification' };
