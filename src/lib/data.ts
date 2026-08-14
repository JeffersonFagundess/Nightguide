import { fallbackEvents, fallbackVenues } from "@/lib/mock-data";
import type { FeaturedEvent, Venue } from "@/lib/types";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function getHomeData(): Promise<{ events: FeaturedEvent[]; venues: Venue[] }> {
  if (!hasSupabaseEnv()) {
    return { events: fallbackEvents, venues: fallbackVenues };
  }

  try {
    const supabase = await createClient();

    const [eventsResult, venuesResult] = await Promise.all([
      supabase
        .from("events")
        .select("id,title,starts_at,price,genre,cover_url,description,venues(name)")
        .eq("is_featured", true)
        .order("starts_at", { ascending: true })
        .limit(6),
      supabase
        .from("venues")
        .select("id,name,category,address,latitude,longitude,rating")
        .eq("is_published", true)
        .limit(20),
    ]);

    const events =
      eventsResult.data?.map((event) => {
        const row = event as {
          id: string;
          title: string;
          starts_at: string;
          price: number | string | null;
          genre: string | null;
          cover_url: string | null;
          description: string | null;
          venues: { name: string } | { name: string }[] | null;
        };
        const startsAt = new Date(row.starts_at);
        const venue = Array.isArray(row.venues) ? row.venues[0]?.name : row.venues?.name;

        return {
          id: row.id,
          title: row.title,
          venue: venue ?? "Local a confirmar",
          date: startsAt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
          time: startsAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          genre: row.genre ?? "Evento",
          price: Number(row.price) > 0 ? `R$ ${Number(row.price).toFixed(0)}` : "Grátis",
          image: row.cover_url ?? fallbackEvents[0].image,
          highlight: row.description ?? "Evento em destaque no NightGuide.",
          mood: row.genre ?? "Ao vivo",
          distance: "Saquarema",
        } satisfies FeaturedEvent;
      }) ?? [];

    const venues =
      venuesResult.data?.flatMap((venue) => {
        if (venue.latitude == null || venue.longitude == null) {
          return [];
        }

        return {
          id: venue.id,
          name: venue.name,
          category: venue.category ?? "Bar e evento",
          rating: Number(venue.rating ?? 0),
          latitude: Number(venue.latitude),
          longitude: Number(venue.longitude),
          address: venue.address ?? "Saquarema",
          vibe: venue.category ?? "Noite local",
        } satisfies Venue;
      }) ?? [];

    return {
      events: events.length ? events : fallbackEvents,
      venues: venues.length ? venues : fallbackVenues,
    };
  } catch {
    return { events: fallbackEvents, venues: fallbackVenues };
  }
}
