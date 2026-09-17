import type { OfflineAction, Profile } from '../types';

let profileWrite: Promise<unknown> = Promise.resolve();

// Keep cache refreshes and a new local edit from racing each other.
export function withProfileCacheLock<T>(operation: () => Promise<T>): Promise<T> {
  const task = profileWrite.then(operation, operation);
  profileWrite = task.catch(() => undefined);
  return task;
}

// Preserve an unsent photo when a second offline edit changes only text.
export function mergeProfilePayload(previous: Record<string, unknown>, next: Record<string, unknown>) {
  const merged = { ...previous, ...next };
  for (const kind of ['avatar', 'cover']) {
    if (Object.hasOwn(next, `${kind}PhotoUri`) || Object.hasOwn(next, `${kind}Url`)) {
      for (const suffix of ['PhotoUri', 'MimeType', 'FileName', 'Url']) delete merged[`${kind}${suffix}`];
      for (const suffix of ['PhotoUri', 'MimeType', 'FileName', 'Url']) {
        const key = `${kind}${suffix}`;
        if (Object.hasOwn(next, key)) merged[key] = next[key];
      }
    }
  }
  return merged;
}

export function profileFromRemote(remote: Profile, cached: Profile | null, pending?: OfflineAction): Profile {
  if (pending) {
    return {
      ...remote,
      ...cached,
      id: remote.id,
      role: remote.role,
      fullName: typeof pending.payload.fullName === 'string' ? pending.payload.fullName : cached?.fullName || remote.fullName,
      bio: typeof pending.payload.bio === 'string' ? pending.payload.bio : cached?.bio ?? remote.bio,
      avatarLocalUri: typeof pending.payload.avatarPhotoUri === 'string' ? pending.payload.avatarPhotoUri : cached?.avatarLocalUri,
      coverLocalUri: typeof pending.payload.coverPhotoUri === 'string' ? pending.payload.coverPhotoUri : cached?.coverLocalUri,
      pendingActionId: pending.id,
      syncError: pending.lastError,
    };
  }
  return {
    ...remote,
    avatarLocalUri: cached?.avatarUrl === remote.avatarUrl ? cached?.avatarLocalUri : undefined,
    coverLocalUri: cached?.coverUrl === remote.coverUrl ? cached?.coverLocalUri : undefined,
  };
}
