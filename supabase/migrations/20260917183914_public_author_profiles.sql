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
