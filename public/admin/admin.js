/* Zirwa admin panel.
 * SECURITY NOTE: this file is only the user interface. Real protection is in the database
 * (Row Level Security + is_admin()) and in the server functions. Even if someone edits this
 * file in their browser, Supabase refuses every owner-only read/write for non-owners. */
(() => {
  'use strict';
  const cfg = window.ZIRWA_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const BUCKET = 'bucket_name';
  const MAX_BYTES = 5 * 1024 * 1024;
  const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') el.className = v; else if (k === 'style') el.style.cssText = v; else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  };
  const pkr = (n) => 'PKR ' + Number(n).toLocaleString('en-PK');
  const COLORS = { blush: ['Blush', '#e9b6bb'], rose: ['Dusty Rose', '#c78790'], mocha: ['Mocha', '#9a7664'], sage: ['Sage', '#8da58a'], sky: ['Sky Blue', '#9db6d1'],
    charcoal: ['Charcoal', '#2d2b30'], ivory: ['Ivory', '#f1e8df'], wine: ['Wine', '#7b2f3d'], emerald: ['Emerald', '#1f5e4a'], sand: ['Sand', '#d6bda3'] };
  const colorName = (k) => (COLORS[k] ? COLORS[k][0] : k);
  const hasSale = (p) => p.sale_price_pkr != null && p.sale_price_pkr < p.price_pkr;
  const pctOff = (p) => Math.round(100 * (p.price_pkr - p.sale_price_pkr) / p.price_pkr);

  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes('YOUR-PROJECT') || !window.supabase) {
    $('#login').hidden = false;
    $('#loginForm').replaceChildren(h('h1', {}, 'Not configured'), h('p', {}, 'Edit public/js/config.js with your Supabase URL and anon key, then redeploy.'));
    return;
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });

  let products = [], categories = [], orders = [], editing = null, images = [], newFiles = [];

  /* ---------- auth ---------- */
  async function requireOwner() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return showLogin();
    const { data, error } = await sb.rpc('is_admin');
    if (error || data !== true) {
      await sb.auth.signOut();
      return showLogin('This account is not the store owner.');
    }
    $('#login').hidden = true; $('#app').hidden = false;
    await Promise.all([loadCategories(), loadProducts()]);
    routeFromHash();
  }
  function showLogin(msg = '') { $('#app').hidden = true; $('#login').hidden = false; $('#loginError').textContent = msg; }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); $('#loginError').textContent = '';
    const f = new FormData(e.target);
    const { error } = await sb.auth.signInWithPassword({ email: String(f.get('email')).trim(), password: String(f.get('password')) });
    if (error) { $('#loginError').textContent = 'Login failed. Check your email and password.'; return; }
    e.target.reset(); requireOwner();
  });
  $('#logout').addEventListener('click', async () => { await sb.auth.signOut(); showLogin(); });

  /* ---------- tabs ---------- */
  function setTab(name) {
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
    $('#tab-products').hidden = name !== 'products'; $('#tab-orders').hidden = name !== 'orders';
    if (name === 'orders') loadOrders();
  }
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => { location.hash = t.dataset.tab === 'orders' ? '#/orders' : '#/products'; setTab(t.dataset.tab); }));
  function routeFromHash() {
    const m = /^#\/orders(?:\/([0-9a-f-]{36}))?$/i.exec(location.hash);
    if (m) { setTab('orders'); } else setTab('products');
  }
  window.addEventListener('hashchange', () => { if (!$('#app').hidden) routeFromHash(); });

  /* ---------- products ---------- */
  async function loadCategories() {
    const { data } = await sb.from('categories').select('*').order('position');
    categories = data || [];
    $('#categorySelect').replaceChildren(h('option', { value: '' }, '— none —'), ...categories.map((c) => h('option', { value: c.slug }, c.name)));
  }
  async function loadProducts() {
    $('#productsMsg').textContent = 'Loading…';
    const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
    if (error) { $('#productsMsg').textContent = 'Could not load products: ' + error.message; return; }
    products = data; renderProducts();
  }
  function renderProducts() {
    const q = $('#search').value.trim().toLowerCase();
    const shown = products.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.category_slug || '').includes(q));
    $('#productsMsg').textContent = `${shown.length} of ${products.length} products`;
    $('#productList').replaceChildren(...shown.map((p) => h('div', { class: 'item' + (p.is_active ? '' : ' inactive') },
      p.images[0] ? h('img', { class: 'thumb', src: p.images[0], alt: '', loading: 'lazy' }) : h('div', { class: 'thumb none' }, 'No photo'),
      h('div', {},
        h('h3', {}, p.name, ' ', p.is_demo ? h('span', { class: 'badge' }, 'demo') : null, ' ', h('span', { class: 'badge ' + (p.is_active ? 'ok' : 'warn') }, p.is_active ? 'Active' : 'Hidden')),
        h('div', { class: 'meta' }, (categories.find((c) => c.slug === p.category_slug) || {}).name || 'No category', ' · ',
          hasSale(p) ? `${pkr(p.sale_price_pkr)} (was ${pkr(p.price_pkr)}, -${pctOff(p)}%)` : pkr(p.price_pkr), ' · Stock: ', p.stock, p.is_new ? ' · New' : '', p.is_bestseller ? ' · Best seller' : '')),
      h('div', { class: 'actions' },
        h('button', { class: 'btn small', onclick: () => openProduct(p) }, 'Edit'),
        h('button', { class: 'btn small', onclick: () => toggleActive(p) }, p.is_active ? 'Deactivate' : 'Activate'),
        h('button', { class: 'btn small danger', onclick: () => deleteProduct(p) }, 'Delete')))));
  }
  $('#search').addEventListener('input', renderProducts);
  async function toggleActive(p) {
    const { error } = await sb.from('products').update({ is_active: !p.is_active }).eq('id', p.id);
    if (error) return alert('Failed: ' + error.message); loadProducts();
  }
  const pathFromUrl = (u) => { const i = u.indexOf(`/object/public/${BUCKET}/`); return i < 0 ? null : decodeURIComponent(u.slice(i + `/object/public/${BUCKET}/`.length)); };
  async function deleteProduct(p) {
    if (!confirm(`Delete "${p.name}" permanently? Past orders keep their own copy of the item details.\n\nTip: use Deactivate to just hide it.`)) return;
    const paths = p.images.map(pathFromUrl).filter(Boolean);
    const { error } = await sb.from('products').delete().eq('id', p.id);
    if (error) return alert('Failed: ' + error.message);
    if (paths.length) await sb.storage.from(BUCKET).remove(paths);
    loadProducts();
  }

  /* ---------- product form ---------- */
  const form = $('#productForm'), dlg = $('#productDialog');
  const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  $('#addProduct').addEventListener('click', () => openProduct(null));
  $('#cancelProduct').addEventListener('click', () => dlg.close());
  form.elements.name.addEventListener('input', () => { if (editing && editing.isNew) form.elements.slug.value = slugify(form.elements.name.value); });

  const priceInput = () => parseInt(form.elements.price_pkr.value, 10);
  form.elements.discount_percent.addEventListener('input', () => {
    const d = parseFloat(form.elements.discount_percent.value), base = priceInput();
    form.elements.sale_price_pkr.value = d > 0 && base > 0 ? Math.round(base * (100 - d) / 100) : '';
  });
  form.elements.sale_price_pkr.addEventListener('input', () => {
    const sp = parseInt(form.elements.sale_price_pkr.value, 10), base = priceInput();
    form.elements.discount_percent.value = sp >= 0 && base > 0 && sp < base ? Math.round(100 * (base - sp) / base) : '';
  });

  function openProduct(p) {
    editing = p ? { ...p } : { id: crypto.randomUUID(), isNew: true };
    images = p ? [...p.images] : []; newFiles = []; $('#formError').textContent = '';
    $('#dialogTitle').textContent = p ? 'Edit product' : 'Add product';
    form.reset();
    const v = p || { name: '', slug: '', description: '', price_pkr: '', sale_price_pkr: null, stock: 0, category_slug: '', sizes: [], colors: [], is_active: true, is_new: false, is_bestseller: false };
    form.elements.name.value = v.name; form.elements.slug.value = v.slug; form.elements.description.value = v.description;
    form.elements.price_pkr.value = v.price_pkr; form.elements.sale_price_pkr.value = v.sale_price_pkr == null ? '' : v.sale_price_pkr;
    form.elements.discount_percent.value = hasSale(v) ? pctOff(v) : ''; form.elements.stock.value = v.stock;
    form.elements.category_slug.value = v.category_slug || ''; form.elements.sizes.value = v.sizes.join(', ');
    form.elements.is_active.checked = v.is_active; form.elements.is_new.checked = !!v.is_new; form.elements.is_bestseller.checked = !!v.is_bestseller;
    $('#colorPicker').replaceChildren(...Object.entries(COLORS).map(([k, [n, hex]]) => h('label', {}, h('input', { type: 'checkbox', name: 'color', value: k, checked: v.colors.includes(k) }), h('span', { class: 'swatch', style: 'background:' + hex }), n)));
    if (p) editing.id = p.id; renderImages(); dlg.showModal();
  }
  function renderImages() {
    const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; renderImages(); };
    $('#imageList').replaceChildren(
      ...images.map((u, i) => h('div', { class: 'img' }, h('img', { src: u, alt: '' }),
        h('button', { type: 'button', onclick: () => { images.splice(i, 1); renderImages(); } }, 'Remove'),
        i > 0 ? h('button', { type: 'button', onclick: () => move(images, i, -1) }, '◀ Move') : null)),
      ...newFiles.map((f, i) => h('div', { class: 'img' }, h('img', { src: f.preview, alt: '' }),
        h('button', { type: 'button', onclick: () => { URL.revokeObjectURL(f.preview); newFiles.splice(i, 1); renderImages(); } }, 'Remove (new)'))));
  }
  async function checkImage(file) {
    if (!TYPES[file.type]) return `${file.name}: only JPG, PNG or WebP images are allowed.`;
    if (file.size > MAX_BYTES) return `${file.name}: larger than 5 MB.`;
    if (file.size < 100) return `${file.name}: file looks empty.`;
    const b = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const jpg = b[0] === 0xFF && b[1] === 0xD8, png = b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
    const webp = b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    const ok = (file.type === 'image/jpeg' && jpg) || (file.type === 'image/png' && png) || (file.type === 'image/webp' && webp);
    return ok ? null : `${file.name}: file content does not match its image type.`;
  }
  $('#imageInput').addEventListener('change', async (e) => {
    const errs = [];
    for (const f of e.target.files) {
      const err = await checkImage(f);
      if (err) errs.push(err); else newFiles.push({ file: f, preview: URL.createObjectURL(f) });
    }
    e.target.value = ''; $('#formError').textContent = errs.join(' '); renderImages();
  });

  const csv = (s) => [...new Set(String(s).split(',').map((x) => x.trim()).filter(Boolean))];
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); const btn = $('#saveProduct'); $('#formError').textContent = '';
    const f = form.elements; const uploaded = [];
    const row = {
      id: editing.id, name: f.name.value.trim(), slug: f.slug.value.trim(), description: f.description.value.trim(),
      price_pkr: parseInt(f.price_pkr.value, 10), sale_price_pkr: f.sale_price_pkr.value === '' ? null : parseInt(f.sale_price_pkr.value, 10),
      stock: parseInt(f.stock.value || '0', 10), category_slug: f.category_slug.value || null,
      sizes: csv(f.sizes.value), colors: [...form.querySelectorAll('input[name=color]:checked')].map((c) => c.value),
      is_active: f.is_active.checked, is_new: f.is_new.checked, is_bestseller: f.is_bestseller.checked,
    };
    if (!(row.price_pkr >= 0) || !(row.stock >= 0)) { $('#formError').textContent = 'Check the price and stock (both must be 0 or more).'; return; }
    if (row.sale_price_pkr != null && !(row.sale_price_pkr >= 0 && row.sale_price_pkr < row.price_pkr)) { $('#formError').textContent = 'The sale price must be lower than the regular price.'; return; }
    btn.disabled = true; btn.textContent = 'Saving…';
    try {
      for (const nf of newFiles) {
        const path = `products/${row.id}/${crypto.randomUUID()}.${TYPES[nf.file.type]}`;
        const { error } = await sb.storage.from(BUCKET).upload(path, nf.file, { contentType: nf.file.type, upsert: false, cacheControl: '31536000' });
        if (error) throw new Error('Image upload failed: ' + error.message);
        uploaded.push(path);
      }
      row.images = [...images, ...uploaded.map((p) => sb.storage.from(BUCKET).getPublicUrl(p).data.publicUrl)];
      const { error } = editing.isNew ? await sb.from('products').insert({ ...row, is_demo: false }) : await sb.from('products').update(row).eq('id', row.id);
      if (error) throw new Error(error.code === '23505' ? 'That URL name (slug) is already used by another product.' : error.message);
      // Remove storage files for images the owner removed while editing.
      if (!editing.isNew) { const gone = (editing.images || []).filter((u) => !images.includes(u)).map(pathFromUrl).filter(Boolean); if (gone.length) await sb.storage.from(BUCKET).remove(gone); }
      newFiles.forEach((n) => URL.revokeObjectURL(n.preview)); dlg.close(); loadProducts();
    } catch (err) {
      if (uploaded.length) await sb.storage.from(BUCKET).remove(uploaded);
      $('#formError').textContent = err.message;
    } finally { btn.disabled = false; btn.textContent = 'Save'; }
  });

  /* ---------- orders ---------- */
  async function loadOrders() {
    $('#ordersMsg').textContent = 'Loading…';
    let q = sb.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).limit(100);
    deploy test
    const st = $('#orderFilter').value; if (st) q = q.eq('order_status', st);
    const { data, error } = await q;
    if (error) { $('#ordersMsg').textContent = 'Could not load orders: ' + error.message; return; }
    orders = data; $('#ordersMsg').textContent = `${orders.length} order(s) (latest 100)`; renderOrders();
  }
  $('#orderFilter').addEventListener('change', loadOrders);
  const notifBadge = (o) => h('span', { class: 'badge ' + ({ sent: 'ok', failed: 'bad', pending: 'warn' }[o.notification_status]) }, 'email ' + o.notification_status);
  function renderOrders() {
    const focusId = (/^#\/orders\/([0-9a-f-]{36})$/i.exec(location.hash) || [])[1];
    $('#orderList').replaceChildren(...orders.map((o) => {
      const sel = (name, opts, val) => h('select', { 'aria-label': name, onchange: (e) => updateOrder(o, { [name]: e.target.value }, e.target) },
        ...opts.map((x) => h('option', { value: x, selected: x === val }, x)));
      const d = h('details', { class: 'order' + (o.id === focusId ? ' focus' : '') },
        h('summary', {}, h('strong', {}, o.order_number), pkr(o.total_pkr), h('span', { class: 'badge' }, o.order_status),
          h('span', { class: 'badge' }, `${o.payment_method} · ${o.payment_status}`), notifBadge(o), h('span', { class: 'meta' }, new Date(o.created_at).toLocaleString('en-PK'))),
        h('div', { class: 'detail' },
          h('div', {}, h('strong', {}, o.customer_name), ' · ', h('a', { href: 'tel:' + o.customer_phone }, o.customer_phone)),
          h('div', {}, o.delivery_address, ', ', o.city), o.notes ? h('div', { class: 'meta' }, 'Notes: ', o.notes) : null,
          h('table', { class: 'items-table' }, ...o.order_items.map((i) => h('tr', {}, h('td', {}, i.product_name, i.size ? ` / ${i.size}` : '', i.color ? ` / ${colorName(i.color)}` : ''), h('td', {}, '× ', i.quantity), h('td', {}, pkr(i.line_total_pkr))))),
          h('div', { class: 'meta' }, `Subtotal ${pkr(o.subtotal_pkr)} · Discount -${pkr(o.discount_pkr)} · Shipping ${pkr(o.shipping_pkr)} · `, h('strong', {}, 'Total ' + pkr(o.total_pkr))),
          h('div', { class: 'row2' },
            h('label', {}, 'Order status', sel('order_status', ['new', 'confirmed', 'shipped', 'delivered', 'cancelled'], o.order_status)),
            h('label', {}, 'Payment status', sel('payment_status', ['unpaid', 'paid', 'refunded'], o.payment_status))),
          o.notification_status !== 'sent' ? h('div', {}, h('button', { class: 'btn small', onclick: () => retry(o.id) }, 'Retry email notification'), o.notification_error ? h('span', { class: 'meta' }, ' last error: ' + o.notification_error) : null) : null));
      if (o.id === focusId) { d.open = true; setTimeout(() => d.scrollIntoView({ block: 'center' }), 50); }
      return d;
    }));
  }
  async function updateOrder(o, patch, el) {
    el.disabled = true;
    if (patch.order_status === 'cancelled' && !confirm('Cancel this order? Stock will be returned. This cannot be undone.')) { el.disabled = false; return loadOrders(); }
    const { error } = await sb.from('orders').update(patch).eq('id', o.id);
    el.disabled = false; if (error) alert('Failed: ' + error.message); loadOrders();
  }
  async function retry(orderId) {
    const { data: { session } } = await sb.auth.getSession();
    const res = await fetch('/api/retry-notification', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + session.access_token }, body: JSON.stringify(orderId ? { order_id: orderId } : {}) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) alert('Retry failed: ' + (j.error || res.status));
    else alert((j.results || []).map((r) => `${r.order_number}: ${r.sent ? 'email sent' : 'still failing (' + r.error + ')'}`).join('\n') || 'Nothing to retry');
    loadOrders();
  }
  $('#retryAll').addEventListener('click', () => retry(null));

  sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') showLogin(); });
  requireOwner();
})();
