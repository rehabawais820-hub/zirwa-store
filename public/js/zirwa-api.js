/* Zirwa storefront <-> backend connector. Loaded after config.js and before script.js.
 * Only PUBLIC values are used here (the anon key). No secrets, and no prices are ever sent when ordering:
 * the server looks prices up itself. */
(function (root) {
  'use strict';
  var C = root.ZIRWA_CONFIG || {};
  var BASE = String(C.SUPABASE_URL || '').replace(/\/+$/, '');
  var REST = BASE + '/rest/v1/';
  var HEAD = { apikey: C.SUPABASE_ANON_KEY, Authorization: 'Bearer ' + C.SUPABASE_ANON_KEY };
  var KEY_STORE = 'zirwa_checkout_key', LAST_ORDER = 'zirwa_last_order';
  var inFlight = false;

  var TYPE_BY_CAT = { dresses: 'dress', coords: 'coord', tops: 'top', bottoms: 'bottom', abayas: 'abaya', unisex: 'unisex' };
  var COLOR_KEYS = ['blush', 'rose', 'mocha', 'sage', 'sky', 'charcoal', 'ivory', 'wine', 'emerald', 'sand'];

  function uuid() {
    if (root.crypto && root.crypto.randomUUID) return root.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.floor(Math.random() * 16); return (c === 'x' ? r : (r & 3) | 8).toString(16);
    });
  }
  function get(path) {
    return fetch(REST + path, { headers: HEAD }).then(function (r) { if (!r.ok) throw new Error('load_failed'); return r.json(); });
  }
  function ss(method, k, v) { try { return method === 'get' ? root.sessionStorage.getItem(k) : method === 'set' ? root.sessionStorage.setItem(k, v) : root.sessionStorage.removeItem(k); } catch (e) { return null; } }

  function safeImage(u) { return typeof u === 'string' && u.length < 600 && /^https:\/\/[^\s"'<>\\]+$/.test(u); }

  /** Database row -> the object shape the storefront already renders. */
  function shape(p, index) {
    var sale = p.sale_price_pkr != null && p.sale_price_pkr < p.price_pkr;
    return {
      id: p.id, slug: p.slug, legacyId: p.legacy_id || null, name: p.name, desc: p.description || '',
      cat: p.category_slug || '', type: TYPE_BY_CAT[p.category_slug] || 'top',
      price: sale ? p.sale_price_pkr : p.price_pkr, was: sale ? p.price_pkr : 0,
      colors: (p.colors || []).filter(function (c) { return COLOR_KEYS.indexOf(c) > -1; }),
      sizes: p.sizes || [], stock: p.stock, images: (p.images || []).filter(safeImage),
      isNew: !!p.is_new, best: !!p.is_bestseller, seed: index + 1
    };
  }

  /** Re-checks a saved cart against the live catalogue: upgrades old ids (z001 -> uuid), removes
   *  items that are gone/sold out/no longer offered in that size or colour, and limits quantities. */
  function reconcileCart(cart, products) {
    var byId = {}, byLegacy = {}, notices = [], out = [];
    products.forEach(function (p) { byId[p.id] = p; if (p.legacyId) byLegacy[p.legacyId] = p; });
    (Array.isArray(cart) ? cart : []).forEach(function (l) {
      var p = l && (byId[l.id] || byLegacy[l.id]);
      if (!p) { notices.push('An item in your cart is no longer available and was removed.'); return; }
      if (p.stock <= 0) { notices.push(p.name + ' is sold out and was removed from your cart.'); return; }
      if ((p.sizes.length && p.sizes.indexOf(l.size) === -1) || (p.colors.length && p.colors.indexOf(l.color) === -1)) {
        notices.push(p.name + ' changed and was removed from your cart. Please add it again.'); return;
      }
      var qty = Math.max(1, Math.min(10, p.stock, parseInt(l.qty, 10) || 1));
      if (qty < l.qty) notices.push('Only ' + qty + ' of ' + p.name + ' available. Quantity updated.');
      var same = out.filter(function (x) { return x.id === p.id && x.size === l.size && x.color === l.color; })[0];
      if (same) same.qty = Math.min(10, p.stock, same.qty + qty); else out.push({ id: p.id, size: l.size, color: l.color, qty: qty });
    });
    return { cart: out, notices: notices.filter(function (n, i, a) { return a.indexOf(n) === i; }) };
  }
  function reconcileWish(wish, products) {
    var ids = {}, legacy = {}; products.forEach(function (p) { ids[p.id] = 1; if (p.legacyId) legacy[p.legacyId] = p.id; });
    var out = []; (Array.isArray(wish) ? wish : []).forEach(function (w) { var id = ids[w] ? w : legacy[w]; if (id && out.indexOf(id) === -1) out.push(id); });
    return out;
  }
  /** Display totals only. The server recalculates everything when the order is placed. */
  function totals(cart, products, settings) {
    var byId = {}; products.forEach(function (p) { byId[p.id] = p; });
    var sub = cart.reduce(function (a, l) { var p = byId[l.id]; return a + (p ? p.price * l.qty : 0); }, 0);
    var ship = sub === 0 || sub >= settings.freeShipFrom ? 0 : settings.shipFee;
    return { sub: sub, ship: ship, total: sub + ship };
  }

  function signature(items, customer) {
    return JSON.stringify([items.map(function (i) { return [i.product_id, i.quantity, i.size, i.color]; }).sort(),
      customer.name, customer.phone, customer.address, customer.city, customer.notes]);
  }

  var api = {
    isConfigured: function () { return !!BASE && BASE.indexOf('YOUR-PROJECT') === -1 && !!C.SUPABASE_ANON_KEY && C.SUPABASE_ANON_KEY.indexOf('YOUR-') === -1; },
    fetchProducts: function () {
      return get('products?select=*&is_active=eq.true&order=created_at.asc,slug.asc').then(function (rows) { return rows.map(shape); });
    },
    fetchSettings: function () {
      return get('settings?select=key,value').then(function (rows) {
        var o = {}; rows.forEach(function (r) { o[r.key] = Number(r.value); });
        if (!(o.free_shipping_threshold >= 0) || !(o.shipping_fee >= 0)) throw new Error('bad_settings');
        return { freeShipFrom: o.free_shipping_threshold, shipFee: o.shipping_fee };
      });
    },
    shape: shape, reconcileCart: reconcileCart, reconcileWish: reconcileWish, totals: totals, safeImage: safeImage,

    /** cart: [{id, qty, size, color}]  customer: {name, phone, address, city, notes}
     *  One checkout attempt = one order: the same key is reused for retries/double-clicks of the SAME
     *  cart + details, and a new key is made when either changes. Rejects with {status, message, fields}. */
    placeOrder: function (cart, customer, honeypot) {
      if (inFlight) return Promise.reject({ message: 'Your order is already being placed. Please wait.' });
      var items = cart.map(function (l) { return { product_id: l.id, quantity: Number(l.qty), size: l.size || '', color: l.color || '' }; });
      var cust = { name: customer.name, phone: customer.phone, address: customer.address, city: customer.city, notes: customer.notes || '' };
      var sig = signature(items, cust), saved = null;
      try { saved = JSON.parse(ss('get', KEY_STORE)); } catch (e) { saved = null; }
      if (!saved || saved.sig !== sig) { saved = { key: uuid(), sig: sig }; ss('set', KEY_STORE, JSON.stringify(saved)); }
      inFlight = true;
      var body = { idempotency_key: saved.key, website: honeypot || '', customer: cust, items: items };
      return fetch('/api/create-order', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (!r.ok) throw { status: r.status, message: j.message || 'Could not place your order. Please try again.', fields: j.fields || null };
            return j;
          });
        })
        .then(function (order) { ss('remove', KEY_STORE); ss('set', LAST_ORDER, JSON.stringify(order)); return order; })
        .catch(function (e) { if (e && e.message) throw e; throw { message: 'Network problem. Please check your connection and try again.' }; })
        .then(function (o) { inFlight = false; return o; }, function (e) { inFlight = false; throw e; });
    },
    lastOrder: function () { try { return JSON.parse(ss('get', LAST_ORDER)); } catch (e) { return null; } },

    /** Text for the optional WhatsApp message, built from the SAVED order so it always matches the server's record. */
    orderMessage: function (order, colorName) {
      var lines = ['Assalam o Alaikum! New order ' + order.order_number, ''].concat(order.items.map(function (i, n) {
        var v = [i.size ? 'Size ' + i.size : '', i.color ? (colorName ? colorName(i.color) : i.color) : ''].filter(Boolean).join(', ');
        return (n + 1) + '. ' + i.name + (v ? ' (' + v + ')' : '') + ' x' + i.quantity + ' = PKR ' + Number(i.line_total_pkr).toLocaleString('en-PK');
      }));
      lines.push('', 'Total: PKR ' + Number(order.total_pkr).toLocaleString('en-PK') + ' (Cash on Delivery)');
      return lines.join('\n');
    }
  };
  root.ZirwaAPI = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
