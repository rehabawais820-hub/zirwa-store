# Test checklist — repeat after EVERY deployment

Replace `SITE` with your live address. "Ready for customers" only when every box passes.

## 0. Automated (on your computer, Node 20+)
- [ ] `npm test` → all unit tests pass.
- [ ] (Optional, needs Python + Playwright + Chromium) `npm run test:e2e` → browser tests against a mock backend pass.
  These do NOT replace the live checks below: they never touch real Supabase, Netlify or Resend.

## 1. Database security (Supabase SQL Editor)
- [ ] Run `supabase/04_security_checks.sql` → every line says PASS.

## 2. Unauthorized admin access
- [ ] Private window → `SITE/admin/` shows only the login form.
- [ ] Wrong password → "Login failed".
- [ ] Create a SECOND temporary user in Supabase (Authentication → Users), log in at `/admin/` → "not the store owner". Delete that user after.
- [ ] Private window, storefront console: `fetch(ZIRWA_CONFIG.SUPABASE_URL+'/rest/v1/orders?select=*',{headers:{apikey:ZIRWA_CONFIG.SUPABASE_ANON_KEY}}).then(r=>r.json()).then(console.log)` → permission error, NOT order rows. Same for `/rest/v1/admins`, and a POST to `/rest/v1/products`.
- [ ] `curl -X POST SITE/api/retry-notification` → 401.

## 3. Public browsing
- [ ] Home, Shop (54 products, filters, sort, search), product pages and the mobile menu look like the original site.
- [ ] Deactivate a product in admin → it disappears from the shop; Activate → returns.
- [ ] Old links like `product.html?id=z001` still open the right product.

## 4. Product management (also on a phone)
- [ ] Add a product with name, description, regular price, discount % (or sale price), category, sizes, colours, stock, flags, 2+ photos → appears on the site with the photos.
- [ ] Edit it (price, remove a photo, change colours) → site updates.
- [ ] Upload a PDF, a GIF, a text file renamed `x.jpg`, and a photo over 5 MB → all refused.
- [ ] Delete the test product → gone, and its photos are removed from Storage (Supabase → Storage → product-images).
- [ ] Re-run `05_seed_demo_products.sql` → still 54 demo products; an edited demo product keeps your edits.

## 5. COD order flow
- [ ] Normal order → confirmation page shows order number, COD, correct total.
- [ ] Admin → Orders shows it with correct items and totals; stock went down.
- [ ] Shipping rule: an order below PKR 4,000 pays PKR 250 shipping; at/above PKR 4,000 shipping is free.
- [ ] Tampered price: DevTools → Network → copy the `create-order` request, add `"price":1,"total":1,"payment_status":"paid"` and resend → saved order has the true price and `unpaid`.
- [ ] Invalid input (empty name, phone `123`, 3-letter address, quantity 0/11) → friendly error, no order created.
- [ ] Out of stock: set a product's stock to 0 in admin while it is in a cart → checkout refused with a clear message.
- [ ] Double-click Place order → exactly ONE order.
- [ ] 6 orders within 10 minutes from one connection → the 6th is refused (delete the test orders afterwards).
- [ ] From a private window try to read `orders`/`order_items` (see §2) → refused. The confirmation page shows only the order just placed in that browser.
- [ ] Cancel a test order in admin → stock returns; it cannot be re-opened.

## 6. Email notifications
- [ ] New order → email arrives at `OWNER_EMAIL` with order number, items, total, COD, admin link and NO customer name/phone/address.
- [ ] The link opens the admin (login required) on that order.
- [ ] Failure test: set a wrong `RESEND_API_KEY` in Netlify, redeploy, place an order → customer still sees confirmation; admin shows "email failed". Restore the key, redeploy, press **Retry** → email arrives, badge turns "sent".

## 7. Before announcing the shop
- [ ] Supabase "Allow new users to sign up" is OFF; only one user exists (the owner) and `admins` has one row.
- [ ] No secret appears in `public/` (search for `service_role`, `re_`, long `eyJ…` keys).
- [ ] Demo products replaced/hidden; test orders deleted.
