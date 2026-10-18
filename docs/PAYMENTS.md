# Online payments — disabled on purpose

The storefront shows JazzCash / Easypaisa / Bank transfer as disabled ("Not available yet"). Right now the database accepts only `payment_method = 'COD'` (a CHECK constraint) and `payment_status = 'unpaid'` on creation. No code simulates a payment. To add a real gateway later:

1. Pick a Pakistani gateway and open a merchant account (compare current fees, settlement time and API docs; e.g. evaluate Safepay, PayFast, JazzCash/Easypaisa merchant APIs — confirm what each offers today).
2. Add a payment method to the DB: relax the `payment_method` CHECK, add a `payments` table (order_id, provider, provider_ref, amount_pkr, status, raw_event). Keep RLS: owner read only, no customer access.
3. Server creates the payment session: a new Netlify function reads the order's **server-stored total**, asks the gateway for a checkout session for that exact amount, returns only the redirect URL. Never accept an amount from the browser.
4. **Verify on the server, never in the browser:** the gateway sends a signed webhook to a new function. That function must (a) verify the signature with the secret in a Netlify variable, (b) look up the order by your reference, (c) confirm amount and currency equal the stored total, (d) ignore duplicates (idempotent on the gateway event id), then (e) set `payment_status = 'paid'` using the service-role key. The customer returning to a "success" page must NOT mark anything paid.
5. Add unpaid-expiry: cancel (and restock) orders whose online payment is not completed in X minutes.
6. Test with the gateway's sandbox: forged webhook (bad signature), wrong amount, replayed event, abandoned payment.
