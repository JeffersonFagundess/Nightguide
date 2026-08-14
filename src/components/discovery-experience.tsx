"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Heart, Music2, Search, SlidersHorizontal, Star, Ticket, X } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Carousel } from "@/components/carousel";
import { VenueMap } from "@/components/venue-map";
import { getClientUserScope, scopedStorageKey } from "@/lib/client-user-scope";
import { localizeEvent, localizeVenue } from "@/lib/event-copy";
import { queueOfflineAction } from "@/lib/offline-sync";
import { copy, usePreferences } from "@/lib/preferences";
import type { FeaturedEvent, Venue } from "@/lib/types";

const filters = ["all", "parties", "food", "live", "comedy", "free", "nearby", "beach"] as const;
type FilterId = (typeof filters)[number];

const collections = [
  { id: "shows", filter: "parties", kind: "shows" },
  { id: "beach", filter: "beach", kind: "beach" },
  { id: "hot", filter: "live", kind: "hot" },
  { id: "free", filter: "free", kind: "free" },
] as const;

type Props = {
  events: FeaturedEvent[];
  venues: Venue[];
};

export function DiscoveryExperience({ events, venues }: Props) {
  const { language } = usePreferences();
  const t = copy[language];
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");
  const [selectedEvent, setSelectedEvent] = useState<FeaturedEvent | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [savedEvents, setSavedEvents] = useState<string[]>([]);
  const [savedEventsKey, setSavedEventsKey] = useState("nightguide-saved-events:guest");

  useEffect(() => {
    let active = true;

    async function loadSavedEvents() {
      const scope = await getClientUserScope();
      const storageKey = scopedStorageKey("nightguide-saved-events", scope.storageScope);
      if (!active) return;

      setSavedEventsKey(storageKey);
      setSavedEvents(JSON.parse(window.localStorage.getItem(storageKey) || "[]") as string[]);
    }

    void loadSavedEvents();
    return () => {
      active = false;
    };
  }, []);

  const visibleEvents = useMemo(() => {
    const term = normalize(query);
    const filtered = events.filter((event) => {
      const text = normalize(
        [event.title, event.venue, event.genre, event.price, event.highlight, event.mood, event.date].join(" "),
      );
      return (!term || text.includes(term)) && filterEvent(event, activeFilter);
    });

    if (activeFilter === "nearby") {
      return [...filtered].sort((a, b) => parseDistance(a.distance) - parseDistance(b.distance));
    }

    return filtered;
  }, [activeFilter, events, query]);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleSaved(event: FeaturedEvent) {
    setSavedEvents((current) => {
      const alreadySaved = current.includes(event.id);
      const next = alreadySaved ? current.filter((id) => id !== event.id) : [...current, event.id];
      window.localStorage.setItem(savedEventsKey, JSON.stringify(next));
      void queueOfflineAction({
        type: alreadySaved ? "favorite_removed" : "favorite_added",
        entityType: "event",
        entityId: event.id,
        payload: {
          eventId: event.id,
          title: event.title,
          venue: event.venue,
          price: event.price,
          date: event.date,
          time: event.time,
        },
      });
      return next;
    });
  }

  return (
    <>
      <section className="surface-grid border-b border-white/[0.08]">
        {visibleEvents.length ? (
          <Carousel events={visibleEvents} onEventSelect={setSelectedEvent} />
        ) : (
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <EmptyState copyText={t.home} onClear={() => clearFilters(setActiveFilter, setQuery)} />
          </div>
        )}

        <div className="mx-auto w-full max-w-7xl px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-3 rounded-[8px] border border-white/[0.1] bg-[#11100d]/86 p-2 shadow-2xl shadow-black/20 backdrop-blur lg:grid-cols-[minmax(0,1fr)_auto]"
          >
            <label className="flex min-h-[52px] items-center gap-3 rounded-[6px] bg-black/22 px-4 text-[color:var(--muted)]">
              <Search size={20} aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full bg-transparent text-[color:var(--foreground)] outline-none placeholder:text-[color:var(--muted)]"
                placeholder={t.home.searchPlaceholder}
                type="search"
              />
            </label>
            <button className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[6px] bg-[color:var(--accent)] px-5 font-semibold text-[color:var(--ink)] transition hover:bg-[color:var(--accent-strong)]">
              <SlidersHorizontal size={18} aria-hidden />
              {t.home.searchButton}
            </button>
          </form>

          <div className="edge-fade mt-4 flex gap-2 overflow-x-auto px-4 pb-2">
            {filters.map((filter) => {
              const active = activeFilter === filter;
              return (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition ${
                    active
                      ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--ink)]"
                      : "border-white/10 bg-white/[0.04] text-[color:var(--foreground)] hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                  }`}
                >
                  {t.filters[filter]}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">{t.home.explore}</p>
            <h2 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">{t.home.collectionsTitle}</h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {collections.map((collection) => {
            const [title, text] = t.collections[collection.id];
            return (
              <button
                key={collection.id}
                onClick={() => {
                  setActiveFilter(collection.filter);
                  document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="rounded-[8px] border border-white/[0.1] bg-[color:var(--panel)] p-5 text-left transition hover:-translate-y-1 hover:border-[color:var(--accent)]/70"
              >
                <CollectionIcon kind={collection.kind} />
                <h3 className="mt-5 text-xl font-semibold text-[color:var(--foreground)]">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{text}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section id="eventos" className="mx-auto w-full max-w-7xl scroll-mt-24 px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-semibold text-[color:var(--foreground)]">{t.home.eventsTitle}</h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              {visibleEvents.length} {visibleEvents.length === 1 ? t.home.result : t.home.results}
              {activeFilter !== "all" ? ` ${t.home.inFilter} ${t.filters[activeFilter]}` : ""}
            </p>
          </div>
          <a className="text-sm font-semibold text-[color:var(--accent)]" href="#mapa">
            {t.home.viewMap}
          </a>
        </div>

        {visibleEvents.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visibleEvents.map((event) => (
              <EventCard
                key={event.id}
                event={localizeEvent(event, language)}
                labels={t.cards}
                saved={savedEvents.includes(event.id)}
                onOpen={() => setSelectedEvent(event)}
                onSave={() => toggleSaved(event)}
              />
            ))}
          </div>
        ) : (
          <EmptyState copyText={t.home} onClear={() => clearFilters(setActiveFilter, setQuery)} />
        )}
      </section>

      <section id="mapa" className="border-y border-white/[0.08] bg-[#151210]">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:px-8">
          <div className="lg:pr-2">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">{t.home.mapEyebrow}</p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight text-[color:var(--foreground)]">{t.home.mapTitle}</h2>
            <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">{t.home.mapText}</p>
            <div className="mt-6 grid max-h-[360px] gap-3 overflow-y-auto pr-1">
              {venues.map((venue) => {
                const venueCopy = localizeVenue(venue, language);
                return (
                <button
                  key={venue.id}
                  onClick={() => setSelectedVenue(venueCopy)}
                  className="group rounded-[8px] border border-white/[0.1] bg-white/[0.04] p-4 text-left transition hover:border-[color:var(--accent)]/60 hover:bg-white/[0.07]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-[color:var(--foreground)]">{venueCopy.name}</h3>
                    <span className="inline-flex items-center gap-1 text-sm font-semibold text-[color:var(--amber)]">
                      <Star size={15} aria-hidden />
                      {venueCopy.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">{venueCopy.vibe}</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--accent)] opacity-0 transition group-hover:opacity-100">
                    Ver detalhes
                  </p>
                </button>
                );
              })}
            </div>
          </div>
          <VenueMap venues={venues} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-8 rounded-[8px] border border-white/[0.1] bg-[color:var(--panel)] p-5 sm:p-7 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">{t.home.guideEyebrow}</p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight text-[color:var(--foreground)]">{t.home.guideTitle}</h2>
            <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">{t.home.guideText}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <FeatureCard icon={<CalendarDays size={22} aria-hidden />} title={t.cards.agenda} text={t.cards.agendaText} />
            <FeatureCard icon={<Music2 size={22} aria-hidden />} title={t.cards.vibe} text={t.cards.vibeText} />
            <FeatureCard icon={<Heart size={22} aria-hidden />} title={t.cards.favorites} text={t.cards.favoritesText} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <a
            href="/conta"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[6px] bg-[color:var(--accent)] px-5 font-semibold text-[color:var(--ink)] shadow-[0_14px_36px_rgba(255,119,92,0.24)] transition hover:bg-[color:var(--accent-strong)]"
          >
            {t.home.routeCta}
            <BrandMark className="h-5 w-5" />
          </a>
        </div>
      </section>

      {selectedEvent ? (
        <EventDetails
          event={localizeEvent(selectedEvent, language)}
          labels={t.modal}
          saved={savedEvents.includes(selectedEvent.id)}
          onSave={() => toggleSaved(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
        />
      ) : null}

      {selectedVenue ? (
        <VenueDetails venue={localizeVenue(selectedVenue, language)} labels={t.modal} onClose={() => setSelectedVenue(null)} />
      ) : null}
    </>
  );
}

function EventCard({
  event,
  labels,
  saved,
  onOpen,
  onSave,
}: {
  event: FeaturedEvent;
  labels: (typeof copy)["pt"]["cards"];
  saved: boolean;
  onOpen: () => void;
  onSave: () => void;
}) {
  return (
    <article className="group overflow-hidden rounded-[8px] border border-white/[0.1] bg-[color:var(--panel)] transition hover:-translate-y-1 hover:border-[color:var(--accent)]/60">
      <button className="block w-full text-left" onClick={onOpen}>
        <div
          className="h-48 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]"
          style={{ backgroundImage: `url(${event.image})` }}
        />
      </button>
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3 text-sm text-[color:var(--muted)]">
          <span className="inline-flex items-center gap-2">
            <CalendarDays size={15} aria-hidden />
            {event.date} · {event.time}
          </span>
          <span className="font-semibold text-[color:var(--accent)]">{event.price}</span>
        </div>
        <button className="text-left" onClick={onOpen}>
          <h2 className="text-xl font-semibold text-[color:var(--foreground)] transition group-hover:text-[color:var(--accent)]">
            {event.title}
          </h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">{event.venue}</p>
        </button>
        <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
          <button
            onClick={onOpen}
            className="min-h-10 rounded-[6px] bg-white/[0.06] px-3 text-sm font-semibold text-[color:var(--foreground)] transition hover:bg-white/[0.12]"
          >
            {labels.details}
          </button>
          <button
            onClick={onSave}
            className={`grid h-10 w-10 place-items-center rounded-[6px] border transition ${
              saved
                ? "border-[color:var(--accent)] bg-[color:var(--accent)] text-[color:var(--ink)]"
                : "border-white/10 text-[color:var(--foreground)] hover:border-[color:var(--accent)]"
            }`}
            aria-label={saved ? labels.remove : labels.save}
          >
            <Heart size={18} fill={saved ? "currentColor" : "none"} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}

function EventDetails({
  event,
  labels,
  saved,
  onSave,
  onClose,
}: {
  event: FeaturedEvent;
  labels: (typeof copy)["pt"]["modal"];
  saved: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center sm:p-6">
      <article className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[8px] border border-white/10 bg-[color:var(--panel)] shadow-2xl shadow-black/50">
        <div
          className="relative h-48 bg-cover bg-center sm:h-60"
          data-image-surface
          style={{ backgroundImage: `url(${event.image})` }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(12,10,9,0.9)_0%,rgba(12,10,9,0.38)_42%,rgba(12,10,9,0.18)_100%)]" />
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-[6px] bg-[#11100f]/72 text-white shadow-lg shadow-black/30 backdrop-blur transition hover:bg-[#11100f]/90"
            aria-label={labels.closeDetails}
          >
            <X size={20} aria-hidden />
          </button>
          <div className="absolute bottom-5 left-5 right-5">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">{event.genre}</p>
            <h2 className="mt-2 text-4xl font-semibold leading-tight text-white sm:text-5xl">{event.title}</h2>
          </div>
        </div>

        <div className="max-h-[calc(92vh-12rem)] overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Detail label={labels.when} value={`${event.date} às ${event.time}`} />
            <Detail label={labels.venue} value={event.venue} />
            <Detail label={labels.mood} value={event.mood} />
            <Detail label={labels.distance} value={event.distance} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="rounded-[8px] border border-white/10 bg-white/[0.035] p-5">
              <h3 className="text-xl font-semibold text-[color:var(--foreground)]">{labels.description}</h3>
              <p className="mt-3 leading-7 text-[color:var(--muted)]">
                {event.highlight} {labels.extraDescription}
              </p>
            </section>

            <aside className="rounded-[8px] border border-white/10 bg-white/[0.035] p-5">
              <p className="text-sm text-[color:var(--muted)]">{labels.entry}</p>
              <strong className="mt-1 block text-3xl text-[color:var(--foreground)]">{event.price}</strong>
              <a
                href={`/ingressos/${event.id}`}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-[color:var(--accent)] px-4 font-semibold text-[color:var(--ink)] transition hover:bg-[color:var(--accent-strong)]"
              >
                <Ticket size={18} aria-hidden />
                {labels.want}
              </a>
              <button
                onClick={onSave}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[6px] border border-white/10 px-4 font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
              >
                <Heart size={18} fill={saved ? "currentColor" : "none"} aria-hidden />
                {saved ? labels.saved : labels.save}
              </button>
            </aside>
          </div>
        </div>
      </article>
    </div>
  );
}

function VenueDetails({ venue, labels, onClose }: { venue: Venue; labels: (typeof copy)["pt"]["modal"]; onClose: () => void }) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-end bg-black/70 p-3 backdrop-blur-sm sm:place-items-center sm:p-6">
      <article className="w-full max-w-xl rounded-[8px] border border-white/10 bg-[color:var(--panel)] p-5 shadow-2xl shadow-black/50">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">{venue.category}</p>
            <h2 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">{venue.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid h-10 w-10 place-items-center rounded-[6px] bg-white/[0.06] text-[color:var(--foreground)] transition hover:bg-white/[0.12]"
            aria-label={labels.closeVenue}
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <p className="mt-4 leading-7 text-[color:var(--muted)]">
          {venue.vibe}. {labels.venueText}
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Detail label={labels.address} value={venue.address} />
          <Detail label={labels.rating} value={`${venue.rating.toFixed(1)} ${labels.stars}`} />
        </div>
      </article>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">{label}</p>
      <p className="mt-1 font-semibold text-[color:var(--foreground)]">{value}</p>
    </div>
  );
}

function EmptyState({ copyText, onClear }: { copyText: (typeof copy)["pt"]["home"]; onClear: () => void }) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-[color:var(--panel)] p-8 text-center">
      <h3 className="text-2xl font-semibold text-[color:var(--foreground)]">{copyText.emptyTitle}</h3>
      <p className="mt-2 text-sm text-[color:var(--muted)]">{copyText.emptyText}</p>
      <button
        onClick={onClear}
        className="mt-5 min-h-11 rounded-[6px] bg-[color:var(--accent)] px-5 font-semibold text-[color:var(--ink)]"
      >
        {copyText.clearFilters}
      </button>
    </div>
  );
}

function FeatureCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <article className="group relative overflow-hidden rounded-[8px] border border-white/[0.1] bg-[linear-gradient(145deg,rgba(255,255,255,0.075),rgba(255,255,255,0.025))] p-4 transition hover:-translate-y-1 hover:border-[color:var(--accent)]/55 hover:shadow-2xl hover:shadow-black/20">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--accent)]/55 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-[10px] border border-[color:var(--accent)]/20 bg-[color:var(--panel-strong)] text-[color:var(--accent)] shadow-[0_18px_40px_rgba(255,119,92,0.14)] transition group-hover:scale-105 group-hover:bg-[color:var(--accent)] group-hover:text-[color:var(--ink)]">
        <span className="grid h-7 w-7 place-items-center">{icon}</span>
      </div>
      <h3 className="text-base font-semibold text-[color:var(--foreground)]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{text}</p>
      <span className="mt-4 block h-1 w-10 rounded-full bg-[color:var(--accent)]/55 transition group-hover:w-16 group-hover:bg-[color:var(--accent)]" />
    </article>
  );
}

