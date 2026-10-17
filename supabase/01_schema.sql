-- =====================================================================
-- Zirwa Clothing Store — 01_schema.sql
-- Run this FIRST in Supabase Dashboard -> SQL Editor. Safe to re-run.
-- Creates tables, row level security (RLS), and the order function.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. ADMINS  (exactly one owner; nobody can write here through the API)
-- ---------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
-- Only one row may ever exist: a unique index on a constant expression.
create unique index if not exists admins_only_one on public.admins ((true));

alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
-- No policies on purpose: the browser API can neither read nor write this table.
-- The owner is added only from the SQL Editor (03_make_owner_admin.sql).

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 2. CATEGORIES + SETTINGS
-- ---------------------------------------------------------------------
create table if not exists public.categories (
  slug     text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name     text not null,
  position int  not null default 0
);
-- Same six categories (and slugs) the storefront already uses.
-- "New arrivals" and "Best sellers" are flags on a product, not categories.
insert into public.categories (slug, name, position) values
  ('dresses', 'Dresses', 1),
  ('coords',  'Co-ords', 2),
  ('tops',    'Tops',    3),
  ('bottoms', 'Bottoms', 4),
  ('abayas',  'Abayas',  5),
  ('unisex',  'Unisex',  6)
on conflict (slug) do nothing;

create table if not exists public.settings (
  key   text primary key,
  value text not null
);
-- Taken from your storefront (script.js STORE.freeShipFrom / STORE.shipFee).
insert into public.settings (key, value) values
  ('free_shipping_threshold', '4000'),
  ('shipping_fee',            '250')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
-- 3. PRODUCTS
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name             text not null check (char_length(name) between 2 and 140),
  description      text not null default '' check (char_length(description) <= 4000),
  price_pkr        integer not null check (price_pkr between 0 and 10000000),   -- regular price
  sale_price_pkr   integer,                                                     -- optional discounted price actually charged
  category_slug    text references public.categories(slug) on update cascade on delete restrict,
  sizes            text[] not null default '{}',
  colors           text[] not null default '{}',
  stock            integer not null default 0 check (stock >= 0),
  images           text[] not null default '{}',
  is_active        boolean not null default true,
  is_demo          boolean not null default false,
  is_new           boolean not null default false,
  is_bestseller    boolean not null default false,
  legacy_id        text unique,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
-- Upgrade path if an earlier version of this file was already run (safe on a fresh database too):
alter table public.products add column if not exists sale_price_pkr integer;
alter table public.products add column if not exists is_new boolean not null default false;
alter table public.products add column if not exists is_bestseller boolean not null default false;
alter table public.products add column if not exists legacy_id text;
alter table public.products drop column if exists discount_percent;
create unique index if not exists products_legacy_id_key on public.products (legacy_id);
alter table public.products drop constraint if exists products_sale_price_chk;
alter table public.products add constraint products_sale_price_chk
  check (sale_price_pkr is null or (sale_price_pkr >= 0 and sale_price_pkr < price_pkr));
delete from public.categories c
 where c.slug in ('new-arrivals','co-ords')
   and not exists (select 1 from public.products p where p.category_slug = c.slug);
create index if not exists products_category_idx on public.products (category_slug);
create index if not exists products_active_idx   on public.products (is_active);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists products_touch on public.products;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 4. ORDERS  (written ONLY by the server function place_order)
-- ---------------------------------------------------------------------
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id                    uuid primary key default gen_random_uuid(),
  order_number          text not null unique,
  idempotency_key       uuid not null unique,
  customer_name         text not null,
  customer_phone        text not null,
  delivery_address      text not null,
  city                  text not null,
  notes                 text not null default '',
  subtotal_pkr          integer not null check (subtotal_pkr >= 0),
  discount_pkr          integer not null check (discount_pkr >= 0),
  shipping_pkr          integer not null check (shipping_pkr >= 0),
  total_pkr             integer not null check (total_pkr >= 0),
  -- Online payments are disabled: the database itself only allows COD.
  payment_method        text not null default 'COD' check (payment_method = 'COD'),
  payment_status        text not null default 'unpaid' check (payment_status in ('unpaid','paid','refunded')),
  order_status          text not null default 'new' check (order_status in ('new','confirmed','shipped','delivered','cancelled')),
  client_hash           text,
  notification_status   text not null default 'pending' check (notification_status in ('pending','sent','failed')),
  notification_attempts integer not null default 0,
  notification_error    text,
  notified_at           timestamptz,
  created_at            timestamptz not null default now()
);
create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_client_idx  on public.orders (client_hash, created_at);

create table if not exists public.order_items (
  id                    uuid primary key default gen_random_uuid(),
  order_id              uuid not null references public.orders(id) on delete cascade,
  product_id            uuid references public.products(id) on delete set null,
  product_name          text not null,
  size                  text not null default '',
  color                 text not null default '',
  unit_price_pkr        integer not null,
  discount_percent      integer not null,
  final_unit_price_pkr  integer not null,
  quantity              integer not null check (quantity between 1 and 10),
  line_total_pkr        integer not null
);
create index if not exists order_items_order_idx on public.order_items (order_id);

