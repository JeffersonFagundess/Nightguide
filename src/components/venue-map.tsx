"use client";

import dynamic from "next/dynamic";
import type { Venue } from "@/lib/types";

const VenueMapInner = dynamic(() => import("@/components/venue-map-inner").then((mod) => mod.VenueMapInner), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[340px] place-items-center rounded-[8px] border border-white/10 bg-[color:var(--panel)] text-[color:var(--muted)]">
      Carregando mapa...
    </div>
  ),
});

export function VenueMap({ venues }: { venues: Venue[] }) {
  return <VenueMapInner venues={venues} />;
}
