// Order notification email via Resend (https://resend.com). Server-side only.
// The email deliberately contains NO customer name, phone or address.
import { patch } from './supabase.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COLOR_NAMES = { blush: 'Blush', rose: 'Dusty Rose', mocha: 'Mocha', sage: 'Sage', sky: 'Sky Blue', charcoal: 'Charcoal', ivory: 'Ivory', wine: 'Wine', emerald: 'Emerald', sand: 'Sand' };
const colorName = (k) => COLOR_NAMES[k] || k;
const pkr = (n) => `PKR ${Number(n).toLocaleString('en-PK')}`;

export function buildEmail(order) {
  const base = (process.env.SITE_URL || '').replace(/\/+$/, '');
  const link = `${base}/admin/#/orders/${order.order_id}`;
  const lines = (order.items || []).map((i) =>
    `${i.name}${i.size ? ` / ${i.size}` : ''}${i.color ? ` / ${colorName(i.color)}` : ''} x ${i.quantity} — ${pkr(i.line_total_pkr)}`);

  const paymentLabel = order.payment_method === 'BANK_TRANSFER' ? 'Bank Transfer (awaiting verification)' : 'Cash on Delivery';
  const text = [
    `New order ${order.order_number}`, '',
    ...lines, '',
    `Subtotal: ${pkr(order.subtotal_pkr)}`,
    `Discount: -${pkr(order.discount_pkr)}`,
    `Shipping: ${pkr(order.shipping_pkr)}`,
    `Total: ${pkr(order.total_pkr)}`,
    `Payment: ${paymentLabel} (${order.payment_status})`,
    ...(order.payment_method === 'BANK_TRANSFER' ? ['Please verify bank transfer manually before marking this order paid.'] : []), '',
    `Open in admin dashboard (login required): ${link}`,
  ].join('\n');

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
<h2>New order ${esc(order.order_number)}</h2>
<ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
<p>Subtotal: ${esc(pkr(order.subtotal_pkr))}<br>Discount: -${esc(pkr(order.discount_pkr))}<br>Shipping: ${esc(pkr(order.shipping_pkr))}<br>
<strong>Total: ${esc(pkr(order.total_pkr))}</strong><br>Payment: ${esc(paymentLabel)} (${esc(order.payment_status)})</p>
<p><a href="${esc(link)}">Open in admin dashboard</a> (login required)</p></div>`;

  return { subject: `New order ${order.order_number} — ${pkr(order.total_pkr)} (${paymentLabel})`, text, html };
}

async function sendViaResend(order) {
  const key = process.env.RESEND_API_KEY, to = process.env.OWNER_EMAIL, from = process.env.EMAIL_FROM;
  if (!key || !to || !from) throw new Error('email_not_configured');
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: ctrl.signal,
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [to], ...buildEmail(order) }),
    });
    if (!res.ok) throw new Error(`email_provider_${res.status}`);
  } finally { clearTimeout(timer); }
}

/** Sends the email and records the outcome on the order. Never throws: a failed email must not undo an order. */
export async function notifyOwner(order, attemptsSoFar = 0) {
  const attempts = attemptsSoFar + 1;
  try {
    await sendViaResend(order);
    await patch(`orders?id=eq.${order.order_id}`, {
      notification_status: 'sent', notification_attempts: attempts, notification_error: null, notified_at: new Date().toISOString() });
    return { sent: true };
  } catch (err) {
    const msg = String(err?.message || 'unknown').slice(0, 200);
    try { await patch(`orders?id=eq.${order.order_id}`, { notification_status: 'failed', notification_attempts: attempts, notification_error: msg }); }
    catch { /* the order is saved either way */ }
    console.error('order notification failed', order.order_number, msg);
    return { sent: false, error: msg };
  }
}
