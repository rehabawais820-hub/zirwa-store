# Zirwa Clothing Store — storefront + owner admin panel + COD orders + email notifications

**Start here: `SETUP-GUIDE-ROMAN-URDU.md`** (step-by-step). What changed in your original site: `docs/CHANGES.md`.

| Path | Purpose |
|---|---|
| `public/` | the website (your original design) + `admin/` owner panel + `js/` connector |
| `supabase/01_schema.sql … 05_seed_demo_products.sql` | database, row-level security, storage, owner admin, security self-test, the 54 demo products |
| `netlify/functions/` | `create-order` (public checkout) and `retry-notification` (owner only) |
| `netlify/lib/` | validation, Supabase REST client, Resend email — no npm dependencies |
| `scripts/` | `extract-demo-products.mjs` rebuilds the 54 products from `scripts/source/script.original.js`; optional command-line seeding |
| `tests/` | `npm test` (unit) and `npm run test:e2e` (browser, mock backend) |
| `docs/` | `TEST-CHECKLIST.md`, `CHANGES.md`, `PAYMENTS.md` (how to add a real payment gateway later) |

Edit shop details (phone, WhatsApp, address, social links, reviews) at the top of `public/script.js` as before.
Products are now managed in the admin panel, not in `script.js`.
