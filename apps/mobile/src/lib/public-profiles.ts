import { fetch as expoFetch } from 'expo/fetch';
import { Directory, File, Paths } from 'expo-file-system';

import { publicAuthorName, publicProfileFromRow } from '@/src/lib/public-profile-data';
import { isUuid, readJson, writeJson } from '@/src/lib/storage';
import { supabase } from '@/src/lib/supabase';
import type { PublicProfile, Review } from '@/src/types';

const fields = 'id,full_name,avatar_url,cover_url,bio';
const cacheKey = (id: string) => `nightguide:public-profile:v1:${id}`;
const downloads = new Map<string, Promise<string | undefined>>();

function photoKey(url: string) {
  let first = 2166136261;
  let second = 5381;
  for (let index = 0; index < url.length; index += 1) {
    first = Math.imul(first ^ url.charCodeAt(index), 16777619);
    second = Math.imul(second, 33) ^ url.charCodeAt(index);
  }
  return `${(first >>> 0).toString(16)}-${(second >>> 0).toString(16)}`;
}

async function savePublicPhoto(url?: string) {
  if (!url?.startsWith('https://')) return undefined;
  const pending = downloads.get(url);
  if (pending) return pending;
  const download = (async () => {
    try {
      const directory = new Directory(Paths.document, 'public-profile-media');
      directory.create({ idempotent: true, intermediates: true });
      const file = new File(directory, `${photoKey(url)}.img`);
      if (file.exists && file.size > 0) return file.uri;
      const response = await expoFetch(url, { signal: AbortSignal.timeout(8000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) return undefined;
      const length = Number(response.headers.get('content-length'));
      if (length > 6 * 1024 * 1024) return undefined;
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length || bytes.length > 6 * 1024 * 1024) return undefined;
      file.write(bytes);
      return file.uri;
    } catch {
      // Text remains readable even if a photo download fails.
      return undefined;
    }
  })();
  downloads.set(url, download);
  try { return await download; }
  finally { downloads.delete(url); }
}

async function cacheProfile(profile: PublicProfile, includeCover: boolean) {
  const [avatarLocalUri, coverLocalUri] = await Promise.all([
    savePublicPhoto(profile.avatarUrl),
    includeCover ? savePublicPhoto(profile.coverUrl) : Promise.resolve(undefined),
  ]);
  const previous = await readCachedPublicProfile(profile.id);
  const next: PublicProfile = {
    ...profile,
    avatarLocalUri: avatarLocalUri || (previous?.avatarUrl === profile.avatarUrl ? previous?.avatarLocalUri : undefined),
    coverLocalUri: coverLocalUri || (previous?.coverUrl === profile.coverUrl ? previous?.coverLocalUri : undefined),
  };
  await writeJson(cacheKey(profile.id), next);
  return next;
}

export async function readCachedPublicProfile(id: string) {
  if (!isUuid(id)) return null;
  return readJson<PublicProfile | null>(cacheKey(id), null);
}

export async function fetchPublicProfile(id: string) {
  if (!isUuid(id)) return null;
  if (!supabase) throw new Error('Public profiles are unavailable');
  const { data, error } = await supabase.from('author_profiles').select(fields).eq('id', id)
    .abortSignal(AbortSignal.timeout(10000)).maybeSingle();
  if (error) throw error;
  if (!data) {
    await writeJson(cacheKey(id), null);
    return null;
  }
  return cacheProfile(publicProfileFromRow(data), true);
}

export async function attachPublicAuthors(reviews: Review[], online = true): Promise<Review[]> {
  const ids = [...new Set(reviews.filter(review => !review.isDemo && isUuid(review.userId)).map(review => review.userId!))];
  if (!ids.length) return reviews;
  const cached = await Promise.all(ids.map(readCachedPublicProfile));
  const profiles = new Map(cached.filter((item): item is PublicProfile => Boolean(item)).map(item => [item.id, item]));
  if (online && supabase) {
    try {
      const { data, error } = await supabase.from('author_profiles').select(fields).in('id', ids)
        .abortSignal(AbortSignal.timeout(10000));
      if (error) throw error;
      // Bound simultaneous image downloads; one public query, not one query per post.
      const rows = data || [];
      for (let offset = 0; offset < rows.length; offset += 4) {
        const next = await Promise.all(rows.slice(offset, offset + 4).map(row => cacheProfile(publicProfileFromRow(row), false)));
        next.forEach(profile => profiles.set(profile.id, profile));
      }
    } catch {
      // Keep the last public profile and photos available in airplane mode.
    }
  }
  return reviews.map(review => {
    const profile = review.userId ? profiles.get(review.userId) : undefined;
    return profile ? {
      ...review, authorName: profile.fullName, authorAvatarUrl: profile.avatarUrl,
      authorAvatarLocalUri: profile.avatarLocalUri,
    } : { ...review, authorName: publicAuthorName(review.authorName) };
  });
}
