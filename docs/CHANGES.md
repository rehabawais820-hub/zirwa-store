# What changed in the original Zirwa storefront (and what did not)

Unchanged: `style.css` rules (only additions at the end), all HTML structure, header/footer/shell, home/shop/product/cart layouts,
filters, sorting, search, wishlist, quick-add dialog, size guide, about/contact/policies pages, illustrated placeholders.

## Files
- `public/script.js` — same file, edited:
  - the generated 54-product catalogue was removed from the browser; products now load from Supabase via `js/zirwa-api.js`
    (the original generator is archived at `scripts/source/script.original.js` and is what produced the seed SQL);
  - product cards / product page / cart show an uploaded photo when one exists, otherwise the original illustration;
  - cart is reconciled against live data (old `z001` ids upgraded, sold-out or changed items removed with a notice, quantity capped by stock);
  - checkout posts to `/api/create-order` (ids, quantity, size, colour + customer details only — never prices) and redirects to `order-confirmation.html`;
  - JazzCash / Easypaisa / Bank transfer shown disabled ("Not available yet");
  - new `initConfirm()` for the confirmation page; "Sold out" handling; friendly error + retry if products can't load.
- `public/js/config.js` (new) — PUBLIC Supabase URL + anon key only.
- `public/js/zirwa-api.js` (new) — loads products/settings, cart reconciliation, order submission (idempotency key per cart+details, double-submit guard).
- `public/order-confirmation.html` (new) — in the site's own look.
- `public/index.html, shop.html, product.html, cart.html` — two `<script>` lines added; home "Easy payment" text now says Cash on delivery.
- `public/style.css` — rules appended for photos, sold-out tag, disabled payment rows, honeypot, notice, confirmation.
- `public/robots.txt` — `/admin/` and the confirmation page disallowed.

## Data mapping (original → database)
| Original | Database |
|---|---|
| `id` z001…z054 | `legacy_id` (keeps old links, carts and wishlists working) |
| `price` (what customers pay) | `sale_price_pkr` if `was` exists, else `price_pkr` |
| `was` (struck-through price) | `price_pkr` (regular price) |
| `cat` dresses/coords/tops/bottoms/abayas/unisex | `category_slug` (same slugs) |
| `isNew`, `best` | `is_new`, `is_bestseller` |
| colour keys, sizes, description | `colors`, `sizes`, `description` |
| (no stock in original) | `stock` = 25 for demo items — edit in admin |
| STORE.freeShipFrom 4000 / shipFee 250 | `settings` table (free shipping at 4,000 and above, PKR 250 fee) |

## Known limits
- Phone numbers: Pakistani mobile numbers only.
- Customers can see stock numbers (the products table is public to read); hide them with a view if that matters to you.
- Admin colours come from the original 10-colour palette; new colours need a small code change.
- The product page "Order on WhatsApp" button is a chat message only and is not saved as an order.
