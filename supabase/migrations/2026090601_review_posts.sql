alter table public.venues alter column owner_id drop not null;
alter table public.reviews add column if not exists image_url text;
alter table public.reviews add column if not exists author_name text not null default 'NightGuide';
alter table public.reviews add column if not exists author_avatar_url text;

create schema if not exists private;

create or replace function private.set_review_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select
    coalesce(nullif(trim(profiles.full_name), ''), 'NightGuide'),
    profiles.avatar_url
  into new.author_name, new.author_avatar_url
  from public.profiles
  where profiles.id = new.user_id;

  new.author_name := coalesce(new.author_name, 'NightGuide');
  return new;
end;
$$;

revoke execute on function private.set_review_author() from public, anon, authenticated, service_role;

drop trigger if exists reviews_set_author on public.reviews;
create trigger reviews_set_author
  before insert or update on public.reviews
  for each row execute function private.set_review_author();

update public.reviews
set
  author_name = coalesce(nullif(trim(profiles.full_name), ''), 'NightGuide'),
  author_avatar_url = profiles.avatar_url
from public.profiles
where profiles.id = reviews.user_id;

insert into public.venues (
  id, owner_id, name, category, description, address, city, state,
  latitude, longitude, rating, is_published, is_partner
)
values
  ('a1000000-0000-4000-8000-000000000001', null, 'Quiosque Maralto', 'Praia e música', 'Vista, música e grupos', 'Orla de Itaúna', 'Saquarema', 'RJ', -22.9296, -42.5103, 4.8, true, false),
  ('a1000000-0000-4000-8000-000000000002', null, 'Vila Gastrobar', 'Bar e gastronomia', 'Drinks, samba e jantar', 'Centro de Saquarema', 'Saquarema', 'RJ', -22.9344, -42.4968, 4.6, true, false),
  ('a1000000-0000-4000-8000-000000000003', null, 'Lagoa Lounge', 'Lounge e drinks', 'Lagoa, karaokê e encontro', 'Lagoa de Saquarema', 'Saquarema', 'RJ', -22.9209, -42.5072, 4.7, true, false),
  ('a1000000-0000-4000-8000-000000000004', null, 'Deck Itaúna', 'Dança e praia', 'Forró, pista aberta e orla', 'Itaúna', 'Saquarema', 'RJ', -22.9312, -42.5148, 4.5, true, false),
  ('a1000000-0000-4000-8000-000000000005', null, 'Wave Club', 'Club e DJs', 'Eletrônica, pista e madrugada', 'Centro', 'Saquarema', 'RJ', -22.9362, -42.5018, 4.4, true, false)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  address = excluded.address,
  city = excluded.city,
  state = excluded.state,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  is_published = true;

insert into storage.buckets (id, name, public)
values ('review-media', 'review-media', true)
on conflict (id) do nothing;

update storage.buckets
set
  public = true,
  file_size_limit = 6291456,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'review-media';

drop policy if exists "Review images are public" on storage.objects;
drop policy if exists "Users select own review images" on storage.objects;
create policy "Users select own review images"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'review-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

grant select on table public.venues to anon, authenticated;
grant select on table public.reviews to anon, authenticated;
grant insert, update, delete on table public.reviews to authenticated;

drop policy if exists "Users upload own review images" on storage.objects;
create policy "Users upload own review images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'review-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

drop policy if exists "Users update own review images" on storage.objects;
create policy "Users update own review images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'review-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'review-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

drop policy if exists "Users delete own review images" on storage.objects;
create policy "Users delete own review images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'review-media'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
