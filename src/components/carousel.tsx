"use client";

import Image from "next/image";
import { ArrowUpRight, Calendar, ChevronLeft, ChevronRight, MapPin, Music2, Ticket } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { localizeEvent } from "@/lib/event-copy";
import { copy, usePreferences } from "@/lib/preferences";
import type { FeaturedEvent } from "@/lib/types";

export function Carousel({
  events,
  onEventSelect,
}: {
  events: FeaturedEvent[];
  onEventSelect: (event: FeaturedEvent) => void;
}) {
  const { language } = usePreferences();
  const t = copy[language].carousel;
  const [activeIndex, setActiveIndex] = useState(0);
  const count = events.length;
  const currentIndex = count ? activeIndex % count : 0;
  const active = events[currentIndex] ?? events[0];
  const eventCopy = active ? localizeEvent(active, language) : active;

  const next = () => setActiveIndex((index) => (index + 1) % Math.max(count, 1));
  const previous = () => setActiveIndex((index) => (index - 1 + count) % Math.max(count, 1));
  const progress = useMemo(() => `${((currentIndex + 1) / count) * 100}%`, [currentIndex, count]);

  useEffect(() => {
    if (count <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % count);
    }, 4800);

    return () => window.clearInterval(timer);
  }, [count]);

  if (!active || !eventCopy) return null;

  return (
    <section
      id="destaques"
      className="relative min-h-[760px] overflow-hidden border-y border-white/[0.1] bg-[color:var(--panel)] shadow-2xl shadow-black/35 sm:min-h-[800px] md:min-h-[820px] xl:min-h-[calc(100vh-92px)] xl:[min-height:max(820px,calc(100vh-92px))]"
      aria-label={t.featured}
    >
      <Image
        key={`${active.id}-backdrop`}
        src={active.image}
        alt=""
        fill
        className="scale-110 object-cover opacity-40 blur-2xl"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-black/45" />
      {active.video ? (
        <video
          key={active.video}
          className="carousel-hero-media carousel-ken-burns absolute inset-0 h-full w-full"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={active.image}
          aria-label={active.title}
        >
          <source src={active.video} type="video/mp4" />
        </video>
      ) : (
        <Image
          key={active.id}
          src={active.image}
          alt={active.title}
          fill
          className="carousel-hero-media carousel-ken-burns"
          priority
          sizes="100vw"
        />
      )}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,119,92,0.2),transparent_28%),linear-gradient(90deg,rgba(8,8,7,0.96)_0%,rgba(8,8,7,0.66)_34%,rgba(8,8,7,0.18)_76%),linear-gradient(0deg,rgba(8,8,7,0.98)_0%,rgba(8,8,7,0)_46%)]" />

      <div
        className="absolute left-4 right-4 top-4 max-w-sm rounded-[8px] border border-white/[0.06] bg-gradient-to-br from-black/30 via-black/16 to-transparent p-3 shadow-2xl shadow-black/10 backdrop-blur-[2px] sm:left-6 sm:right-auto sm:top-6 sm:p-4"
        data-image-surface
      >
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)] sm:text-xs sm:tracking-[0.22em]">{t.eyebrow}</p>
        <h1 className="mt-2 text-[1.65rem] font-semibold leading-tight text-white sm:text-3xl md:text-4xl">{t.headline}</h1>
        <p className="mt-2 text-sm leading-6 text-white/72">{t.description}</p>
      </div>

      <div className="absolute right-4 top-4 hidden w-24 gap-2 sm:right-6 sm:top-6 xl:grid">
        {events.slice(0, 4).map((event, index) => (
          <button
            key={event.id}
            onClick={() => setActiveIndex(index)}
            className={`relative h-14 overflow-hidden rounded-[8px] border transition ${
              index === currentIndex
                ? "border-[color:var(--accent)] opacity-100"
                : "border-white/15 opacity-60 hover:opacity-100"
            }`}
            aria-label={`${t.select} ${event.title}`}
          >
            <Image src={event.image} alt="" fill className="object-cover" sizes="112px" />
          </button>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0 p-4 sm:translate-y-2 sm:p-5 lg:translate-y-4 lg:p-6">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
          <div className="max-w-3xl" data-image-surface>
            <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)] sm:mb-3 sm:text-sm sm:tracking-[0.24em]">
              {t.featured}
            </p>
            <div className="mb-3 flex flex-wrap gap-2 sm:mb-4">
              <Badge icon={<Calendar size={15} aria-hidden />} text={`${eventCopy.date} · ${eventCopy.time}`} />
              <Badge icon={<Music2 size={15} aria-hidden />} text={eventCopy.genre} />
            </div>
            <h2 className="max-w-4xl text-[2.55rem] font-semibold leading-[0.95] tracking-normal text-white sm:text-5xl md:text-6xl lg:text-7xl">
              {active.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/78 sm:mt-4 sm:text-base sm:leading-7 lg:text-lg">{eventCopy.highlight}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm sm:mt-5 sm:gap-3">
              <Pill label={active.venue} icon={<MapPin size={16} aria-hidden />} />
              <Pill label={eventCopy.mood} />
              <Pill label={eventCopy.distance} />
            </div>
          </div>

          <div className="grid gap-3 rounded-[8px] border border-white/10 bg-[#0b0b09]/82 p-3 backdrop-blur-md sm:p-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-sm text-[color:var(--muted)]">{t.entry}</span>
              <strong className="text-xl text-[color:var(--foreground)] sm:text-2xl">{eventCopy.price}</strong>
            </div>
            <button
              onClick={() => onEventSelect(active)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] bg-[color:var(--accent)] px-4 text-sm font-semibold text-[color:var(--ink)] transition hover:bg-[color:var(--accent-strong)] sm:min-h-12 sm:px-5 sm:text-base"
            >
              <Ticket size={18} aria-hidden />
              {t.details}
              <ArrowUpRight size={18} aria-hidden />
            </button>
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 pt-1">
              <button
                className="grid h-11 w-11 place-items-center rounded-[6px] border border-white/10 text-[color:var(--foreground)] transition hover:bg-white/10"
                onClick={previous}
                aria-label={t.previous}
              >
                <ChevronLeft size={20} aria-hidden />
              </button>
              <div className="h-1 overflow-hidden rounded-full bg-white/12">
                <div className="h-full rounded-full bg-[color:var(--accent)] transition-all" style={{ width: progress }} />
              </div>
              <button
                className="grid h-11 w-11 place-items-center rounded-[6px] border border-white/10 text-[color:var(--foreground)] transition hover:bg-white/10"
                onClick={next}
                aria-label={t.next}
              >
                <ChevronRight size={20} aria-hidden />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Badge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-white/15 bg-black/62 px-2.5 text-xs font-medium text-white shadow-lg shadow-black/20 backdrop-blur sm:min-h-9 sm:px-3 sm:text-sm">
      {icon}
      {text}
    </span>
  );
}

function Pill({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/12 bg-white/[0.08] px-3 text-sm font-medium text-white backdrop-blur sm:min-h-10 sm:px-4">
      {icon}
      {label}
    </span>
  );
}
