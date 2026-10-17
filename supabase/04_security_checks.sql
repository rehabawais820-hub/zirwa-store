-- =====================================================================
-- Zirwa Clothing Store — 04_security_checks.sql
-- Run FOURTH in SQL Editor. Read the "Messages"/Results output:
-- every line must say PASS. Any FAIL means do not go live.
-- It pretends to be a stranger (anon) and a logged-in non-owner.
-- =====================================================================
do $$
declare r text;
begin
  -- ---- ANON (public visitor) ----
  set local role anon;

  begin perform 1 from public.orders limit 1;
    raise notice 'FAIL anon can read orders';
  exception when insufficient_privilege then raise notice 'PASS anon cannot read orders'; end;

  begin perform 1 from public.order_items limit 1;
    raise notice 'FAIL anon can read order_items';
  exception when insufficient_privilege then raise notice 'PASS anon cannot read order_items'; end;

  begin perform 1 from public.admins limit 1;
    raise notice 'FAIL anon can read admins';
  exception when insufficient_privilege then raise notice 'PASS anon cannot read admins'; end;

  begin insert into public.products (slug, name, price_pkr) values ('hack-test', 'Hack', 1);
    raise notice 'FAIL anon can insert products';
  exception when insufficient_privilege then raise notice 'PASS anon cannot insert products'; end;

  begin delete from public.products;
    raise notice 'PASS (anon delete matched 0 rows or was blocked)';
  exception when insufficient_privilege then raise notice 'PASS anon cannot delete products'; end;

  begin perform public.place_order(gen_random_uuid(), 'Test User', '+923001234567',
          'Some long address here', 'Faisalabad', '', '[]'::jsonb, null);
    raise notice 'FAIL anon can call place_order';
  exception when insufficient_privilege then raise notice 'PASS anon cannot call place_order'; end;

  begin perform 1 from public.products where is_active = false limit 1;
    if found then raise notice 'FAIL anon can see inactive products';
    else raise notice 'PASS anon cannot see inactive products'; end if;
  end;

  reset role;
end $$;

do $$
begin
  -- ---- AUTHENTICATED but NOT the owner (random signed-in user) ----
  perform set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid()::text, 'role', 'authenticated')::text, true);
  set local role authenticated;

  begin perform 1 from public.orders limit 1;
    if found then raise notice 'FAIL non-owner can read orders';
    else raise notice 'PASS non-owner sees 0 orders'; end if;
  end;

  begin insert into public.products (slug, name, price_pkr) values ('hack-test', 'Hack', 1);
    raise notice 'FAIL non-owner can insert products';
  exception when insufficient_privilege then raise notice 'PASS non-owner cannot insert products'; end;

  begin update public.orders set payment_status = 'paid';
    raise notice 'PASS non-owner update matched 0 rows (blocked by RLS)';
  exception when insufficient_privilege then raise notice 'PASS non-owner cannot update orders'; end;

  begin perform public.place_order(gen_random_uuid(), 'Test User', '+923001234567',
          'Some long address here', 'Faisalabad', '', '[]'::jsonb, null);
    raise notice 'FAIL non-owner can call place_order';
  exception when insufficient_privilege then raise notice 'PASS non-owner cannot call place_order'; end;

  begin perform 1 from public.admins limit 1;
    raise notice 'FAIL non-owner can read admins';
  exception when insufficient_privilege then raise notice 'PASS non-owner cannot read admins'; end;

  reset role;
end $$;

select 'Check the Messages / Notices panel: all lines must start with PASS' as reminder;
