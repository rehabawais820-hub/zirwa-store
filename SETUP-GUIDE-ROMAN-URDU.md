# Zirwa Clothing Store — Setup Guide (Roman Urdu)

Yeh guide step-by-step hai. Har step ek ek karke karein, jaldi na karein. Agar kisi screen par naam thora alag nazar aaye (Supabase/Netlify kabhi kabhi menu ke naam badal dete hain), to usi jaisa option dhoondein.

## Pehle yeh samajh lein: kya kya ban gaya hai

- **Aapki website ka design aur mobile layout wahi hai.** Sirf andar ka data ab database (Supabase) se aata hai.
- **54 original products** (Dresses 10, Co-ords 10, Tops 10, Bottoms 8, Abayas 8, Unisex 8) ek SQL file mein tayyar hain: `supabase/05_seed_demo_products.sql`. Prices bilkul wahi hain jo aapki purani website par thin (sale price + cut wali purani price).
- **Product photos:** abhi demo products par photos nahi hain, to wahi purani illustrated tasveerein nazar aayengi. Jab aap admin panel se photo upload karenge, website us product par asli photo dikhayegi.
- **Cart + COD checkout:** order ab server par save hota hai. Customer sirf product, size, colour aur quantity bhejta hai. **Price, discount, shipping aur total server khud nikalta hai**, isliye koi browser mein price badal kar sasta order nahi de sakta.
- **Order confirmation page:** order number ke saath dikhta hai. WhatsApp par order bhejne ka button bhi hai.
- **Owner-only admin panel:** `aapki-site/admin/` par. Sirf aap (owner) login kar sakte hain.
- **Email:** har naye order par aapko email aati hai (order number, items, total, COD, admin link). Customer ka naam/phone/address email mein **nahi** hota. Email fail ho jaye to order save rehta hai aur admin mein "Retry" button hai.
- **Online payments band hain.** Sirf Cash on Delivery chalta hai. JazzCash / Easypaisa / Bank transfer wale options cart mein dikhte hain lekin "Not available yet" ke saath disabled hain.

### Aapki purani website mein jo cheezein maine badli hain (aur kyun)
1. Cart mein JazzCash/Easypaisa/Bank transfer **disabled** kiye, aur home page par "Easy payment" ka likha hua text "Cash on delivery. Pay when your order arrives" kiya, kyunke online payment abhi band hai.
2. Phone number ab sirf Pakistani **mobile** number accept karta hai (jaise 0331 7756688). Landline number accept nahi hoga.
3. Address kam az kam 10 characters ka hona chahiye.
4. Order ki tafseel ab aapko WhatsApp par automatically nahi jaati; order database mein save hota hai. Customer chahe to confirmation page par "Send order on WhatsApp" daba sakta hai.
5. Product page ka purana **"Order on WhatsApp"** button waisa hi hai. Is se aaya hua order sirf WhatsApp chat hota hai, yeh admin panel mein **save nahi hota**.
6. `robots.txt` mein `/admin/` aur confirmation page search engines se chhupaye gaye hain.

---

## Hissa A — Supabase (database)

1. Browser mein **supabase.com** kholein → **Start your project** → sign up karein.
2. **New project** dabayein. Name: `zirwa`. Database password koi mazboot password rakhein aur kisi safe jagah save kar lein. Region: jo Pakistan ke sab se qareeb mile. **Create new project** dabayein aur project ready hone ka intezar karein (1-2 minute).
3. **Owner ka login banayein:** left menu → **Authentication** → **Users** → **Add user** → **Create new user**. Apni email aur mazboot password dein. Agar **Auto Confirm User** ka option ho to tick karein. **Create user** dabayein.
4. **Naye logon ko register hone se rokein:** **Authentication** → **Sign In / Providers** (purane dashboard mein **Providers** ya **Settings**) → Email wale hisse mein **"Allow new users to sign up"** ko **OFF** karein → **Save**.
5. Left menu → **SQL Editor** → **New query**. Project folder mein `supabase/01_schema.sql` kholein (Notepad mein), poori file copy karein, SQL Editor mein paste karein, **Run** dabayein. "Success" aana chahiye.
6. Dobara **New query** → `supabase/02_storage.sql` copy-paste → **Run**. (Yeh product photos ke liye jagah banata hai.)
7. `supabase/03_make_owner_admin.sql` ko Notepad mein kholein. `REPLACE_WITH_OWNER_EMAIL@example.com` ki jagah wohi email likhein jo step 3 mein di thi. Phir copy karke **New query** mein paste karein → **Run**. Neeche ek table aana chahiye jis mein aapki email ho. Agar error aaye ke user nahi mila, to email step 3 wali se match nahi karti.
8. **New query** → `supabase/05_seed_demo_products.sql` copy-paste → **Run**. Neeche `demo_products_in_database = 54` aana chahiye. Yeh file aap dobara bhi chala sakte hain, products double nahi honge aur jo aapne admin mein edit kiya woh wapas purana nahi hoga.
9. **New query** → `supabase/04_security_checks.sql` copy-paste → **Run**. Neeche **Messages / Notices** wali jagah dekhein: har line **PASS** se shuru honi chahiye. Agar koi line **FAIL** ho to website live na karein aur mujhe woh output bhej dein.
10. Keys nikalein: left menu → **Project Settings** (gear icon) → **API** (ya **API Keys**). Wahan se 3 cheezein copy kar lein:
    - **Project URL** (public hai)
    - **anon / publishable key** (public hai, browser mein rakhna theek hai)
    - **service_role / secret key** (**SECRET hai!** kisi ko na dein, website ki kisi file mein na likhein)

