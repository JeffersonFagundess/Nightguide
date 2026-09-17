create extension if not exists pgcrypto;

do $$
begin
  create type public.user_role as enum ('admin', 'owner', 'customer', 'promoter');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.event_status as enum ('draft', 'published', 'cancelled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.ticket_status as enum ('interested', 'reserved', 'paid', 'cancelled');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  cover_url text,
  phone text,
  bio text,
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Existing installations also need the additive profile-cover column.
alter table public.profiles add column if not exists cover_url text;

create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  name text not null,
  slug text generated always as (
    lower(regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '(^-|-$)', '', 'g'))
  ) stored,
  category text not null default 'Bar e evento',
  description text,
  address text,
  neighborhood text,
  city text not null default 'Saquarema',
  state text not null default 'RJ',
  latitude numeric(10, 8),
  longitude numeric(11, 8),
  phone text,
  whatsapp text,
  instagram text,
  website_url text,
  logo_url text,
  cover_url text,
  rating numeric(3, 2) not null default 0,
  review_count integer not null default 0,
  is_published boolean not null default false,
  is_partner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.venues alter column owner_id drop not null;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  cover_url text,
  price numeric(10, 2) not null default 0,
  ticket_url text,
  genre text,
  mood text,
  capacity integer,
  status public.event_status not null default 'draft',
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_images (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.venue_images (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.saved_events (
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);

create table if not exists public.saved_venues (
  user_id uuid not null references public.profiles(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, venue_id)
);

create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  status public.ticket_status not null default 'interested',
  quantity integer not null default 1 check (quantity > 0),
  amount numeric(10, 2) not null default 0,
  customer_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  visited_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, venue_id)
);

alter table public.reviews add column if not exists image_url text;
alter table public.reviews add column if not exists author_name text not null default 'NightGuide';
alter table public.reviews add column if not exists author_avatar_url text;

insert into public.venues (
  id, owner_id, name, category, description, address, city, state,
  latitude, longitude, rating, is_published, is_partner
)
values
  ('a1000000-0000-4000-8000-000000000001', null, 'Quiosque Maralto', 'Praia e música', 'Vista, música e grupos', 'Orla de Itaúna', 'Saquarema', 'RJ', -22.9296, -42.5103, 4.8, true, false),
  ('a1000000-0000-4000-8000-000000000002', null, 'Vila Gastrobar', 'Bar e gastronomia', 'Drinks, samba e jantar', 'Centro de Saquarema', 'Saquarema', 'RJ', -22.9344, -42.4968, 4.6, true, false),
  ('a1000000-0000-4000-8000-000000000003', null, 'Lagoa Lounge', 'Lounge e drinks', 'Lounge, karaokê e encontro', 'Lagoa de Saquarema', 'Saquarema', 'RJ', -22.9209, -42.5072, 4.7, true, false),
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

