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
