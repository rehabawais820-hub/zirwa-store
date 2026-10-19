/* Zirwa Clothing Store — script.js
   Shared header/footer, product catalogue (loaded from the database), cart, COD checkout, order confirmation.
   Products come from js/zirwa-api.js; orders are saved by the server (/api/create-order). */
(function () {
  'use strict';

  /* ---------- Store settings: edit these ---------- */
  var STORE = {
    name: 'Zirwa Clothing Store',
    phone: '+92 331 7756688',
    wa: '923317756688',
    address: 'Shop # 6, Market, 7 Lyallpur Commercial Rd, Factory Area, Faisalabad, 38000, Pakistan',
    freeShipFrom: 4000,
    shipFee: 250
  };
  var SOCIAL = { facebook: 'https://www.facebook.com/', instagram: 'https://www.instagram.com/', tiktok: 'https://www.tiktok.com/' };
  var MAPS_LINK = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Zirwa Clothing Store, Shop 6, Market, 7 Lyallpur Commercial Rd, Factory Area, Faisalabad');
  var MAPS_EMBED = 'https://maps.google.com/maps?q=' + encodeURIComponent('Shop 6 Market 7 Lyallpur Commercial Rd Factory Area Faisalabad 38000') + '&output=embed';
  // Add real customer reviews here: { name:'Name', text:'Review text', stars:5 }
  var REVIEWS = [];

  /* ---------- helpers ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var money = function (n) { return 'PKR ' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
  var load = function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } };
  var save = function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var waLink = function (text) { return 'https://wa.me/' + STORE.wa + '?text=' + encodeURIComponent(text); };

  function shade(h, a) {
    var n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    var f = function (v) { return Math.max(0, Math.min(255, Math.round(a < 0 ? v * (1 + a) : v + (255 - v) * a))); };
    return '#' + [f(r), f(g), f(b)].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
  }
  function lum(h) { var n = parseInt(h.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); }
  function accent(c) { return lum(c) > 150 ? shade(c, -0.3) : shade(c, 0.5); }

  /* ---------- colours ---------- */
  var COLORS = {
    blush:   { name: 'Blush',    hex: '#e9b6bb' },
    rose:    { name: 'Dusty Rose', hex: '#c78790' },
    mocha:   { name: 'Mocha',    hex: '#9a7664' },
    sage:    { name: 'Sage',     hex: '#8da58a' },
    sky:     { name: 'Sky Blue', hex: '#9db6d1' },
    charcoal:{ name: 'Charcoal', hex: '#2d2b30' },
    ivory:   { name: 'Ivory',    hex: '#f1e8df' },
    wine:    { name: 'Wine',     hex: '#7b2f3d' },
    emerald: { name: 'Emerald',  hex: '#1f5e4a' },
    sand:    { name: 'Sand',     hex: '#d6bda3' }
  };
  var COLOR_KEYS = Object.keys(COLORS);

  /* ---------- illustrated garment art (placeholder for photos) ---------- */
  var BGS = [['#fcf0f0', '#f2d6d3'], ['#f8ede7', '#ecd3c7'], ['#f4eef0', '#e5d3da'], ['#f9f1ea', '#eed9cc']];
  function art(type, c1, seed) {
    var c2 = accent(c1), d = shade(c1, -0.2), bg = BGS[(seed || 0) % BGS.length];
    var id = 'g' + Math.random().toString(36).slice(2, 8), b = '';
    if (type === 'dress') {
      b = '<path d="M112 92 L150 74 L188 92 L180 176 L228 342 Q150 364 72 342 L120 176 Z" fill="' + c1 + '"/>' +
        '<path d="M120 172 L180 172 L181 184 L119 184Z" fill="' + c2 + '"/>' +
        '<path d="M134 84 Q150 108 166 84" fill="none" stroke="' + c2 + '" stroke-width="3"/>' +
        '<path d="M88 334 Q150 354 212 334" fill="none" stroke="' + c2 + '" stroke-width="6"/>' +
        '<path d="M130 186 L108 336 M150 186 L150 346 M170 186 L192 336" stroke="' + d + '" stroke-width="2" opacity=".3"/>';
    } else if (type === 'coord') {
      b = '<path d="M104 88 L150 72 L196 88 L216 152 L190 162 L190 200 L110 200 L110 162 L84 152 Z" fill="' + c1 + '"/>' +
        '<path d="M110 188 L190 188 L190 200 L110 200Z" fill="' + c2 + '"/>' +
        '<path d="M136 80 Q150 100 164 80" fill="none" stroke="' + c2 + '" stroke-width="3"/>' +
        '<path d="M112 210 L188 210 L206 354 L162 354 L150 252 L138 354 L94 354 Z" fill="' + c1 + '"/>' +
        '<path d="M112 210 L188 210 L189 222 L111 222Z" fill="' + c2 + '"/>' +
        '<path d="M150 252 L150 224" stroke="' + d + '" stroke-width="2" opacity=".4"/>';
    } else if (type === 'top') {
      b = '<path d="M94 92 L150 72 L206 92 L246 176 L210 192 L204 304 L96 304 L90 192 L54 176 Z" fill="' + c1 + '"/>' +
        '<path d="M126 82 Q150 116 174 82" fill="none" stroke="' + c2 + '" stroke-width="4"/>' +
        '<path d="M96 292 L204 292 L204 304 L96 304Z" fill="' + c2 + '"/>' +
        '<path d="M54 176 L90 192 M246 176 L210 192" stroke="' + c2 + '" stroke-width="8"/>' +
        '<path d="M150 118 L150 292" stroke="' + d + '" stroke-width="2" opacity=".3"/>';
    } else if (type === 'bottom') {
      b = '<path d="M104 82 L196 82 L220 340 L164 340 L150 170 L136 340 L80 340 Z" fill="' + c1 + '"/>' +
        '<path d="M104 82 L196 82 L197 100 L103 100Z" fill="' + c2 + '"/>' +
        '<path d="M150 100 L150 170" stroke="' + d + '" stroke-width="2" opacity=".5"/>' +
        '<path d="M120 100 L106 330 M180 100 L194 330" stroke="' + d + '" stroke-width="2" opacity=".25"/>';
    } else if (type === 'abaya') {
      b = '<path d="M122 76 L150 64 L178 76 L196 126 L246 364 L54 364 L104 126 Z" fill="' + c1 + '"/>' +
        '<path d="M150 66 L150 364" stroke="' + c2 + '" stroke-width="5"/>' +
        '<path d="M104 126 L82 200 M196 126 L218 200" stroke="' + d + '" stroke-width="2" opacity=".35"/>' +
        '<path d="M60 352 L240 352" stroke="' + c2 + '" stroke-width="6"/>' +
        '<circle cx="140" cy="120" r="3" fill="' + c2 + '"/><circle cx="160" cy="120" r="3" fill="' + c2 + '"/>';
    } else {
      b = '<path d="M102 88 L150 70 L198 88 L228 164 L202 178 L200 296 L100 296 L98 178 L72 164 Z" fill="' + c1 + '"/>' +
        '<path d="M141 74 L150 112 L159 74" fill="none" stroke="' + c2 + '" stroke-width="3"/>' +
        '<path d="M150 112 L150 296" stroke="' + c2 + '" stroke-width="3"/>' +
        '<circle cx="150" cy="140" r="3.2" fill="' + c2 + '"/><circle cx="150" cy="176" r="3.2" fill="' + c2 + '"/><circle cx="150" cy="212" r="3.2" fill="' + c2 + '"/><circle cx="150" cy="248" r="3.2" fill="' + c2 + '"/>' +
        '<path d="M72 164 L98 178 M228 164 L202 178" stroke="' + c2 + '" stroke-width="7"/>';
    }
    return '<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Product illustration" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + bg[0] + '"/><stop offset="1" stop-color="' + bg[1] + '"/></linearGradient></defs>' +
      '<rect width="300" height="400" fill="url(#' + id + ')"/>' +
      '<ellipse cx="150" cy="380" rx="74" ry="6" fill="#000" opacity=".07"/>' +
      '<path d="M150 60 L150 52 Q150 38 161 38 Q172 38 172 48 M150 60 L98 92 M150 60 L202 92" fill="none" stroke="#9c8c90" stroke-width="2.4" stroke-linecap="round"/>' +
      b + '</svg>';
  }

  /* ---------- product catalogue (loaded from the database, see js/zirwa-api.js) ---------- */
  var CATS = { dresses: 'Dresses', coords: 'Co-ords', tops: 'Tops', bottoms: 'Bottoms', abayas: 'Abayas', unisex: 'Unisex' };
  var PRODUCTS = [];
  var SETTINGS = { freeShipFrom: STORE.freeShipFrom, shipFee: STORE.shipFee };
  var cartNotices = [];
  var byId = function (id) { return PRODUCTS.filter(function (p) { return p.id === id; })[0]; };
  var byRef = function (ref) { return PRODUCTS.filter(function (p) { return p.id === ref || p.slug === ref || p.legacyId === ref; })[0]; };
  var href = function (p) { return 'product.html?id=' + encodeURIComponent(p.slug); };
  var catName = function (c) { return CATS[c] || c; };
  var colorName = function (k) { return COLORS[k] ? COLORS[k].name : (k || ''); };
  var hexOf = function (k) { return (COLORS[k] || COLORS.blush).hex; };
  var hasPhoto = function (p) { return p.images && p.images.length > 0; };
  var photo = function (p, i, alt) { return '<img src="' + esc(p.images[i || 0]) + '" alt="' + esc(alt == null ? p.name : alt) + '" loading="lazy" decoding="async">'; };
  // Uploaded photo when the owner added one, otherwise the illustrated placeholder (original look).
  var artOf = function (p, colorKey) { return hasPhoto(p) ? photo(p, 0) : art(p.type, hexOf(colorKey || p.colors[0]), p.seed); };
  var variantText = function (size, color) { return [size ? 'Size ' + size : '', color ? colorName(color) : ''].filter(Boolean).join(', '); };
  // Decorative pictures on home/about: [garment, colour, seed] (same illustrations as before).
  var DECOR = { 1: ['dress', 'mocha', 2], 3: ['dress', 'sage', 4], 6: ['dress', 'ivory', 7], 12: ['coord', 'wine', 13], 22: ['top', 'sand', 23] };

  /* ---------- cart ---------- */
  var cart = load('zirwa_cart', []);
  var wish = load('zirwa_wish', []);
  function saveCart() { save('zirwa_cart', cart); updateBadge(); }
  function updateBadge() {
    var n = cart.reduce(function (a, l) { return a + l.qty; }, 0), b = $('#cart-badge');
    if (b) { b.textContent = n || ''; b.dataset.n = n; }
  }
  function addToCart(id, size, color, qty) {
    var p = byId(id), max = p ? Math.max(1, Math.min(10, p.stock)) : 10;
    var found = cart.filter(function (l) { return l.id === id && l.size === size && l.color === color; })[0];
    if (found) found.qty = Math.min(max, found.qty + qty); else cart.push({ id: id, size: size, color: color, qty: Math.min(max, qty) });
    saveCart();
  }
  function totals() { return window.ZirwaAPI.totals(cart, PRODUCTS, SETTINGS); }
  var toastT;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2400);
  }

  /* ---------- shared shell ---------- */
  var ICON = {
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.600-7 10-7 10z"/></svg>',
    truck: '<svg viewBox="0 0 24 24"><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.500" r="1.800"/><circle cx="17" cy="17.500" r="1.800"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s7-6 7-12a7 7 0 10-14 0c0 6 7 12 7 12z"/><circle cx="12" cy="9" r="2.500"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M5 4h4l2 5-2.500 1.500a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z"/></svg>',
    fb: '<svg viewBox="0 0 24 24"><path d="M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/></svg>',
    ig: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.800"/><circle cx="17" cy="7" r=".6"/></svg>',
    tk: '<svg viewBox="0 0 24 24"><path d="M14 4v10.500a3.500 3.500 0 11-3.500-3.500M14 4c.5 2.500 2 4 5 4"/></svg>',
    wa: '<svg viewBox="0 0 24 24"><path d="M3 21l1.600-4.800A9 9 0 1112 21a9 9 0 01-4.300-1.100L3 21z"/><path d="M9 8.500c0 3.500 3 6.500 6.500 6.500l1-1.500-2-1-1 .8c-1-.4-2-1.400-2.400-2.400l.8-1-1-2L9 8.500z"/></svg>'
  };
  var LOGO = '<svg viewBox="0 0 40 28" aria-hidden="true"><path d="M20 2c3.500 5 3.500 11 0 16-3.500-5-3.500-11 0-16z"/><path d="M7 8c6.500 0 11.500 4 13 10-6.500 0-11.500-4-13-10z"/><path d="M33 8c-6.500 0-11.500 4-13 10 6.500 0 11.500-4 13-10z"/><path d="M5 23q15 5 30 0" /></svg>';
  var logoHTML = '<a class="logo" href="index.html" aria-label="Zirwa Clothing Store — home">' + LOGO + '<span class="logo-text"><b>ZIRWA</b><small>CLOTHING STORE</small></span></a>';

  function shell() {
    var page = document.body.dataset.page || '';
    var cur = function (p) { return page === p ? ' aria-current="page"' : ''; };
    var header =
      '<a class="skip" href="#main">Skip to content</a>' +
      '<div class="announce"><span>Free shipping on orders above PKR 4,000</span><span>Open 24 hours. WhatsApp ' + STORE.phone + '</span></div>' +
      '<header class="header"><div class="wrap header-in">' + logoHTML +
      '<nav class="nav" id="nav" aria-label="Main">' +
      '<a href="index.html"' + cur('home') + '>Home</a><a href="shop.html"' + cur('shop') + '>Shop</a>' +
      '<a href="index.html#categories">Categories</a><a href="about.html"' + cur('about') + '>About</a><a href="contact.html"' + cur('contact') + '>Contact</a></nav>' +
      '<div class="icons">' +
      '<button class="icon-btn" id="search-btn" aria-label="Search" aria-expanded="false">' + ICON.search + '</button>' +
      '<button class="icon-btn" id="acct-btn" aria-label="Your details">' + ICON.user + '</button>' +
      '<a class="icon-btn" href="cart.html" aria-label="Cart">' + ICON.bag + '<span class="badge" id="cart-badge" data-n="0"></span></a>' +
      '<button class="icon-btn menu-btn" id="menu-btn" aria-label="Menu" aria-expanded="false">' + ICON.menu + '</button></div></div>' +
      '<div class="searchbar" id="searchbar"><div class="wrap"><form id="search-form" role="search"><input type="search" id="search-input" placeholder="Search dresses, co-ords, abayas" aria-label="Search products"><button class="btn btn-dark" type="submit">Search</button></form></div></div></header>';
    var news = page === 'cart' ? '' :
      '<section class="news"><div class="wrap news-in"><div><h2>Get offers and new arrivals on WhatsApp</h2><p>Send us your name and we will add you to our offers list.</p></div>' +
      '<form id="news-form"><input type="text" id="news-name" placeholder="Your name" aria-label="Your name" required><button class="btn" type="submit">Join on WhatsApp</button></form></div></section>';
    var footer =
      '<footer class="footer"><div class="wrap"><div class="footer-in">' +
      '<div>' + logoHTML + '<address>' + esc(STORE.address) + '</address><p style="margin-top:12px">Open 24 hours<br><a href="tel:+923317756688">' + STORE.phone + '</a></p></div>' +
      '<div><h3>Quick links</h3><ul><li><a href="index.html">Home</a></li><li><a href="shop.html">Shop</a></li><li><a href="about.html">About</a></li><li><a href="contact.html">Contact</a></li></ul></div>' +
      '<div><h3>Customer care</h3><ul><li><a href="policies.html#shipping">Shipping</a></li><li><a href="policies.html#returns">Returns and exchanges</a></li><li><a href="policies.html#privacy">Privacy policy</a></li><li><a href="policies.html#terms">Terms and conditions</a></li></ul></div>' +
      '<div><h3>Follow us</h3><div class="social"><a href="' + SOCIAL.facebook + '" target="_blank" rel="noopener" aria-label="Facebook">' + ICON.fb + '</a><a href="' + SOCIAL.instagram + '" target="_blank" rel="noopener" aria-label="Instagram">' + ICON.ig + '</a><a href="' + SOCIAL.tiktok + '" target="_blank" rel="noopener" aria-label="TikTok">' + ICON.tk + '</a></div>' +
      '<p style="margin-top:16px"><a href="' + MAPS_LINK + '" target="_blank" rel="noopener">View on Google Maps</a></p></div></div>' +
      '<div class="copy"><span>&copy; 2026 Zirwa Clothing Store. All rights reserved.</span><span>Your style, our passion.</span></div></div></footer>' +
      '<a class="wa-float" href="' + waLink('Assalam o Alaikum! I have a question about Zirwa Clothing Store.') + '" target="_blank" rel="noopener" aria-label="WhatsApp us">' + ICON.wa + '<span>WhatsApp us</span></a>' +
      '<div class="toast" id="toast" role="status" aria-live="polite"></div>' +
      '<dialog id="acct"><form method="dialog" id="acct-form"><h2>Your details</h2><p class="sub" style="margin-bottom:16px">Saved on this device only, to speed up checkout.</p>' +
      '<div class="field"><label for="a-name">Name</label><input id="a-name" autocomplete="name"></div><div class="field"><label for="a-phone">Phone</label><input id="a-phone" type="tel" autocomplete="tel"></div><div class="field"><label for="a-city">City</label><input id="a-city" autocomplete="address-level2"></div>' +
      '<div class="dlg-actions"><button class="btn btn-dark" value="save">Save details</button><button class="btn btn-light" value="cancel" formnovalidate>Close</button></div></form></dialog>' +
      '<dialog id="qa"><h2 id="qa-title"></h2><p class="price" id="qa-price"></p><div class="opt"><div class="opt-label">Size</div><div class="chips" id="qa-sizes"></div></div><div class="opt"><div class="opt-label">Colour <span id="qa-cname"></span></div><div class="swatches" id="qa-colors"></div></div>' +
      '<div class="dlg-actions"><button class="btn btn-dark" id="qa-add">Add to Cart</button><button class="btn btn-light" id="qa-close">Cancel</button></div></dialog>';
    document.body.insertAdjacentHTML('afterbegin', header);
    var main = $('#main');
    main.insertAdjacentHTML('afterend', news + footer);

    $('#menu-btn').addEventListener('click', function () { var o = $('#nav').classList.toggle('open'); this.setAttribute('aria-expanded', o); });
    $('#search-btn').addEventListener('click', function () { var o = $('#searchbar').classList.toggle('open'); this.setAttribute('aria-expanded', o); if (o) $('#search-input').focus(); });
    $('#search-form').addEventListener('submit', function (e) { e.preventDefault(); var q = $('#search-input').value.trim(); location.href = 'shop.html' + (q ? '?q=' + encodeURIComponent(q) : ''); });
    var nf = $('#news-form');
    if (nf) nf.addEventListener('submit', function (e) { e.preventDefault(); window.open(waLink('Assalam o Alaikum! Please add me to the Zirwa offers and new arrivals list. Name: ' + $('#news-name').value.trim()), '_blank', 'noopener'); });

    var acct = $('#acct');
    $('#acct-btn').addEventListener('click', function () {
      var u = load('zirwa_user', {}); $('#a-name').value = u.name || ''; $('#a-phone').value = u.phone || ''; $('#a-city').value = u.city || ''; acct.showModal();
    });
    acct.addEventListener('close', function () {
      if (acct.returnValue === 'save') { save('zirwa_user', { name: $('#a-name').value.trim(), phone: $('#a-phone').value.trim(), city: $('#a-city').value.trim() }); toast('Details saved'); }
    });
    updateBadge();
  }

  /* ---------- product card + quick add ---------- */
  function card(p) {
    var liked = wish.indexOf(p.id) > -1, out = p.stock <= 0;
    var dots = p.colors.map(function (c) { return '<span class="dot" title="' + COLORS[c].name + '" style="background:' + COLORS[c].hex + '"></span>'; }).join('');
    return '<article class="card"><div class="card-img-wrap" style="position:relative"><a class="card-img" href="' + href(p) + '" aria-label="' + esc(p.name) + '">' + artOf(p) +
      (out ? '<span class="tag out">Sold out</span>' : (p.isNew ? '<span class="tag">New</span>' : '')) + (p.was && !out ? '<span class="tag sale">Sale</span>' : '') + '</a>' +
      '<button class="wish" data-wish="' + p.id + '" aria-pressed="' + liked + '" aria-label="Save ' + esc(p.name) + '">' + ICON.heart + '</button></div>' +
      '<div class="card-body"><span class="card-cat">' + esc(catName(p.cat)) + '</span><a class="card-name" href="' + href(p) + '">' + esc(p.name) + '</a>' +
      '<div class="dots">' + dots + '</div>' +
      '<div class="price">' + money(p.price) + (p.was ? '<s>' + money(p.was) + '</s>' : '') + '</div>' +
      (out ? '<button class="btn btn-dark" disabled>Sold out</button>' : '<button class="btn btn-dark" data-add="' + p.id + '">Add to Cart</button>') + '</div></article>';
  }
  function bindCards(root) {
    $$('[data-wish]', root).forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.dataset.wish, i = wish.indexOf(id);
        if (i > -1) wish.splice(i, 1); else wish.push(id);
        save('zirwa_wish', wish); b.setAttribute('aria-pressed', i === -1);
        toast(i === -1 ? 'Saved to your wishlist' : 'Removed from wishlist');
      });
    });
    $$('[data-add]', root).forEach(function (b) { b.addEventListener('click', function () { quickAdd(b.dataset.add); }); });
  }
  function quickAdd(id) {
    var p = byId(id), dlg = $('#qa'), size = null, color = p ? (p.colors[0] || '') : '';
    if (!p || p.stock <= 0) return;
    $('#qa-title').textContent = p.name; $('#qa-price').textContent = money(p.price);
    $('#qa-sizes').parentNode.hidden = !p.sizes.length; $('#qa-colors').parentNode.hidden = !p.colors.length;
    function draw() {
      $('#qa-sizes').innerHTML = p.sizes.map(function (s) { return '<button type="button" class="chip" aria-pressed="' + (s === size) + '" data-s="' + esc(s) + '">' + esc(s) + '</button>'; }).join('');
      $('#qa-colors').innerHTML = p.colors.map(function (c) { return '<button type="button" class="sw" aria-pressed="' + (c === color) + '" aria-label="' + COLORS[c].name + '" data-c="' + c + '" style="background:' + COLORS[c].hex + '"></button>'; }).join('');
      $('#qa-cname').textContent = colorName(color);
      $$('#qa-sizes .chip').forEach(function (b) { b.onclick = function () { size = b.dataset.s; draw(); }; });
      $$('#qa-colors .sw').forEach(function (b) { b.onclick = function () { color = b.dataset.c; draw(); }; });
    }
    draw();
    $('#qa-add').onclick = function () {
      if (p.sizes.length && !size) { toast('Choose a size first'); return; }
      addToCart(p.id, size || '', color, 1); dlg.close(); toast('Added to cart');
    };
    $('#qa-close').onclick = function () { dlg.close(); };
    dlg.showModal();
  }

  /* ---------- pages ---------- */
  function initHome() {
    var cats = [['dresses', 'Dresses'], ['coords', 'Co-ords'], ['tops', 'Tops'], ['bottoms', 'Bottoms'], ['new', 'New Arrivals']];
    var seedFor = { dresses: 0, coords: 1, tops: 2, bottoms: 3, new: 4 };
    $('#cat-row').innerHTML = cats.map(function (c) {
      var p = c[0] === 'new' ? (PRODUCTS.filter(function (x) { return x.isNew; })[3] || PRODUCTS.filter(function (x) { return x.isNew; })[0]) : PRODUCTS.filter(function (x) { return x.cat === c[0]; })[0];
      if (!p) return '';
      var inner = hasPhoto(p) ? photo(p, 0, c[1]) : art(p.type, hexOf(p.colors[0]), seedFor[c[0]]);
      return '<a class="cat" href="shop.html?' + (c[0] === 'new' ? 'new=1' : 'cat=' + c[0]) + '"><span class="cat-img">' + inner + '</span>' + c[1] + '</a>';
    }).join('');
    var best = PRODUCTS.filter(function (p) { return p.best; }).slice(0, 4);
    if (!best.length) best = PRODUCTS.slice(0, 4);
    var g = $('#best-grid'); g.innerHTML = best.map(card).join(''); bindCards(g);
    var r = $('#review-list');
    if (REVIEWS.length) r.innerHTML = REVIEWS.map(function (v) { return '<figure class="review"><div class="stars" aria-label="' + v.stars + ' stars">' + '★'.repeat(v.stars) + '</div><p>' + esc(v.text) + '</p><b>' + esc(v.name) + '</b></figure>'; }).join('');
  }

  function initShop() {
    var P = new URLSearchParams(location.search);
    var st = { cat: P.get('new') === '1' ? 'new' : (CATS[P.get('cat')] ? P.get('cat') : 'all'), q: (P.get('q') || '').toLowerCase(), sort: 'featured', sizes: [], colors: [], max: 9000 };
    var ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', '52', '54', '56', '58'];
    var f = $('#filters');
    var catList = [['all', 'All products'], ['new', 'New arrivals']].concat(Object.keys(CATS).map(function (k) { return [k, CATS[k]]; }));
    f.innerHTML =
      '<div><h3>Category</h3><div class="f-list">' + catList.map(function (c) { return '<label><input type="radio" name="cat" value="' + c[0] + '"' + (st.cat === c[0] ? ' checked' : '') + '>' + c[1] + '</label>'; }).join('') + '</div></div>' +
      '<div><h3>Size</h3><div class="chips" id="f-sizes">' + ALL_SIZES.map(function (s) { return '<button type="button" class="chip" aria-pressed="false" data-s="' + s + '">' + s + '</button>'; }).join('') + '</div></div>' +
      '<div><h3>Colour</h3><div class="swatches" id="f-colors">' + COLOR_KEYS.map(function (c) { return '<button type="button" class="sw" aria-pressed="false" data-c="' + c + '" aria-label="' + COLORS[c].name + '" title="' + COLORS[c].name + '" style="background:' + COLORS[c].hex + '"></button>'; }).join('') + '</div></div>' +
      '<div><h3>Price up to <span id="f-max">' + money(9000) + '</span></h3><input class="range" id="f-range" type="range" min="1500" max="9000" step="100" value="9000" aria-label="Maximum price"></div>' +
      '<button type="button" class="btn btn-light btn-sm" id="f-reset">Clear filters</button>';
    $$('input[name=cat]', f).forEach(function (r) { r.addEventListener('change', function () { st.cat = r.value; render(); }); });
    $$('#f-sizes .chip', f).forEach(function (b) { b.addEventListener('click', function () { toggle(st.sizes, b.dataset.s); b.setAttribute('aria-pressed', st.sizes.indexOf(b.dataset.s) > -1); render(); }); });
    $$('#f-colors .sw', f).forEach(function (b) { b.addEventListener('click', function () { toggle(st.colors, b.dataset.c); b.setAttribute('aria-pressed', st.colors.indexOf(b.dataset.c) > -1); render(); }); });
    $('#f-range').addEventListener('input', function () { st.max = +this.value; $('#f-max').textContent = money(st.max); render(); });
    $('#f-reset').addEventListener('click', function () { location.href = 'shop.html'; });
    $('#sort').addEventListener('change', function () { st.sort = this.value; render(); });
    $('#filter-toggle').addEventListener('click', function () { var o = f.classList.toggle('open'); this.setAttribute('aria-expanded', o); });
    function toggle(a, v) { var i = a.indexOf(v); if (i > -1) a.splice(i, 1); else a.push(v); }
    function render() {
      var list = PRODUCTS.filter(function (p) {
        if (st.cat === 'new' && !p.isNew) return false;
        if (st.cat !== 'all' && st.cat !== 'new' && p.cat !== st.cat) return false;
        if (st.q && (p.name + ' ' + catName(p.cat)).toLowerCase().indexOf(st.q) === -1) return false;
        if (st.sizes.length && !p.sizes.some(function (s) { return st.sizes.indexOf(s) > -1; })) return false;
        if (st.colors.length && !p.colors.some(function (c) { return st.colors.indexOf(c) > -1; })) return false;
        return p.price <= st.max;
      });
      if (st.sort === 'low') list.sort(function (a, b) { return a.price - b.price; });
      if (st.sort === 'high') list.sort(function (a, b) { return b.price - a.price; });
      if (st.sort === 'new') list.sort(function (a, b) { return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0); });
      var title = st.q ? 'Results for "' + P.get('q') + '"' : st.cat === 'all' ? 'All products' : st.cat === 'new' ? 'New arrivals' : catName(st.cat);
      $('#shop-title').textContent = title;
      $('#count').textContent = list.length + (list.length === 1 ? ' product' : ' products');
      var g = $('#shop-grid');
      g.innerHTML = list.length ? list.map(card).join('') : '';
      $('#none').hidden = list.length > 0;
      bindCards(g);
    }
    render();
  }

  function initProduct() {
    var ref = new URLSearchParams(location.search).get('id'), p = ref && byRef(ref), root = $('#pd');
    if (!p) { root.innerHTML = '<div class="empty"><h1>Product not found</h1><p style="margin:12px 0 22px">It may have been removed.</p><a class="btn btn-dark" href="shop.html">Back to shop</a></div>'; return; }
    document.title = p.name + ' | Zirwa Clothing Store';
    var md = document.querySelector('meta[name=description]'); if (md) md.content = p.name + ' at Zirwa Clothing Store, Faisalabad. ' + money(p.price) + '. Order online or on WhatsApp.';
    var size = null, color = p.colors[0] || '', qty = 1, img = 0, out = p.stock <= 0, maxQty = Math.max(1, Math.min(10, p.stock));
    root.innerHTML =
      '<div class="pd-gallery"><div class="thumbs" id="thumbs"></div><div class="pd-main" id="main-art"></div></div>' +
      '<div class="pd-info"><div class="crumbs"><a href="index.html">Home</a> / <a href="shop.html?cat=' + esc(p.cat) + '">' + esc(catName(p.cat)) + '</a></div><h1>' + esc(p.name) + '</h1>' +
      '<div class="pd-price">' + money(p.price) + (p.was ? '<s>' + money(p.was) + '</s>' : '') + '</div><p>' + esc(p.desc) + '</p>' +
      (p.colors.length ? '<div class="opt"><div class="opt-label">Colour <span id="cname"></span></div><div class="swatches" id="colors"></div></div>' : '') +
      (p.sizes.length ? '<div class="opt" id="size-opt"><div class="opt-label">Size <span><a href="#tab-size" class="link-u" id="size-link">Size guide</a></span></div><div class="chips" id="sizes"></div></div>' : '') +
      (out ? '' : '<div class="opt"><div class="opt-label">Quantity</div><div class="qty"><button type="button" id="q-" aria-label="Decrease">&minus;</button><output id="q">1</output><button type="button" id="q+" aria-label="Increase">+</button></div></div>') +
      '<div class="pd-actions">' + (out ? '<button class="btn btn-dark btn-block" disabled>Sold out</button>' :
        '<button class="btn btn-dark btn-block" id="add">Add to Cart</button><button class="btn btn-wa btn-block" id="wa">Order on WhatsApp</button>') + '</div>' +
      '<div class="pd-note"><span>Free shipping on orders above PKR 4,000</span><span>Cash on delivery available</span><span>Questions? Call or WhatsApp ' + STORE.phone + '</span></div></div>';
    function drawGallery() {
      if (hasPhoto(p)) {
        $('#main-art').innerHTML = photo(p, img);
        $('#thumbs').innerHTML = p.images.length > 1 ? p.images.map(function (u, i) { return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === img) + '" aria-label="Photo ' + (i + 1) + '">' + photo(p, i, '') + '</button>'; }).join('') : '';
        $$('#thumbs button').forEach(function (b) { b.onclick = function () { img = +b.dataset.i; drawGallery(); }; });
      } else {
        $('#main-art').innerHTML = art(p.type, hexOf(color), p.seed);
        $('#thumbs').innerHTML = p.colors.map(function (c) { return '<button type="button" data-c="' + c + '" aria-pressed="' + (c === color) + '" aria-label="' + COLORS[c].name + '">' + art(p.type, COLORS[c].hex, p.seed) + '</button>'; }).join('');
        $$('#thumbs button').forEach(function (b) { b.onclick = function () { color = b.dataset.c; draw(); }; });
      }
    }
    function draw() {
      drawGallery();
      if (p.colors.length) {
        $('#cname').textContent = colorName(color);
        $('#colors').innerHTML = p.colors.map(function (c) { return '<button type="button" class="sw" data-c="' + c + '" aria-pressed="' + (c === color) + '" aria-label="' + COLORS[c].name + '" style="background:' + COLORS[c].hex + '"></button>'; }).join('');
        $$('#colors .sw').forEach(function (b) { b.onclick = function () { color = b.dataset.c; draw(); }; });
      }
      if (p.sizes.length) {
        $('#sizes').innerHTML = p.sizes.map(function (s) { return '<button type="button" class="chip" data-s="' + esc(s) + '" aria-pressed="' + (s === size) + '">' + esc(s) + '</button>'; }).join('');
        $$('#sizes .chip').forEach(function (b) { b.onclick = function () { size = b.dataset.s; draw(); }; });
      }
    }
    draw();
    function need() { if (!p.sizes.length || size) return false; var o = $('#size-opt'); o.classList.remove('shake'); void o.offsetWidth; o.classList.add('shake'); toast('Choose a size first'); return true; }
    if (!out) {
      $('#q-').onclick = function () { qty = Math.max(1, qty - 1); $('#q').textContent = qty; };
      $('#q\\+').onclick = function () { qty = Math.min(maxQty, qty + 1); $('#q').textContent = qty; };
      $('#add').onclick = function () { if (need()) return; addToCart(p.id, size || '', color, qty); toast('Added to cart'); };
      $('#wa').onclick = function () {
        if (need()) return;
        var url = location.href.split('#')[0];
        window.open(waLink('Assalam o Alaikum! I would like to order:\n' + p.name + (size ? '\nSize: ' + size : '') + (color ? '\nColour: ' + colorName(color) : '') + '\nQuantity: ' + qty + '\nPrice: ' + money(p.price * qty) + '\n' + url), '_blank', 'noopener');
      };
    }
    // tabs
    var tabs = $$('.tab-list button');
    function openTab(name) { tabs.forEach(function (t) { t.setAttribute('aria-selected', t.dataset.t === name); }); $$('.tab-panel').forEach(function (pn) { pn.hidden = pn.id !== 'tab-' + name; }); }
    tabs.forEach(function (t) { t.addEventListener('click', function () { openTab(t.dataset.t); }); });
    var sl = $('#size-link');
    if (sl) sl.addEventListener('click', function (e) { e.preventDefault(); openTab('size'); $('#tab-size').scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    $('#desc-text').textContent = p.desc + ' Fabric and care details are confirmed on WhatsApp before dispatch.';
    $('#review-wa').href = waLink('Assalam o Alaikum! I would like to share a review for ' + p.name + '.');
    var rel = PRODUCTS.filter(function (x) { return x.cat === p.cat && x.id !== p.id; }).slice(0, 4);
    var g = $('#related'); g.innerHTML = rel.map(card).join(''); bindCards(g);
  }

  function initCart() {
    var box = $('#cart-box');
    function lineHTML(l, i) {
      var p = byId(l.id); if (!p) return '';
      var shown = hasPhoto(p) ? photo(p, 0) : art(p.type, hexOf(l.color), p.seed);
      return '<div class="line"><a class="line-img" href="' + href(p) + '">' + shown + '</a>' +
        '<div><h3><a href="' + href(p) + '">' + esc(p.name) + '</a></h3><small>' + esc(variantText(l.size, l.color)) + '</small><small>' + money(p.price) + ' each</small>' +
        '<div><span class="qty"><button data-d="-1" data-i="' + i + '" aria-label="Decrease">&minus;</button><output>' + l.qty + '</output><button data-d="1" data-i="' + i + '" aria-label="Increase">+</button></span><button class="rm" data-rm="' + i + '">Remove</button></div></div>' +
        '<div class="price">' + money(p.price * l.qty) + '</div></div>';
    }
    function noticeHTML() { return cartNotices.length ? '<p class="notice" role="status">' + cartNotices.map(esc).join(' ') + '</p>' : ''; }
    function render() {
      if (!cart.length) { box.innerHTML = noticeHTML() + '<div class="empty"><h2 style="font-size:36px;margin-bottom:10px">Your cart is empty</h2><p style="margin-bottom:22px">Browse our latest outfits and add your favourites.</p><a class="btn btn-dark" href="shop.html">Continue shopping</a></div>'; return; }
      var t = totals(), u = load('zirwa_user', {});
      box.innerHTML = noticeHTML() + '<div class="cart"><div>' + cart.map(lineHTML).join('') + '<p style="margin-top:18px"><a class="link-u" href="shop.html">Continue shopping</a></p></div>' +
        '<div class="panel"><h2>Checkout</h2>' +
        '<div class="sum-row"><span>Subtotal</span><span>' + money(t.sub) + '</span></div><div class="sum-row"><span>Shipping</span><span>' + (t.ship ? money(t.ship) : 'Free') + '</span></div>' +
        (t.ship ? '<p class="sub" style="font-size:14px">Add ' + money(SETTINGS.freeShipFrom - t.sub) + ' more for free shipping.</p>' : '') +
        '<div class="sum-row sum-total"><span>Total</span><span>' + money(t.total) + '</span></div>' +
        '<form id="co" style="margin-top:22px" novalidate>' +
        '<div class="field"><label for="c-name">Full name</label><input id="c-name" autocomplete="name" maxlength="80" value="' + esc(u.name || '') + '" required></div>' +
        '<div class="field"><label for="c-phone">Phone number</label><input id="c-phone" type="tel" autocomplete="tel" placeholder="03XX XXXXXXX" value="' + esc(u.phone || '') + '" required></div>' +
        '<div class="field"><label for="c-city">City</label><input id="c-city" autocomplete="address-level2" maxlength="60" value="' + esc(u.city || '') + '" required></div>' +
        '<div class="field"><label for="c-addr">Delivery address</label><textarea id="c-addr" autocomplete="street-address" maxlength="300" required></textarea></div>' +
        '<div class="field"><label for="c-note">Order notes (optional)</label><input id="c-note" maxlength="300"></div>' +
        '<div class="hp" aria-hidden="true"><label>Leave this empty<input id="c-web" tabindex="-1" autocomplete="off"></label></div>' +
        '<fieldset class="pay" style="border:0"><legend style="font-weight:500;margin-bottom:8px">Payment method</legend>' +
        '<label><input type="radio" name="pay" value="Cash on Delivery" checked><span>Cash on Delivery<small>Pay when your order arrives.</small></span></label>' +
        ['JazzCash', 'Easypaisa', 'Bank transfer'].map(function (n) { return '<label class="off"><input type="radio" name="pay" value="' + n + '" disabled><span>' + n + '<small>Not available yet.</small></span></label>'; }).join('') + '</fieldset>' +
        '<p class="err" id="co-err" role="alert"></p><button class="btn btn-dark btn-block" id="co-submit" type="submit">Place order</button>' +
        '<p class="sub" style="font-size:13.5px;margin-top:10px">Your order is saved with us and we confirm it with you by phone or WhatsApp before dispatch.</p></form></div></div>';
      $$('[data-d]', box).forEach(function (b) { b.onclick = function () { var l = cart[+b.dataset.i], p = byId(l.id); l.qty = Math.max(1, Math.min(10, p ? p.stock : 10, l.qty + +b.dataset.d)); saveCart(); render(); }; });
      $$('[data-rm]', box).forEach(function (b) { b.onclick = function () { cart.splice(+b.dataset.rm, 1); saveCart(); render(); }; });
      $('#co').addEventListener('submit', place);
    }
    function place(e) {
      e.preventDefault();
      var name = $('#c-name').value.trim(), phone = $('#c-phone').value.trim(), city = $('#c-city').value.trim(), addr = $('#c-addr').value.trim(), err = $('#co-err'), btn = $('#co-submit');
      if (!name || !city || !addr) { err.textContent = 'Please fill in your name, city and delivery address.'; return; }
      if (addr.length < 10) { err.textContent = 'Please enter your complete delivery address (house, street, area).'; $('#c-addr').focus(); return; }
      if (!/^(?:\+?92|0)?3\d{9}$/.test(phone.replace(/[\s\-()]/g, ''))) { err.textContent = 'Enter a valid mobile number, for example 0331 7756688.'; $('#c-phone').focus(); return; }
      err.textContent = ''; btn.disabled = true; btn.textContent = 'Placing your order…';
      var cust = { name: name, phone: phone, city: city, address: addr, notes: $('#c-note').value.trim() };
      window.ZirwaAPI.placeOrder(cart, cust, $('#c-web').value).then(function () {
        save('zirwa_user', { name: name, phone: phone, city: city });
        cart = []; saveCart();
        location.href = 'order-confirmation.html';
      }).catch(function (ex) {
        var f = ex && ex.fields ? Object.keys(ex.fields).map(function (k) { return ex.fields[k]; }).join(' ') : '';
        err.textContent = f || (ex && ex.message) || 'Could not place your order. Please try again.';
        btn.disabled = false; btn.textContent = 'Place order';
        if (ex && ex.status === 409) {   // stock or availability changed: refresh the catalogue and the cart
          loadCatalogue().then(function () { var m = err.textContent; render(); $('#co-err').textContent = m; }).catch(function () {});
        }
      });
    }
    render();
  }

  function initConfirm() {
    var box = $('#confirm-box'), o = window.ZirwaAPI && window.ZirwaAPI.lastOrder();
    if (!o || !o.order_number || !Array.isArray(o.items)) {
      box.innerHTML = '<div class="confirm"><h2>Thank you!</h2><p>If you just placed an order, we have received it and will contact you shortly. Questions? Message us on WhatsApp.</p><a class="btn btn-dark" href="shop.html">Continue shopping</a></div>';
      return;
    }
    var rows = o.items.map(function (i) {
      return '<div class="sum-row"><span>' + esc(i.name) + ' <small>(' + esc(variantText(i.size, i.color)) + ') &times; ' + Number(i.quantity) + '</small></span><span>' + money(i.line_total_pkr) + '</span></div>';
    }).join('');
    box.innerHTML = '<div class="confirm"><h2>Thank you for your order</h2><p>Your order number is</p><p class="order-no">' + esc(o.order_number) + '</p>' +
      '<div class="confirm-sum">' + rows +
      '<div class="sum-row"><span>Subtotal</span><span>' + money(o.subtotal_pkr) + '</span></div>' +
      (Number(o.discount_pkr) ? '<div class="sum-row"><span>Discount</span><span>-' + money(o.discount_pkr) + '</span></div>' : '') +
      '<div class="sum-row"><span>Shipping</span><span>' + (Number(o.shipping_pkr) ? money(o.shipping_pkr) : 'Free') + '</span></div>' +
      '<div class="sum-row sum-total"><span>Total</span><span>' + money(o.total_pkr) + '</span></div></div>' +
      '<p>Payment: <b>Cash on Delivery</b>. Please pay when your order arrives.</p>' +
      '<p>We will confirm your order with you by phone or WhatsApp before dispatch. Keep your order number for any question.</p>' +
      '<a class="btn btn-wa" href="' + waLink(window.ZirwaAPI.orderMessage(o, colorName)) + '" target="_blank" rel="noopener">Send order on WhatsApp</a>' +
      '<p style="margin-top:20px"><a class="link-u" href="shop.html">Continue shopping</a></p></div>';
  }

  function initContact() {
    $('#map').src = MAPS_EMBED;
    $('#maps-link').href = MAPS_LINK;
    $('#contact-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var n = $('#m-name').value.trim(), ph = $('#m-phone').value.trim(), m = $('#m-msg').value.trim();
      window.open(waLink('Assalam o Alaikum! Message from the Zirwa website.\nName: ' + n + '\nPhone: ' + ph + '\n\n' + m), '_blank', 'noopener');
    });
  }

    /* ---------- boot ---------- */
  function decorate() {
    $$('[data-art]').forEach(function (el) { var d = DECOR[+el.dataset.art]; if (d) el.innerHTML = art(d[0], hexOf(d[1]), d[2]); });
  }
  function loadCatalogue() {
    return Promise.all([window.ZirwaAPI.fetchProducts(), window.ZirwaAPI.fetchSettings().catch(function () { return null; })]).then(function (r) {
      PRODUCTS = r[0]; if (r[1]) SETTINGS = r[1];
      var rc = window.ZirwaAPI.reconcileCart(cart, PRODUCTS); cart = rc.cart; cartNotices = rc.notices; saveCart();
      wish = window.ZirwaAPI.reconcileWish(wish, PRODUCTS); save('zirwa_wish', wish);
    });
  }
  function failBox(el, msg) {
    el.innerHTML = '<div class="empty"><p style="margin-bottom:16px">' + esc(msg) + '</p><button class="btn btn-dark" type="button" id="retry-load">Try again</button></div>';
    $('#retry-load').onclick = function () { location.reload(); };
  }
  document.addEventListener('DOMContentLoaded', function () {
    shell();
    var page = document.body.dataset.page;
    decorate();
    if (page === 'contact') initContact();
    if (page === 'confirm') { initConfirm(); return; }
    var holder = { home: '#best-grid', shop: '#shop-grid', product: '#pd', cart: '#cart-box' }[page];
    if (!holder) return;
    var el = $(holder);
    if (!window.ZirwaAPI || !window.ZirwaAPI.isConfigured()) { failBox(el, 'The store is not connected to its database yet. Add your Supabase details in js/config.js.'); return; }
    el.innerHTML = '<p class="empty" style="grid-column:1/-1">Loading…</p>';
    loadCatalogue().then(function () {
      if (page === 'home') initHome();
      if (page === 'shop') initShop();
      if (page === 'product') initProduct();
      if (page === 'cart') initCart();
    }).catch(function () { failBox(el, 'We could not load the products. Please check your connection and try again.'); });
  });
})();
