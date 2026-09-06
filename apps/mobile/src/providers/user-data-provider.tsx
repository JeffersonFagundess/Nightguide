import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { scheduleEventReminder } from '@/src/lib/notifications';
import { isNetworkReachable, queueOfflineAction, syncOfflineActions } from '@/src/lib/offline-sync';
import { isUuid, parsePrice, readJson, scopedKey, writeJson } from '@/src/lib/storage';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/providers/auth-provider';
import type { NightEvent, Review, Ticket } from '@/src/types';

type UserDataContextValue = {
  ready: boolean;
  favoriteIds: string[];
  tickets: Ticket[];
  reviews: Review[];
  toggleFavorite: (event: NightEvent) => Promise<boolean>;
  createTicket: (event: NightEvent, quantity: number, paymentLabel: string, provider?: Ticket['provider']) => Promise<Ticket>;
  cancelTicket: (ticketId: string) => Promise<void>;
  addReview: (input: Omit<Review, 'id' | 'createdAt'>) => Promise<Review>;
};

const UserDataContext = createContext<UserDataContextValue | null>(null);

export function UserDataProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const scope = user?.id || 'guest';
  const [ready, setReady] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  useEffect(() => {
    let active = true;
    setReady(false);
    void Promise.all([
      readJson<string[]>(scopedKey('nightguide:favorites', scope), []),
      readJson<Ticket[]>(scopedKey('nightguide:tickets', scope), []),
      readJson<Review[]>(scopedKey('nightguide:reviews', scope), []),
      user ? readJson<string[]>(scopedKey('nightguide:favorites', 'guest'), []) : Promise.resolve([]),
    ]).then(async ([savedFavorites, savedTickets, savedReviews, guestFavorites]) => {
      if (!active) return;
      const mergedFavorites = user ? [...new Set([...savedFavorites, ...guestFavorites])] : savedFavorites;
      setFavoriteIds(mergedFavorites);
      setTickets(savedTickets);
      setReviews(savedReviews);
      setReady(true);

      if (user && guestFavorites.length) {
        await writeJson(scopedKey('nightguide:favorites', user.id), mergedFavorites);
        await AsyncStorage.removeItem(scopedKey('nightguide:favorites', 'guest'));
        await Promise.all(
          guestFavorites.filter(isUuid).map((eventId) =>
            queueOfflineAction({
              type: 'favorite_added',
              userId: user.id,
              entityId: eventId,
              payload: { eventId },
            }),
          ),
        );
      }

      if (user && supabase && (await isNetworkReachable())) {
        const { data } = await supabase
          .from('reviews')
          .select('id,venue_id,rating,comment,image_url,author_name,author_avatar_url,created_at,venues(name)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (active && data) {
          const remoteReviews = data.map<Review>((row) => {
            const venueRelation = Array.isArray(row.venues) ? row.venues[0] : row.venues;
            return {
              id: String(row.id),
              userId: user.id,
              venueId: String(row.venue_id),
              venue: String(venueRelation?.name || 'Estabelecimento'),
              rating: Number(row.rating),
              comment: String(row.comment || ''),
              createdAt: String(row.created_at),
              photoUrl: row.image_url ? String(row.image_url) : undefined,
              authorName: String(row.author_name || 'NightGuide'),
              authorAvatarUrl: row.author_avatar_url ? String(row.author_avatar_url) : undefined,
            };
          });
          const locallyEditedVenueIds = new Set(savedReviews.map((review) => review.venueId));
          const mergedReviews = [...savedReviews, ...remoteReviews.filter((review) => !locallyEditedVenueIds.has(review.venueId))];
          setReviews(mergedReviews);
          await writeJson(scopedKey('nightguide:reviews', user.id), mergedReviews);
        }
      }
    });
    return () => {
      active = false;
    };
  }, [scope]);

  const toggleFavorite = useCallback(
    async (event: NightEvent) => {
      const isSaved = favoriteIds.includes(event.id);
      const next = isSaved ? favoriteIds.filter((id) => id !== event.id) : [...favoriteIds, event.id];
      setFavoriteIds(next);
      await writeJson(scopedKey('nightguide:favorites', scope), next);

      if (!isSaved) void scheduleEventReminder(event).catch(() => undefined);

      if (user && supabase && isUuid(event.id)) {
        const queuedAction = {
          type: isSaved ? 'favorite_removed' as const : 'favorite_added' as const,
          userId: user.id,
          entityId: event.id,
          payload: { eventId: event.id },
        };
        if (!(await isNetworkReachable())) {
          await queueOfflineAction(queuedAction);
          return !isSaved;
        }
        const operation = isSaved
          ? supabase.from('saved_events').delete().eq('user_id', user.id).eq('event_id', event.id)
          : supabase.from('saved_events').upsert({ user_id: user.id, event_id: event.id });
        const { error } = await operation;
        if (error) await queueOfflineAction(queuedAction);
      }
      return !isSaved;
    },
    [favoriteIds, scope, user],
  );

  const createTicket = useCallback(
    async (event: NightEvent, quantity: number, paymentLabel: string, provider: Ticket['provider'] = 'demo') => {
      const ticket: Ticket = {
        id: `NG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
        eventId: event.id,
        eventTitle: event.title,
        venue: event.venue,
        date: event.date,
        time: event.time,
        quantity,
        totalAmount: parsePrice(event.price) * quantity,
        paymentLabel,
        status: 'approved',
        createdAt: new Date().toISOString(),
        buyerEmail: user?.email || 'visitante@nightguide.app',
        provider,
      };
      const next = [ticket, ...tickets];
      setTickets(next);
      await writeJson(scopedKey('nightguide:tickets', scope), next);

      if (user && supabase && isUuid(event.id)) {
        const queuedAction = {
          type: 'ticket_purchased' as const,
          userId: user.id,
          entityId: event.id,
          payload: { ...ticket },
        };
        if (!(await isNetworkReachable())) {
          await queueOfflineAction(queuedAction);
          return ticket;
        }
        const { error } = await supabase.from('tickets').upsert(
          {
            user_id: user.id,
            event_id: event.id,
            status: 'paid',
            quantity,
            amount: ticket.totalAmount,
          },
          { onConflict: 'user_id,event_id' },
        );
        if (error) await queueOfflineAction(queuedAction);
      }
      return ticket;
    },
    [scope, tickets, user],
  );

  const cancelTicket = useCallback(
    async (ticketId: string) => {
      const ticket = tickets.find((item) => item.id === ticketId);
      const next = tickets.filter((item) => item.id !== ticketId);
      setTickets(next);
      await writeJson(scopedKey('nightguide:tickets', scope), next);
      if (ticket && user && supabase && isUuid(ticket.eventId)) {
        const queuedAction = {
          type: 'ticket_cancelled' as const,
          userId: user.id,
          entityId: ticket.eventId,
          payload: { ticketId },
        };
        if (!(await isNetworkReachable())) {
          await queueOfflineAction(queuedAction);
          return;
        }
        const { error } = await supabase
          .from('tickets')
          .update({ status: 'cancelled' })
          .eq('user_id', user.id)
          .eq('event_id', ticket.eventId);
        if (error) await queueOfflineAction(queuedAction);
      }
    },
    [scope, tickets, user],
  );

  const addReview = useCallback(
    async (input: Omit<Review, 'id' | 'createdAt'>) => {
      const review: Review = {
        ...input,
        id: reviews.find((item) => item.venueId === input.venueId)?.id ?? `review-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
      };
      const next = [review, ...reviews.filter((item) => item.venueId !== review.venueId)];
      setReviews(next);
      await writeJson(scopedKey('nightguide:reviews', scope), next);
      if (user && supabase && isUuid(review.venueId)) {
        const queuedAction = {
          type: 'review_created' as const,
          userId: user.id,
          entityId: review.venueId,
          payload: { ...review },
        };
        await queueOfflineAction(queuedAction);
        if (await isNetworkReachable()) await syncOfflineActions();
      }
      return review;
    },
    [reviews, scope, user],
  );

  const value = useMemo<UserDataContextValue>(
    () => ({ ready, favoriteIds, tickets, reviews, toggleFavorite, createTicket, cancelTicket, addReview }),
    [addReview, cancelTicket, createTicket, favoriteIds, ready, reviews, tickets, toggleFavorite],
  );

  return <UserDataContext.Provider value={value}>{children}</UserDataContext.Provider>;
}

export function useUserData() {
  const context = useContext(UserDataContext);
  if (!context) throw new Error('useUserData deve ser usado dentro de UserDataProvider.');
  return context;
}
