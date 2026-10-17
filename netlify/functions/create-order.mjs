// POST /api/create-order  — public endpoint used by the storefront checkout.
import { json, originAllowed, readJsonBody, clientHash } from '../lib/http.mjs';
import { validateOrder } from '../lib/validate.mjs';
import { rpc } from '../lib/supabase.mjs';
import { notifyOwner } from '../lib/notify.mjs';

const ERRORS = {
  rate_limited:        [429, 'Too many orders from your connection. Please wait a few minutes or contact us on WhatsApp.'],
  product_unavailable: [409, 'One of the items in your cart is no longer available. Please review your cart.'],
  out_of_stock:        [409, 'Sorry, one of the items is out of stock in the quantity you chose. Please review your cart.'],
  invalid_variant:     [422, 'The chosen size or colour is not available for one of the items.'],
  invalid_items:       [422, 'Your cart contains an invalid item.'],
  invalid_customer:    [422, 'Please check your name, phone number and address.'],
};

export default async (req, context) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' }, { allow: 'POST' });
  if (!originAllowed(req)) return json(403, { error: 'forbidden' });

  const parsed = await readJsonBody(req);
  if (parsed.error) return json(parsed.error === 'too_large' ? 413 : 400, { error: parsed.error });

  // Honeypot: real customers never fill this hidden field.
  if (parsed.value && typeof parsed.value === 'object' && String(parsed.value.website ?? '').length) {
    return json(400, { error: 'rejected' });
  }

  const v = validateOrder(parsed.value);
  if (!v.ok) return json(422, { error: 'validation', fields: v.errors });
  const o = v.value;

  const ip = context?.ip || req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0];

  let order;
  try {
    // Only ids / quantities / variants are sent. Prices are looked up inside the database.
    order = await rpc('place_order', {
      p_idempotency_key: o.idempotency_key, p_customer_name: o.name, p_phone: o.phone, p_address: o.address,
      p_city: o.city, p_notes: o.notes, p_items: o.items, p_client_hash: clientHash(ip),
    });
  } catch (err) {
    const known = ERRORS[String(err.message || '').trim()];
    if (known) return json(known[0], { error: err.message, message: known[1] });
    console.error('place_order failed', err.message);
    return json(500, { error: 'server_error', message: 'Something went wrong. Your order was not placed. Please try again or contact us on WhatsApp.' });
  }

  if (!order.duplicate) await notifyOwner(order);   // failure is recorded on the order and can be retried

  return json(order.duplicate ? 200 : 201, {
    order_number: order.order_number,
    subtotal_pkr: order.subtotal_pkr, discount_pkr: order.discount_pkr,
    shipping_pkr: order.shipping_pkr, total_pkr: order.total_pkr,
    payment_method: order.payment_method, payment_status: order.payment_status,
    items: order.items, duplicate: order.duplicate,
  });
};

export const config = { path: '/api/create-order' };