create table if not exists public.owner_messages (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_name text,
  sender_email text,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.impact_metrics (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid references public.venues(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  metric_name text not null,
  metric_value numeric not null,
  source text not null default 'app',
  recorded_at timestamptz not null default now()
);

create index if not exists venues_owner_id_idx on public.venues(owner_id);
create index if not exists venues_published_idx on public.venues(is_published);
create index if not exists events_venue_id_idx on public.events(venue_id);
create index if not exists events_creator_id_idx on public.events(creator_id);
create index if not exists events_status_starts_at_idx on public.events(status, starts_at);
create index if not exists tickets_user_id_idx on public.tickets(user_id);
create index if not exists reviews_venue_id_idx on public.reviews(venue_id);
create index if not exists impact_metrics_event_id_idx on public.impact_metrics(event_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists venues_set_updated_at on public.venues;
create trigger venues_set_updated_at
  before update on public.venues
  for each row execute function public.set_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

drop trigger if exists tickets_set_updated_at on public.tickets;
create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- Public-safe projection of the existing account, not a replacement for profiles.
-- Never loosen the private profiles SELECT policy or expose auth.users.
create table if not exists public.author_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  full_name text not null default 'NightGuide',
  avatar_url text,
  cover_url text,
  bio text
);
alter table public.author_profiles enable row level security;
revoke all on public.author_profiles from public, anon, authenticated;
grant select on public.author_profiles to anon, authenticated;
grant all on public.author_profiles to service_role;

drop policy if exists "Public author profiles are readable" on public.author_profiles;
create policy "Public author profiles are readable"
  on public.author_profiles for select to anon, authenticated using (true);

create schema if not exists private;

-- Snapshot triggers read this allowlist, including a safe name for legacy accounts.
create or replace function private.set_review_author()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  select author.full_name, author.avatar_url
  into new.author_name, new.author_avatar_url
  from public.author_profiles as author where author.id = new.user_id;
  new.author_name := coalesce(new.author_name, 'NightGuide');
  return new;
end;
$$;
revoke execute on function private.set_review_author() from public, anon, authenticated, service_role;

create or replace function private.sync_public_author_profile()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  public_name text;
begin
  -- Callable only as a trigger; profile ownership is also enforced by existing RLS.
  if (select auth.uid()) is not null and (select auth.uid()) is distinct from new.id then
    raise exception 'Cannot publish another account profile' using errcode = '42501';
  end if;

  public_name := case
    when nullif(trim(new.full_name), '') is null or strpos(new.full_name, '@') > 0 then 'NightGuide'
    else trim(new.full_name)
  end;
  insert into public.author_profiles (id, full_name, avatar_url, cover_url, bio)
  values (new.id, public_name, new.avatar_url, new.cover_url, new.bio)
  on conflict (id) do update set
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    cover_url = excluded.cover_url,
    bio = excluded.bio;

  -- Keep old publications and older clients up to date after a photo/name change.
  update public.reviews
  set author_name = public_name, author_avatar_url = new.avatar_url
  where user_id = new.id
    and (author_name is distinct from public_name or author_avatar_url is distinct from new.avatar_url);
  return new;
end;
$$;
revoke execute on function private.sync_public_author_profile() from public, anon, authenticated, service_role;

drop trigger if exists profiles_sync_public_author on public.profiles;
create trigger profiles_sync_public_author
  after insert or update of full_name, avatar_url, cover_url, bio on public.profiles
  for each row execute function private.sync_public_author_profile();

insert into public.author_profiles (id, full_name, avatar_url, cover_url, bio)
select id,
  case when nullif(trim(full_name), '') is null or strpos(full_name, '@') > 0 then 'NightGuide' else trim(full_name) end,
  avatar_url, cover_url, bio
from public.profiles
on conflict (id) do update set full_name = excluded.full_name,
  avatar_url = excluded.avatar_url, cover_url = excluded.cover_url, bio = excluded.bio;

update public.reviews as review
set author_name = author.full_name, author_avatar_url = author.avatar_url
from public.author_profiles as author
where author.id = review.user_id
  and (review.author_name is distinct from author.full_name or review.author_avatar_url is distinct from author.avatar_url);

drop trigger if exists reviews_set_author on public.reviews;
create trigger reviews_set_author
  before insert or update on public.reviews
  for each row execute function private.set_review_author();

create or replace function public.refresh_venue_rating()
returns trigger
language plpgsql
as $$
begin
  update public.venues
  set
    rating = coalesce((select round(avg(rating)::numeric, 2) from public.reviews where venue_id = coalesce(new.venue_id, old.venue_id)), 0),
    review_count = (select count(*) from public.reviews where venue_id = coalesce(new.venue_id, old.venue_id))
  where id = coalesce(new.venue_id, old.venue_id);
  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_refresh_venue_rating on public.reviews;
create trigger reviews_refresh_venue_rating
  after insert or update or delete on public.reviews
  for each row execute function public.refresh_venue_rating();

alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;
alter table public.event_images enable row level security;
alter table public.venue_images enable row level security;
alter table public.saved_events enable row level security;
alter table public.saved_venues enable row level security;
alter table public.tickets enable row level security;
alter table public.reviews enable row level security;
alter table public.owner_messages enable row level security;
alter table public.impact_metrics enable row level security;

drop policy if exists "Profiles are readable" on public.profiles;
create policy "Profiles are readable"
  on public.profiles for select
  using ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Published venues are readable" on public.venues;
create policy "Published venues are readable"
  on public.venues for select
  using (is_published = true or (select auth.uid()) = owner_id);

drop policy if exists "Owners insert venues" on public.venues;
create policy "Owners insert venues"
  on public.venues for insert
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners update own venues" on public.venues;
create policy "Owners update own venues"
  on public.venues for update
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists "Owners delete own venues" on public.venues;
create policy "Owners delete own venues"
  on public.venues for delete
  using ((select auth.uid()) = owner_id);

drop policy if exists "Published events are readable" on public.events;
create policy "Published events are readable"
  on public.events for select
  using (
    status = 'published'
    or (select auth.uid()) = creator_id
    or exists (
      select 1 from public.venues
      where venues.id = events.venue_id and venues.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Owners create events" on public.events;
create policy "Owners create events"
  on public.events for insert
  with check (
    (select auth.uid()) = creator_id
    and exists (
      select 1 from public.venues
      where venues.id = events.venue_id and venues.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Owners update events" on public.events;
create policy "Owners update events"
  on public.events for update
  using (
    exists (
      select 1 from public.venues
      where venues.id = events.venue_id and venues.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.venues
      where venues.id = events.venue_id and venues.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Owners delete events" on public.events;
create policy "Owners delete events"
  on public.events for delete
  using (
    exists (
      select 1 from public.venues
      where venues.id = events.venue_id and venues.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Event images readable" on public.event_images;
create policy "Event images readable"
  on public.event_images for select
  using (true);

drop policy if exists "Owners manage event images" on public.event_images;
create policy "Owners manage event images"
  on public.event_images for all
  using (
    exists (
      select 1
      from public.events
      join public.venues on venues.id = events.venue_id
      where events.id = event_images.event_id and venues.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.events
      join public.venues on venues.id = events.venue_id
      where events.id = event_images.event_id and venues.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Venue images readable" on public.venue_images;
create policy "Venue images readable"
  on public.venue_images for select
  using (true);

drop policy if exists "Owners manage venue images" on public.venue_images;
create policy "Owners manage venue images"
  on public.venue_images for all
  using (
    exists (
      select 1 from public.venues
      where venues.id = venue_images.venue_id and venues.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.venues
      where venues.id = venue_images.venue_id and venues.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Users manage saved events" on public.saved_events;
create policy "Users manage saved events"
  on public.saved_events for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage saved venues" on public.saved_venues;
create policy "Users manage saved venues"
  on public.saved_venues for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage own tickets" on public.tickets;
create policy "Users manage own tickets"
  on public.tickets for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Owners read venue tickets" on public.tickets;
create policy "Owners read venue tickets"
  on public.tickets for select
  using (
    exists (
      select 1
      from public.events
      join public.venues on venues.id = events.venue_id
      where events.id = tickets.event_id and venues.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Reviews are readable" on public.reviews;
create policy "Reviews are readable"
  on public.reviews for select
  using (true);

drop policy if exists "Users create reviews" on public.reviews;
create policy "Users create reviews"
  on public.reviews for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own reviews" on public.reviews;
create policy "Users update own reviews"
  on public.reviews for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own reviews" on public.reviews;
create policy "Users delete own reviews"
  on public.reviews for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "Owners read venue messages" on public.owner_messages;
create policy "Owners read venue messages"
  on public.owner_messages for select
  using (
    exists (
      select 1 from public.venues
      where venues.id = owner_messages.venue_id and venues.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Anyone creates owner messages" on public.owner_messages;
create policy "Anyone creates owner messages"
  on public.owner_messages for insert
  with check (true);

drop policy if exists "Owners update venue messages" on public.owner_messages;
create policy "Owners update venue messages"
  on public.owner_messages for update
  using (
    exists (
      select 1 from public.venues
      where venues.id = owner_messages.venue_id and venues.owner_id = (select auth.uid())
    )
  );

drop policy if exists "Owners read impact metrics" on public.impact_metrics;
create policy "Owners read impact metrics"
  on public.impact_metrics for select
  using (
    venue_id is null
    or exists (
      select 1 from public.venues
      where venues.id = impact_metrics.venue_id and venues.owner_id = (select auth.uid())
    )
  );

create schema if not exists private;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'customer'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

insert into storage.buckets (id, name, public)
values
  ('venue-covers', 'venue-covers', true),
  ('event-covers', 'event-covers', true),
  ('review-media', 'review-media', true)
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

drop policy if exists "Owners upload NightGuide covers" on storage.objects;
create policy "Owners upload NightGuide covers"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('venue-covers', 'event-covers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role in ('owner', 'admin')
    )
  );

drop policy if exists "Owners update NightGuide covers" on storage.objects;
create policy "Owners update NightGuide covers"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('venue-covers', 'event-covers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('venue-covers', 'event-covers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Owners delete NightGuide covers" on storage.objects;
create policy "Owners delete NightGuide covers"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('venue-covers', 'event-covers')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