-- Cancelling an order puts its stock back (once). A cancelled order cannot be re-opened.
create or replace function public.orders_cancel_restock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.order_status = 'cancelled' and new.order_status <> 'cancelled' then
    raise exception 'A cancelled order cannot be re-opened';
  end if;
  if old.order_status <> 'cancelled' and new.order_status = 'cancelled' then
    update public.products p
       set stock = p.stock + i.quantity
      from public.order_items i
     where i.order_id = new.id and i.product_id = p.id;
  end if;
  return new;
end $$;
drop trigger if exists orders_cancel_restock_trg on public.orders;
create trigger orders_cancel_restock_trg before update of order_status on public.orders
  for each row execute function public.orders_cancel_restock();

-- ---------------------------------------------------------------------
-- 5. place_order(): the ONLY way an order is created.
--    All prices / discounts / shipping / totals are computed here from
--    the products table. Nothing price-related is accepted from the browser.
-- ---------------------------------------------------------------------
create or replace function public.place_order(
  p_idempotency_key uuid,
  p_customer_name   text,
  p_phone           text,
  p_address         text,
  p_city            text,
  p_notes           text,
  p_items           jsonb,
  p_client_hash     text
) returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_existing   public.orders%rowtype;
  v_threshold  integer;
  v_fee        integer;
  v_item       jsonb;
  v_prod       public.products%rowtype;
  v_pid        uuid;
  v_qty        integer;
  v_size       text;
  v_color      text;
  v_final      integer;
  v_subtotal   integer := 0;
  v_discount   integer := 0;
  v_shipping   integer;
  v_total      integer;
  v_order_id   uuid := gen_random_uuid();
  v_number     text;
  v_lines      jsonb := '[]'::jsonb;
  v_ids        uuid[];
  v_recent     integer;
  v_daily      integer;
begin
  -- Serialise duplicate submissions of the same checkout attempt.
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));

  select * into v_existing from public.orders where idempotency_key = p_idempotency_key;
  if found then
    select coalesce(jsonb_agg(jsonb_build_object(
             'name', product_name, 'size', size, 'color', color,
             'quantity', quantity, 'unit_price_pkr', final_unit_price_pkr,
             'line_total_pkr', line_total_pkr)), '[]'::jsonb)
      into v_lines from public.order_items where order_id = v_existing.id;
    return jsonb_build_object(
      'duplicate', true, 'order_id', v_existing.id, 'order_number', v_existing.order_number,
      'subtotal_pkr', v_existing.subtotal_pkr, 'discount_pkr', v_existing.discount_pkr,
      'shipping_pkr', v_existing.shipping_pkr, 'total_pkr', v_existing.total_pkr,
      'payment_method', v_existing.payment_method, 'payment_status', v_existing.payment_status,
      'notification_status', v_existing.notification_status, 'items', v_lines);
  end if;

  -- Abuse protection: max 5 orders / 10 min and 20 / day per hashed client.
  if p_client_hash is not null then
    select count(*) into v_recent from public.orders
     where client_hash = p_client_hash and created_at > now() - interval '10 minutes';
    select count(*) into v_daily from public.orders
     where client_hash = p_client_hash and created_at > now() - interval '1 day';
    if v_recent >= 5 or v_daily >= 20 then
      raise exception 'rate_limited';
    end if;
  end if;

  -- Defence in depth (the Netlify function validates too).
  if p_customer_name is null or char_length(btrim(p_customer_name)) not between 2 and 80
     or p_phone !~ '^\+923[0-9]{9}$'
     or p_address is null or char_length(btrim(p_address)) not between 10 and 300
     or p_city is null or char_length(btrim(p_city)) not between 2 and 60
     or char_length(coalesce(p_notes, '')) > 300 then
    raise exception 'invalid_customer';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'invalid_items';
  end if;

  begin
    select array_agg(distinct (e->>'product_id')::uuid)
      into v_ids from jsonb_array_elements(p_items) e;
  exception when others then
    raise exception 'invalid_items';
  end;

  -- Lock the products in a stable order so concurrent orders cannot deadlock or oversell.
  perform 1 from public.products where id = any(v_ids) order by id for update;

  select coalesce((select value::int from public.settings where key = 'free_shipping_threshold'), 4000)
    into v_threshold;
  select coalesce((select value::int from public.settings where key = 'shipping_fee'), 250)
    into v_fee;

  for v_item in select * from jsonb_array_elements(p_items) loop
    begin
      v_pid   := (v_item->>'product_id')::uuid;
      v_qty   := (v_item->>'quantity')::int;
      v_size  := coalesce(v_item->>'size', '');
      v_color := coalesce(v_item->>'color', '');
    exception when others then
      raise exception 'invalid_items';
    end;
    if v_qty is null or v_qty < 1 or v_qty > 10 then raise exception 'invalid_items'; end if;

    select * into v_prod from public.products where id = v_pid;
    if not found or not v_prod.is_active then
      raise exception 'product_unavailable';
    end if;

    if coalesce(array_length(v_prod.sizes, 1), 0) > 0 then
      if not (v_size = any(v_prod.sizes)) then raise exception 'invalid_variant'; end if;
    elsif v_size <> '' then raise exception 'invalid_variant'; end if;

    if coalesce(array_length(v_prod.colors, 1), 0) > 0 then
      if not (v_color = any(v_prod.colors)) then raise exception 'invalid_variant'; end if;
    elsif v_color <> '' then raise exception 'invalid_variant'; end if;

    update public.products set stock = stock - v_qty
     where id = v_prod.id and stock >= v_qty;
    if not found then raise exception 'out_of_stock'; end if;

    -- The price charged is ALWAYS read here from the products table (sale price if set).
    v_final    := coalesce(v_prod.sale_price_pkr, v_prod.price_pkr);
    v_subtotal := v_subtotal + v_prod.price_pkr * v_qty;
    v_discount := v_discount + (v_prod.price_pkr - v_final) * v_qty;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_prod.id, 'name', v_prod.name, 'size', v_size, 'color', v_color,
      'quantity', v_qty, 'list_price_pkr', v_prod.price_pkr,
      'discount_percent', case when v_prod.price_pkr > 0 then round(100.0 * (v_prod.price_pkr - v_final) / v_prod.price_pkr)::int else 0 end,
      'unit_price_pkr', v_final, 'line_total_pkr', v_final * v_qty);
  end loop;

  -- Free shipping at or above the threshold (change >= to > if your policy is "strictly above").
  if (v_subtotal - v_discount) >= v_threshold then v_shipping := 0; else v_shipping := v_fee; end if;
  v_total  := v_subtotal - v_discount + v_shipping;
  v_number := 'ZRW-' || to_char(now() at time zone 'Asia/Karachi', 'YYMMDD') || '-' || nextval('public.order_number_seq');

  insert into public.orders (
    id, order_number, idempotency_key, customer_name, customer_phone, delivery_address, city, notes,
    subtotal_pkr, discount_pkr, shipping_pkr, total_pkr, client_hash)
  values (
    v_order_id, v_number, p_idempotency_key, btrim(p_customer_name), p_phone, btrim(p_address),
    btrim(p_city), btrim(coalesce(p_notes, '')), v_subtotal, v_discount, v_shipping, v_total, p_client_hash);

  insert into public.order_items (
    order_id, product_id, product_name, size, color, unit_price_pkr, discount_percent,
    final_unit_price_pkr, quantity, line_total_pkr)
  select v_order_id, (l->>'product_id')::uuid, l->>'name', l->>'size', l->>'color',
         (l->>'list_price_pkr')::int, (l->>'discount_percent')::int, (l->>'unit_price_pkr')::int,
         (l->>'quantity')::int, (l->>'line_total_pkr')::int
    from jsonb_array_elements(v_lines) l;

  return jsonb_build_object(
    'duplicate', false, 'order_id', v_order_id, 'order_number', v_number,
    'subtotal_pkr', v_subtotal, 'discount_pkr', v_discount, 'shipping_pkr', v_shipping,
    'total_pkr', v_total, 'payment_method', 'COD', 'payment_status', 'unpaid',
    'notification_status', 'pending',
    'items', (select jsonb_agg(l - 'product_id' - 'list_price_pkr' - 'discount_percent') from jsonb_array_elements(v_lines) l));
