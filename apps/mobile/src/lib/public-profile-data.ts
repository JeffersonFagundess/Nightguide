import type { Profile, PublicProfile } from '@/src/types';

export function publicAuthorName(value?: unknown) {
  const name = typeof value === 'string' ? value.trim() : '';
  // Older accounts used their email as the default full_name.
  return name && !name.includes('@') ? name : 'NightGuide';
}

function publicImageUrl(value: unknown) {
  return typeof value === 'string' && value.startsWith('https://') ? value : undefined;
}

export function publicProfileFromRow(row: Record<string, unknown>): PublicProfile {
  // Explicit allowlist: don't spread database/account rows into a public cache.
  return {
    id: String(row.id),
    fullName: publicAuthorName(row.full_name),
    bio: typeof row.bio === 'string' ? row.bio : '',
    avatarUrl: publicImageUrl(row.avatar_url),
    coverUrl: publicImageUrl(row.cover_url),
  };
}

export function publicProfileFromOwn(profile: Profile): PublicProfile {
  return {
    id: profile.id,
    fullName: publicAuthorName(profile.fullName),
    bio: profile.bio || '',
    avatarUrl: profile.avatarUrl,
    coverUrl: profile.coverUrl,
    avatarLocalUri: profile.avatarLocalUri,
    coverLocalUri: profile.coverLocalUri,
  };
}
