-- =====================================================================
-- Zirwa Clothing Store — 03_make_owner_admin.sql
-- Run THIRD, after you created the owner user in
-- Dashboard -> Authentication -> Users -> Add user.
-- 1) Replace the email below with the owner's exact login email.
-- 2) Run it. It must finish without an error.
-- Only ONE admin can ever exist (see unique index in 01_schema.sql).
-- =====================================================================
do $$
declare v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower('REPLACE_WITH_OWNER_EMAIL@example.com');
  if v_id is null then
    raise exception 'No Supabase user with that email. Create the user first (Authentication -> Users).';
  end if;
  insert into public.admins (user_id) values (v_id) on conflict do nothing;
end $$;

select a.user_id, u.email, a.created_at
from public.admins a join auth.users u on u.id = a.user_id;
