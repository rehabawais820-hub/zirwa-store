/* Zirwa storefront <-> backend connector. Include AFTER config.js:
 *   <script src="js/config.js"></script>
 *   <script src="js/zirwa-api.js"></script>
 * Only PUBLIC values are used here (anon key). No secrets, no prices are ever sent for orders. */
(function () {
  'use strict';
  var C = window.ZIRWA_CONFIG || {};
  var REST = (C.SUPABASE_URL || '').replace(/\/+$/, '') + '/rest/v1/';
  var HEAD = { apikey: C.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + C.SUPABASE_ANON_KEY };
  var KEY_STORE = 'zirwa_checkout_key', LAST_ORDER = 'zirwa_last_order';
  var inFlight = false;

  function uuid() { return (crypto.randomUUID && crypto.randomUUID()) || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = crypto.getRandomValues(new Uint8Array(1))[0] & 15; return (c === 'x' ? r : (r & 3) | 8).toString(16); }); }
  function get(path) { return fetch(REST + path, { headers: HEAD }).then(function (r) { if (!r.ok) throw new Error('load_failed'); return r.json(); }); }

  function shape(p) {
    var final = Math.round(p.price_pkr * (100 - p.discount_percent) / 100);
    return { id: p.id, slug: p.slug, name: p.name, description: p.description, category: p.category_slug,
      price: final, originalPrice: p.discount_percent ? p.price_pkr : null, discountPercent: p.discount_percent,
      sizes: p.sizes, colors: p.colors, stock: p.stock, inStock: p.stock > 0, images: p.images, image: p.images[0] || '' };
  }

  window.ZirwaAPI = {
    /** Active products, in the shape the storefront renders. Display prices only: the server recomputes at checkout. */
    fetchProducts: function () { return get('products?select=*&is_active=eq.true&order=created_at.asc').then(function (a) { return a.map(shape); }); },
    fetchSettings: function () { return get('settings?select=key,value').then(function (rows) { var o = {}; rows.forEach(function (r) { o[r.key] = Number(r.value); }); return { freeShippingThreshold: o.free_shipping_threshold, shippingFee: o.shipping_fee }; }); },

    /** Call when the checkout form opens. The same key is reused for retries/double-clicks, so one attempt = one order. */
    startCheckoutAttempt: function () { var k = uuid(); sessionStorage.setItem(KEY_STORE, k); return k; },

    /** cart: [{id|product_id, quantity, size, color}]   customer: {name, phone, address, city, notes}
     *  Resolves with the saved order (order_number, server-calculated totals). Rejects with {message, fields}. */
    placeOrder: function (cart, customer, honeypotValue) {
      if (inFlight) return Promise.reject({ message: 'Your order is already being placed. Please wait.' });
      var key = sessionStorage.getItem(KEY_STORE) || this.startCheckoutAttempt();
      inFlight = true;
      var body = {
        idempotency_key: key, website: honeypotValue || '', customer: customer,
        items: cart.map(function (i) { return { product_id: i.product_id || i.id, quantity: Number(i.quantity), size: i.size || '', color: i.color || '' }; })
      };
      return fetch('/api/create-order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw { status: r.status, message: j.message || 'Could not place your order. Please try again.', fields: j.fields || null }; return j; }); })
        .then(function (order) { sessionStorage.removeItem(KEY_STORE); sessionStorage.setItem(LAST_ORDER, JSON.stringify(order)); return order; })
        .catch(function (e) { if (e && e.message) throw e; throw { message: 'Network problem. Please check your connection and try again.' }; })
        .finally(function () { inFlight = false; });
    },

    lastOrder: function () { try { return JSON.parse(sessionStorage.getItem(LAST_ORDER)); } catch (e) { return null; } },

    /** Optional WhatsApp message, built from the SAVED order so it always matches what the server recorded. */
    whatsappUrl: function (order, customer) {
      var lines = ['*New order ' + order.order_number + '*'].concat(order.items.map(function (i) { return '- ' + i.name + (i.size ? ' / ' + i.size : '') + (i.color ? ' / ' + i.color : '') + ' x ' + i.quantity; }));
      lines.push('Total: PKR ' + Number(order.total_pkr).toLocaleString('en-PK') + ' (Cash on Delivery)');
      if (customer && customer.name) lines.push('Name: ' + customer.name);
      return 'https://wa.me/' + (C.WHATSAPP_NUMBER || '') + '?text=' + encodeURIComponent(lines.join('\n'));
    }
  };
})();
