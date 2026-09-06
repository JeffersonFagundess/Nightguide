import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

import { deletePersistedReviewPhoto, extensionFor, readReviewPhoto } from '@/src/lib/review-media';
import { isUuid, readJson, writeJson } from '@/src/lib/storage';
import { supabase } from '@/src/lib/supabase';
import type { OfflineAction, OfflineActionType } from '@/src/types';

const queueKey = 'nightguide:offline-actions:v2';
const listeners = new Set<() => void>();
let activeSync: Promise<OfflineSyncResult> | null = null;

type QueueInput = Omit<OfflineAction, 'id' | 'createdAt' | 'attempts' | 'lastError'> & {
  id?: string;
};

export type OfflineSyncResult = {
  synced: number;
  failed: number;
  pending: number;
};

export async function isNetworkReachable() {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected !== false && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

export async function queueOfflineAction(input: QueueInput) {
  const queue = await getOfflineActions();
  const action: OfflineAction = {
    ...input,
    id: input.id ?? `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  const replaced = shouldReplaceEarlier(action) ? queue.filter((item) => isSameReplaceableAction(item, action)) : [];
  const next = shouldReplaceEarlier(action) ? queue.filter((item) => !isSameReplaceableAction(item, action)) : queue;

  if (action.type === 'review_created') {
    const nextPhotoUri = typeof action.payload.photoUri === 'string' ? action.payload.photoUri : undefined;
    replaced.forEach((item) => {
      const oldPhotoUri = typeof item.payload.photoUri === 'string' ? item.payload.photoUri : undefined;
      if (oldPhotoUri && oldPhotoUri !== nextPhotoUri) deletePersistedReviewPhoto(oldPhotoUri);
    });
  }

  await writeJson(queueKey, [...next, action].slice(-100));
  emitQueueChange();
}

export function getOfflineActions() {
  return readJson<OfflineAction[]>(queueKey, []);
}

export async function getPendingOfflineActionCount(userId?: string) {
  const actions = await getOfflineActions();
  return actions.filter((action) => (userId ? !action.userId || action.userId === userId : !action.userId)).length;
}

export function onOfflineQueueChange(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function syncOfflineActions() {
  if (!activeSync) {
    activeSync = runSync().finally(() => {
      activeSync = null;
      emitQueueChange();
    });
  }
  return activeSync;
}

async function runSync(): Promise<OfflineSyncResult> {
  const snapshot = await getOfflineActions();
  if (!snapshot.length || !supabase || !(await isNetworkReachable())) {
    return { synced: 0, failed: 0, pending: snapshot.length };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { synced: 0, failed: 0, pending: snapshot.length };
  }

  const syncedIds = new Set<string>();
  const failures = new Map<string, string>();

  for (const action of snapshot) {
    if (action.userId && action.userId !== user.id) continue;

    const error = await sendAction(action, user.id);
    if (error) failures.set(action.id, error);
    else syncedIds.add(action.id);
  }

  const latest = await getOfflineActions();
  const next = latest
    .filter((action) => !syncedIds.has(action.id))
    .map((action) => {
      const lastError = failures.get(action.id);
      return lastError
        ? { ...action, userId: action.userId ?? user.id, attempts: action.attempts + 1, lastError }
        : action;
    });

  await writeJson(queueKey, next);
  return { synced: syncedIds.size, failed: failures.size, pending: next.length };
}

async function sendAction(action: OfflineAction, userId: string): Promise<string | null> {
  if (!supabase || !isUuid(action.entityId)) {
    return 'O item local não possui um identificador válido no Supabase.';
  }

  if (action.type === 'favorite_added') {
    const { error } = await supabase
      .from('saved_events')
      .upsert({ user_id: userId, event_id: action.entityId }, { onConflict: 'user_id,event_id' });
    return error?.message ?? null;
  }

  if (action.type === 'favorite_removed') {
    const { error } = await supabase.from('saved_events').delete().eq('user_id', userId).eq('event_id', action.entityId);
    return error?.message ?? null;
  }

  if (action.type === 'review_created') {
    const rating = Number(action.payload.rating);
    const comment = typeof action.payload.comment === 'string' ? action.payload.comment.trim() : '';
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !comment) return 'Avaliação offline inválida.';

    const photoUri = typeof action.payload.photoUri === 'string' ? action.payload.photoUri : undefined;
    const photoMimeType = typeof action.payload.photoMimeType === 'string' ? action.payload.photoMimeType : 'image/jpeg';
    const photoFileName = typeof action.payload.photoFileName === 'string' ? action.payload.photoFileName : undefined;
    let imageUrl = typeof action.payload.photoUrl === 'string' ? action.payload.photoUrl : null;

    if (photoUri) {
      try {
        const photo = await readReviewPhoto(photoUri);
        const extension = extensionFor(photoMimeType, photoFileName);
        const storagePath = `${userId}/${action.id}.${extension}`;
        const { error: uploadError } = await supabase.storage.from('review-media').upload(storagePath, photo, {
          contentType: photoMimeType,
          upsert: true,
        });
        if (uploadError) return uploadError.message;
        imageUrl = supabase.storage.from('review-media').getPublicUrl(storagePath).data.publicUrl;
      } catch (error) {
        return error instanceof Error ? error.message : 'Não foi possível preparar a foto para envio.';
      }
    }

    const { error } = await supabase.from('reviews').upsert(
      {
        user_id: userId,
        venue_id: action.entityId,
        rating,
        comment,
        image_url: imageUrl,
      },
      { onConflict: 'user_id,venue_id' },
    );
    return error?.message ?? null;
  }

  if (action.type === 'ticket_purchased') {
    const quantity = Number(action.payload.quantity);
    const amount = Number(action.payload.totalAmount);
    if (!Number.isInteger(quantity) || quantity < 1 || !Number.isFinite(amount) || amount < 0) {
      return 'Ingresso offline inválido.';
    }

    const { error } = await supabase.from('tickets').upsert(
      {
        user_id: userId,
        event_id: action.entityId,
        status: 'paid',
        quantity,
        amount,
      },
      { onConflict: 'user_id,event_id' },
    );
    return error?.message ?? null;
  }

  const { error } = await supabase
    .from('tickets')
    .update({ status: 'cancelled' })
    .eq('user_id', userId)
    .eq('event_id', action.entityId);
  return error?.message ?? null;
}

function shouldReplaceEarlier(action: OfflineAction) {
  return action.type === 'favorite_added' || action.type === 'favorite_removed' || action.type === 'review_created';
}

function isSameReplaceableAction(current: OfflineAction, next: OfflineAction) {
  const favoriteTypes: OfflineActionType[] = ['favorite_added', 'favorite_removed'];
  const sameFavorite = favoriteTypes.includes(current.type) && favoriteTypes.includes(next.type);
  const sameReview = current.type === 'review_created' && next.type === 'review_created';
  return (sameFavorite || sameReview) && current.entityId === next.entityId && current.userId === next.userId;
}

function emitQueueChange() {
  listeners.forEach((listener) => listener());
}

export async function migrateLegacyOfflineQueue() {
  const legacyKey = 'nightguide:offline-actions';
  const rawLegacy = await AsyncStorage.getItem(legacyKey);
  if (!rawLegacy) return;

  try {
    const parsed = JSON.parse(rawLegacy) as Partial<OfflineAction>[];
    if (!Array.isArray(parsed)) return;
    const current = await getOfflineActions();
    const migrated = parsed
      .filter((action): action is Partial<OfflineAction> & Pick<OfflineAction, 'type' | 'entityId'> =>
        typeof action.entityId === 'string' && isOfflineActionType(action.type),
      )
      .map<OfflineAction>((action) => ({
        id: typeof action.id === 'string' ? action.id : `legacy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: action.type,
        userId: typeof action.userId === 'string' ? action.userId : undefined,
        entityId: action.entityId,
        payload: action.payload && typeof action.payload === 'object' ? action.payload : {},
        createdAt: typeof action.createdAt === 'string' ? action.createdAt : new Date().toISOString(),
        attempts: typeof action.attempts === 'number' ? action.attempts : 0,
        lastError: typeof action.lastError === 'string' ? action.lastError : undefined,
      }));
    await writeJson(queueKey, [...current, ...migrated].slice(-100));
    await AsyncStorage.removeItem(legacyKey);
  } catch {
    // Keep the legacy queue intact if it cannot be migrated safely.
  }
}

function isOfflineActionType(type: unknown): type is OfflineActionType {
  return ['favorite_added', 'favorite_removed', 'review_created', 'ticket_purchased', 'ticket_cancelled'].includes(
    String(type),
  );
}