function CollectionIcon({ kind }: { kind: string }) {
  return (
    <span className="relative grid h-13 w-13 place-items-center rounded-[12px] border border-white/10 bg-[color:var(--panel-strong)] text-[color:var(--accent)] shadow-[0_18px_38px_rgba(0,0,0,0.25)]">
      <span className="absolute inset-1 rounded-[10px] bg-[radial-gradient(circle_at_35%_25%,rgba(255,119,92,0.34),transparent_58%)]" />
      <svg className="relative h-7 w-7" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        {kind === "shows" ? (
          <>
            <path d="M7 21V9l12-2v12" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M7 21a3.5 3.5 0 1 0 0 .1M19 19a3.5 3.5 0 1 0 0 .1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M22.5 8.5h3M24 7v3" stroke="#FFD166" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : null}
        {kind === "beach" ? (
          <>
            <path d="M7 20c3.3 0 3.3-2 6.6-2s3.3 2 6.7 2S23.6 18 27 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M7 25c3.3 0 3.3-2 6.6-2s3.3 2 6.7 2S23.6 23 27 23" stroke="#FFD166" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M18 6 9 16h18L18 6Z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
          </>
        ) : null}
        {kind === "hot" ? (
          <>
            <path d="M17.2 5c.6 4.6-5.5 5.8-5.5 12a6 6 0 0 0 12 0c0-3.6-2.7-5.8-4.4-7.8-.8 2.5-3.4 3.3-3.4 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 7.5 7.5 10M25 6l-1.5 3M26 24l-3-1" stroke="#FFD166" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : null}
        {kind === "free" ? (
          <>
            <path d="M8 11.5h16v4a3 3 0 0 0 0 6v4H8v-4a3 3 0 0 0 0-6v-4Z" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
            <path d="M14 18.5h4.5M14 15.5h7" stroke="#FFD166" strokeWidth="2.2" strokeLinecap="round" />
          </>
        ) : null}
      </svg>
    </span>
  );
}

function filterEvent(event: FeaturedEvent, filter: FilterId) {
  const text = normalize([event.title, event.venue, event.genre, event.price, event.mood, event.highlight].join(" "));

  if (filter === "all") return true;
  if (filter === "parties") return /(dj|show|rock|eletronica|samba|forro|sunset|pista|house)/.test(text);
  if (filter === "food") return /(gastro|drinks|brunch|jantar|menu|bar)/.test(text);
  if (filter === "live") return /(ao vivo|samba|forro|rock|jazz|open mic)/.test(text);
  if (filter === "comedy") return /(stand-up|comedy|humor)/.test(text);
  if (filter === "free") return normalize(event.price).includes("gratis");
  if (filter === "nearby") return true;
  if (filter === "beach") return /(praia|orla|itauna|mar|sunset)/.test(text);

  return true;
}

function parseDistance(distance: string) {
  const normalized = distance.replace(",", ".").toLowerCase();
  const value = Number.parseFloat(normalized);
  if (Number.isNaN(value)) return 999;
  return normalized.includes("km") ? value : value / 1000;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function clearFilters(setActiveFilter: (filter: FilterId) => void, setQuery: (query: string) => void) {
  setActiveFilter("all");
  setQuery("");
}
