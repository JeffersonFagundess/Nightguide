import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { fallbackEvents, fallbackVenues } from '@/src/data/fallback';
import { supabase } from '@/src/lib/supabase';
import type { NightEvent, Venue } from '@/src/types';

const cacheKey = 'nightguide:home-cache:v1';

type HomeCache = { events: NightEvent[]; venues: Venue[] };
type DataContextValue = HomeCache & {
  loading: boolean;
  refreshing: boolean;
  source: 'supabase' | 'cache' | 'demo';
  refresh: () => Promise<void>;
  getEvent: (id: string) => NightEvent | undefined;
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: PropsWithChildren) {
  const [events, setEvents] = useState<NightEvent[]>(fallbackEvents);
  const [venues, setVenues] = useState<Venue[]>(fallbackVenues);
  const [source, setSource] = useState<DataContextValue['source']>('demo');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (!supabase) {
        setEvents(fallbackEvents);
        setVenues(fallbackVenues);
        setSource('demo');
        return;
      }

      const [eventsResult, venuesResult] = await Promise.all([
        supabase
          .from('events')
          .select('id,venue_id,title,description,starts_at,cover_url,price,genre,mood,venues(name,latitude,longitude)')
          .eq('status', 'published')
          .order('starts_at', { ascending: true })
          .limit(50),
        supabase
          .from('venues')
          .select('id,name,category,rating,latitude,longitude,address,description,cover_url')
          .eq('is_published', true)
          .limit(50),
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (venuesResult.error) throw venuesResult.error;

      const nextEvents = (eventsResult.data || []).map(mapEvent).filter((event): event is NightEvent => Boolean(event));
      const nextVenues = (venuesResult.data || []).map(mapVenue).filter((venue): venue is Venue => Boolean(venue));
      const data = {
        events: nextEvents.length ? nextEvents : fallbackEvents,
        venues: nextVenues.length ? nextVenues : fallbackVenues,
      };
      setEvents(data.events);
      setVenues(data.venues);
      setSource(nextEvents.length || nextVenues.length ? 'supabase' : 'demo');
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    } catch {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached) as HomeCache;
        setEvents(data.events);
        setVenues(data.venues);
        setSource('cache');
      } else {
        setEvents(fallbackEvents);
        setVenues(fallbackVenues);
        setSource('demo');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<DataContextValue>(
    () => ({ events, venues, loading, refreshing, source, refresh, getEvent: (id) => events.find((event) => event.id === id) }),
    [events, loading, refresh, refreshing, source, venues],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useNightData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useNightData deve ser usado dentro de DataProvider.');
  return context;
}

function mapEvent(row: Record<string, unknown>): NightEvent | null {
  if (!row.id || !row.title || !row.starts_at) return null;
  const venueRelation = Array.isArray(row.venues) ? row.venues[0] : row.venues;
  const venue = (venueRelation || {}) as Record<string, unknown>;
  const startsAt = new Date(String(row.starts_at));
  const price = Number(row.price || 0);

  return {
    id: String(row.id),
    venueId: row.venue_id ? String(row.venue_id) : undefined,
    title: String(row.title),
    venue: String(venue.name || 'Local a confirmar'),
    date: startsAt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }),
    time: startsAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    startsAt: startsAt.toISOString(),
    genre: String(row.genre || 'Evento'),
    price: price > 0 ? `R$ ${price.toFixed(0)}` : 'Grátis',
    image: String(row.cover_url || fallbackEvents[0].image),
    highlight: String(row.description || 'Evento em destaque no NightGuide.'),
    mood: String(row.mood || row.genre || 'Ao vivo'),
    distance: 'Saquarema',
    latitude: venue.latitude == null ? undefined : Number(venue.latitude),
    longitude: venue.longitude == null ? undefined : Number(venue.longitude),
  };
}

function mapVenue(row: Record<string, unknown>): Venue | null {
  if (!row.id || !row.name || row.latitude == null || row.longitude == null) return null;
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category || 'Bar e evento'),
    rating: Number(row.rating || 0),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    address: String(row.address || 'Saquarema'),
    vibe: String(row.description || row.category || 'Noite local'),
    coverUrl: row.cover_url ? String(row.cover_url) : undefined,
  };
}
