// Order input validation. Only whitelisted fields leave this file, so anything a
// customer adds to the request (price, total, status, payment...) is dropped.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const clean = (s) => String(s ?? '').replace(CONTROL, '').replace(/[ \t]+/g, ' ').trim();

/** Accepts 03XXXXXXXXX, 3XXXXXXXXX, 923XXXXXXXXX, +923XXXXXXXXX, 00923XXXXXXXXX (spaces/dashes allowed).
 *  Returns +923XXXXXXXXX or null. Mobile numbers only. */
export function normalizePkPhone(input) {
  let d = String(input ?? '').replace(/[\s\-()]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('92')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  return /^3\d{9}$/.test(d) ? `+92${d}` : null;
}

export function validateOrder(body) {
  const errors = {};
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, errors: { body: 'Invalid request' } };

  const key = String(body.idempotency_key ?? '');
  if (!UUID.test(key)) errors.idempotency_key = 'Missing checkout id. Please refresh the page and try again.';

  const c = body.customer && typeof body.customer === 'object' ? body.customer : {};
  const name = clean(c.name);
  const address = clean(c.address);
  const city = clean(c.city);
  const notes = clean(c.notes);
  const phone = normalizePkPhone(c.phone);

  if (name.length < 2 || name.length > 80) errors.name = 'Please enter your full name (2-80 characters).';
  if (!phone) errors.phone = 'Please enter a valid Pakistani mobile number, e.g. 0300 1234567.';
  if (address.length < 10 || address.length > 300) errors.address = 'Please enter your complete delivery address (10-300 characters).';
  if (city.length < 2 || city.length > 60) errors.city = 'Please enter your city.';
  if (notes.length > 300) errors.notes = 'Notes must be 300 characters or fewer.';

  const items = [];
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 30) {
    errors.items = 'Your cart is empty or too large.';
  } else {
    for (const it of body.items) {
      const pid = String(it?.product_id ?? '');
      const qty = it?.quantity;
      if (!UUID.test(pid) || !Number.isInteger(qty) || qty < 1 || qty > 10) { errors.items = 'One of the cart items is invalid.'; break; }
      items.push({
        product_id: pid.toLowerCase(),
        quantity: qty,
        size: clean(it.size).slice(0, 30),
        color: clean(it.color).slice(0, 40),
      });
    }
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { idempotency_key: key.toLowerCase(), name, phone, address, city, notes, items } };
}