end $$;

-- Only the server (service_role key, used inside Netlify functions) may call it.
revoke all on function public.place_order(uuid,text,text,text,text,text,jsonb,text)
  from public, anon, authenticated;
grant execute on function public.place_order(uuid,text,text,text,text,text,jsonb,text) to service_role;

-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.categories  enable row level security;
alter table public.settings    enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

revoke all on public.categories, public.settings, public.products, public.orders, public.order_items
  from anon, authenticated;

-- Public storefront reads
grant select on public.categories, public.products, public.settings to anon, authenticated;
-- Owner writes (still gated by policies below)
grant insert, update, delete on public.categories, public.products, public.settings to authenticated;
-- Orders: owner can read, and may change only the two status columns
grant select on public.orders, public.order_items to authenticated;
grant update (order_status, payment_status) on public.orders to authenticated;

drop policy if exists categories_read  on public.categories;
drop policy if exists categories_admin on public.categories;
create policy categories_read  on public.categories for select to anon, authenticated using (true);
create policy categories_admin on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists settings_read  on public.settings;
drop policy if exists settings_admin on public.settings;
create policy settings_read  on public.settings for select to anon, authenticated
  using (key in ('free_shipping_threshold','shipping_fee'));
create policy settings_admin on public.settings for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_read  on public.products;
drop policy if exists products_admin on public.products;
create policy products_read  on public.products for select to anon, authenticated
  using (is_active or public.is_admin());
create policy products_admin on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists orders_admin_select on public.orders;
drop policy if exists orders_admin_update on public.orders;
create policy orders_admin_select on public.orders for select to authenticated using (public.is_admin());
create policy orders_admin_update on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists items_admin_select on public.order_items;
create policy items_admin_select on public.order_items for select to authenticated using (public.is_admin());
-- No INSERT/DELETE policies or grants on orders/order_items => customers cannot create,
-- read, or alter orders; the owner can only read them and change the two status columns.