## Hissa B — Website mein sirf public keys daalein

11. `public/js/config.js` kholein. Do jagah badlein:
    - `SUPABASE_URL` → apna **Project URL**
    - `SUPABASE_ANON_KEY` → apni **anon / publishable key**

    **Yahan service_role / secret key kabhi mat likhein.** Sirf yeh do public cheezein.

## Hissa C — Email (Resend)

12. **resend.com** par sign up karein.
13. **Domains** → **Add Domain** → apna domain daalein, jo DNS records dikhaye woh apne domain provider (jahan se domain khareeda) ke DNS mein add karein, aur **Verified** hone ka intezar karein. (Agar abhi domain nahi hai to Resend ka test sender sirf aapki apni Resend account email par email bhej sakta hai. Pehle test ke liye theek hai, asli istemal ke liye nahi. Resend ki taza docs check kar lein.)
14. **API Keys** → **Create API Key** → permission **Sending access** → key copy karein (yeh sirf ek baar dikhti hai). **Yeh SECRET hai.**
15. Do cheezein soch lein:
    - `EMAIL_FROM`, jaise `Zirwa Orders <orders@aapka-domain.com>` (domain wohi hona chahiye jo verify hua)
    - `OWNER_EMAIL`, yani wo email jahan naye order ki email aani chahiye

## Hissa D — Website online karna (GitHub + Netlify)

Netlify mein sirf folder drag-drop karne se server functions (order wala hissa) pakka kaam nahi karte, isliye GitHub se jorna behtar hai.

16. **github.com** par account banayein → **New repository** → name `zirwa-store` → **Private** → **Create repository**.
17. Repository ke page par **uploading an existing file** dabayein. Project folder ke **andar ki cheezein** (folder `netlify`, `public`, `supabase`, `scripts`, `tests`, `docs`, `data`, aur files `netlify.toml`, `package.json`, `README.md`) drag karke chhor dein. Kisi `.env` file ko **upload mat karein**. Phir **Commit changes**.
    Zaroori: `netlify.toml` repository ki sab se upar wali (root) level par nazar aani chahiye, kisi folder ke andar nahi.
18. **netlify.com** → sign up (GitHub se) → **Add new site** → **Import an existing project** → **GitHub** → `zirwa-store` chunein. Build command khali rakhein. Netlify `netlify.toml` khud parh leta hai (publish folder `public`, functions `netlify/functions`). **Deploy** dabayein.
19. Netlify mein: **Site configuration** → **Environment variables** → **Add a variable**. Yeh 7 variables ek ek karke daalein (yeh sab **SECRET/server** hain, sirf yahin rahenge):

| Variable ka naam | Kya daalna hai |
|---|---|
| `SUPABASE_URL` | Project URL (step 10) |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role / secret key (step 10). **SECRET** |
| `RESEND_API_KEY` | Resend ki API key (step 14). **SECRET** |
| `OWNER_EMAIL` | Jis email par order notification chahiye |
| `EMAIL_FROM` | `Zirwa Orders <orders@aapka-domain.com>` |
| `SITE_URL` | Aapki site ka address, jaise `https://zirwa.netlify.app` (aakhir mein `/` nahi) |
| `IP_HASH_SALT` | Koi bhi lamba random text (40+ characters). Spam rokne ke liye hai |

