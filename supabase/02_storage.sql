-- =====================================================================
-- Zirwa Clothing Store — 02_storage.sql
-- Run SECOND in SQL Editor. Safe to re-run.
-- Creates the public "product-images" bucket. Anyone can VIEW images;
-- only the owner can upload / replace / delete them.
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 5242880,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "zirwa images admin insert" on storage.objects;
drop policy if exists "zirwa images admin update" on storage.objects;
drop policy if exists "zirwa images admin delete" on storage.objects;
drop policy if exists "zirwa images admin select" on storage.objects;

-- No anonymous SELECT policy: public URLs still work for a public bucket,
-- but strangers cannot LIST the bucket contents through the API.
create policy "zirwa images admin select" on storage.objects for select to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
create policy "zirwa images admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "zirwa images admin update" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "zirwa images admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
