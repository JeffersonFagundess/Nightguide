-- Reuse the existing profiles table and review-media bucket.
-- Profile ownership policies remain unchanged.
alter table public.profiles add column if not exists cover_url text;
grant update (cover_url) on public.profiles to authenticated;