20. **Deploys** → **Trigger deploy** → **Deploy site** (variables naye deploy ke baad hi lagte hain).
21. Apni site kholein. Home page par products nazar aane chahiye. Phir `aapki-site/admin/` kholein aur step 3 wali email/password se login karein.

### Kaunsi key kahan jati hai (yaad rakhne ke liye)
- **Public (browser mein rakhna theek):** Supabase Project URL + anon/publishable key → sirf `public/js/config.js`
- **SECRET (kabhi browser file mein nahi):** service_role key, Resend API key → sirf Netlify environment variables
- Agar koi secret ghalti se kahin paste ho jaye to Supabase/Resend mein naya key bana kar Netlify mein badal dein.

## Hissa E — Live karne se pehle test (zaroori)

22. Yeh sab apni live site par karein. Tafseeli list `docs/TEST-CHECKLIST.md` mein hai. Khulasa:
    1. Private/incognito window mein `/admin/` kholein → sirf login form nazar aaye.
    2. Galat password se login → fail hona chahiye.
    3. Admin se login → 54 products dikhen.
    4. Admin mein ek test product add karein (naam, price, discount, category, sizes, colours, stock, 2 photos) → website par nazar aaye.
    5. Galat file upload karein (PDF, GIF, 5 MB se badi photo) → reject honi chahiye.
    6. Website par ek test order dein (COD) → confirmation page par order number aaye.
    7. Admin → **Orders** mein woh order nazar aaye, aur aapki email par notification aaye (naam/phone/address ke baghair).
    8. Email ke link par click karein → admin mein wohi order khule.
    9. Netlify mein `RESEND_API_KEY` ghalat kar ke ek order dein → order save hona chahiye, admin mein "email failed" dikhe. Key theek karein, redeploy karein, **Retry** dabayein → email aa jaye.
    10. Test orders aur test products delete kar dein.
23. Jab sab theek ho, demo products ko admin mein edit/hide/delete karke asli products add karein.

## Agar koi masla aaye
- **Website par "could not load the products":** `public/js/config.js` mein URL/key check karein, aur step 5 aur 8 chal chuke hon.
- **Admin mein "This account is not the store owner":** step 7 nahi chala ya galat email use hui.
- **Order dete waqt "Something went wrong":** Netlify → **Logs → Functions** dekhein; `SUPABASE_URL` aur `SUPABASE_SERVICE_ROLE_KEY` check karein; phir dobara deploy karein.
- **Order save hua lekin email nahi aayi:** Admin → Orders → "email failed" → **Retry**. Pehle Resend ka domain verify aur API key check karein.
- **Photo upload nahi ho rahi:** photo JPG/PNG/WebP aur 5 MB se chhoti ho; step 6 (`02_storage.sql`) chal chuka ho.

## Cheezein jo meine test KAR LI aur jo NAHI kar saka
Yeh bilkul saaf likhna zaroori hai taake aap ghalat fehmi mein na rahein.

**Test ho chuka (mere computer par, nakli/mock backend ke saath):**
- 36 automatic tests: validation, price tampering, duplicate order, email failure, retry permissions, 54 products ka data (prices bilkul original) aur "browser mein koi secret nahi".
- Asli browser (Chromium) mein 63 storefront checks: home, shop, filters, search, product page, purani cart ka migrate hona, checkout, confirmation, order tamper, double-click, rate limit, out-of-stock, email failure, photos, sold-out, backend down, mobile layout (375px par koi horizontal scroll nahi).
- Asli browser mein 37 admin checks (naqli Supabase client ke saath): login, non-owner reject, search, deactivate, edit, discount/sale price, galat images reject, product add/delete, orders, retry, mobile.

**Test NAHI hua (aapko khud live par karna hai, aur is se pehle "production-ready" na kahein):**
- SQL files (`01`-`05`) asli Postgres/Supabase par chali nahi, mere paas Postgres nahi tha. Is liye `04_security_checks.sql` zaroor chalayen; woh RLS ka asli imtihan hai.
- Asli Supabase login, Storage upload aur Row Level Security.
- Asli Netlify deploy (functions ka `/api/...` path) aur Netlify ke security headers.
- Asli Resend email delivery.
- Asli phone (iPhone/Android) par test; maine Chromium mein mobile size dekha hai.
- Admin panel ki asli `supabase-js` library (woh internet se load hoti hai); mere test mein uski jagah naqli client tha.
