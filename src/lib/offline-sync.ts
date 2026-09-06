"use client";

import { createClient } from "@/lib/supabase/browser";

const dbName = "nightguide-offline";
const dbVersion = 1;
const storeName = "actions";
const syncEventName = "nightguide-sync-change";

export type OfflineActionType =
  | "favorite_added"
  | "favorite_removed"
  | "review_created"
  | "ticket_purchased"
  | "ticket_cancelled"
  | "venue_profile_updated"
  | "owner_event_upserted"
  | "owner_event_deleted";

export type QueuedOfflineAction = {
  id: string;
  type: OfflineActionType;
  entityType: "event" | "venue" | "review" | "ticket";
  entityId?: string;
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

type QueueInput = Omit<QueuedOfflineAction, "id" | "createdAt" | "attempts" | "lastError"> & {
  id?: string;
};

let dbPromise: Promise<IDBDatabase> | null = null;
let syncing = false;

export async function queueOfflineAction(input: QueueInput) {
  if (typeof window === "undefined") return;

  const action: QueuedOfflineAction = {
    id: input.id ?? crypto.randomUUID(),
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    payload: input.payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };

  const db = await openQueue();
  await putAction(db, action);
  emitQueueChange();

  if (navigator.onLine) {
    void syncQueuedActions();
  }
}

export async function syncQueuedActions() {
  if (typeof window === "undefined" || syncing || !navigator.onLine) return;

  syncing = true;
  emitQueueChange();

  try {
    const actions = await getQueuedActions();
    if (!actions.length) return;

    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return;

    for (const action of actions) {
      if (action.type === "review_created" && action.payload.venueId && isUuid(String(action.payload.venueId))) {
        const reviewResult = await syncReviewAction(supabase, user.id, user.user_metadata, action);
        if (reviewResult.ok) {
          await deleteAction(action.id);
          continue;
        }

        await updateAction({
          ...action,
          attempts: action.attempts + 1,
          lastError: reviewResult.error,
        });
        continue;
      }

      const { error } = await supabase.from("user_activity").upsert(
        {
          user_id: user.id,
          action_id: action.id,
          action_type: action.type,
          entity_type: action.entityType,
          entity_id: action.entityId ?? null,
          payload: action.payload,
          client_created_at: action.createdAt,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "user_id,action_id" },
      );

      if (error) {
        await updateAction({
          ...action,
          attempts: action.attempts + 1,
          lastError: error.message,
        });
      } else {
        await deleteAction(action.id);
      }
    }
  } finally {
    syncing = false;
    emitQueueChange();
  }
}

async function syncReviewAction(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  userMetadata: Record<string, unknown>,
  action: QueuedOfflineAction,
) {
  const payload = action.payload;
  let imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl : null;

  if (typeof payload.imageDataUrl === "string" && payload.imageDataUrl.startsWith("data:")) {
    const imageBlob = await fetch(payload.imageDataUrl).then((response) => response.blob());
    const extension = extensionForMime(imageBlob.type || String(payload.imageMimeType || "image/jpeg"));
    const path = `${userId}/${action.id}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("review-media").upload(path, imageBlob, {
      contentType: imageBlob.type || "image/jpeg",
      upsert: true,
    });
    if (uploadError) return { ok: false, error: uploadError.message };
    imageUrl = supabase.storage.from("review-media").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase.from("reviews").upsert(
    {
      id: action.id,
      user_id: userId,
      venue_id: String(payload.venueId),
      rating: Number(payload.rating || 5),
      comment: String(payload.comment || ""),
      image_url: imageUrl,
      author_name: String(userMetadata.full_name || "NightGuide"),
      author_avatar_url: typeof userMetadata.avatar_url === "string" ? userMetadata.avatar_url : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,venue_id" },
  );

  return error ? { ok: false, error: error.message } : { ok: true as const };
}

function extensionForMime(mime: string) {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function getPendingActionCount() {
  return getQueuedActions().then((actions) => actions.length);
}

export async function getQueuedActions() {
  if (typeof window === "undefined") return [];

  const db = await openQueue();

  return new Promise<QueuedOfflineAction[]>((resolve, reject) => {
    const request = db.transaction(storeName, "readonly").objectStore(storeName).getAll();

    request.onsuccess = () => resolve((request.result as QueuedOfflineAction[]).sort(byCreationDate));
    request.onerror = () => reject(request.error);
  });
}

export function onQueueChange(listener: () => void) {
  window.addEventListener(syncEventName, listener);
  return () => window.removeEventListener(syncEventName, listener);
}

function byCreationDate(a: QueuedOfflineAction, b: QueuedOfflineAction) {
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

function emitQueueChange() {
  window.dispatchEvent(new Event(syncEventName));
}

function openQueue() {
  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}

function putAction(db: IDBDatabase, action: QueuedOfflineAction) {
  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(storeName, "readwrite").objectStore(storeName).put(action);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function updateAction(action: QueuedOfflineAction) {
  const db = await openQueue();
  await putAction(db, action);
}

async function deleteAction(id: string) {
  const db = await openQueue();

  return new Promise<void>((resolve, reject) => {
    const request = db.transaction(storeName, "readwrite").objectStore(storeName).delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
