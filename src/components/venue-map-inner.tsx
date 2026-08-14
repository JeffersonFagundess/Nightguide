"use client";

import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { Maximize2, Minus, Navigation, Plus } from "lucide-react";
import { useEffect } from "react";
import L from "leaflet";
import type { Venue } from "@/lib/types";

const icon = L.divIcon({
  className: "",
  html: '<span class="venue-marker"></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

export function VenueMapInner({ venues }: { venues: Venue[] }) {
  const center: [number, number] = venues[0]
    ? [venues[0].latitude, venues[0].longitude]
    : [-22.9296, -42.5103];

  return (
    <div className="relative min-h-[340px] overflow-hidden rounded-[8px] border border-white/10 bg-[color:var(--panel)] shadow-2xl shadow-black/20 lg:min-h-[360px]">
      <MapContainer
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        dragging
        touchZoom
        doubleClickZoom={false}
        zoomControl={false}
        className="h-[340px] w-full lg:h-[360px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {venues.map((venue) => (
          <Marker key={venue.id} position={[venue.latitude, venue.longitude]} icon={icon}>
            <Popup>
              <strong>{venue.name}</strong>
              <br />
              {venue.category}
              <br />
              {venue.address}
            </Popup>
          </Marker>
        ))}
        <ControlledZoom />
      </MapContainer>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />
      <div className="absolute left-4 top-4 rounded-[8px] border border-white/10 bg-[#090908]/78 px-3 py-2 text-xs font-semibold text-white shadow-xl shadow-black/25 backdrop-blur">
        <span className="inline-flex items-center gap-2">
          <Navigation size={14} aria-hidden />
          Arraste para navegar
        </span>
      </div>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${center[0]},${center[1]}`}
        target="_blank"
        rel="noreferrer"
        className="absolute right-4 top-4 inline-flex min-h-9 items-center gap-2 rounded-[7px] border border-white/10 bg-[#090908]/78 px-3 text-xs font-semibold text-white shadow-xl shadow-black/25 backdrop-blur transition hover:border-[color:var(--accent)]"
      >
        <Maximize2 size={14} aria-hidden />
        Abrir mapa
      </a>
      <div className="absolute bottom-4 right-4 grid overflow-hidden rounded-[8px] border border-white/10 bg-[#090908]/82 shadow-xl shadow-black/25 backdrop-blur">
        <button
          id="map-zoom-in"
          className="grid h-10 w-10 place-items-center text-white transition hover:bg-white/10"
          aria-label="Aproximar mapa"
        >
          <Plus size={17} aria-hidden />
        </button>
        <span className="h-px bg-white/10" />
        <button
          id="map-zoom-out"
          className="grid h-10 w-10 place-items-center text-white transition hover:bg-white/10"
          aria-label="Afastar mapa"
        >
          <Minus size={17} aria-hidden />
        </button>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/55 to-transparent" />
    </div>
  );
}

function ControlledZoom() {
  const map = useMap();

  return (
    <>
      <MapButtonBridge id="map-zoom-in" onClick={() => map.zoomIn()} />
      <MapButtonBridge id="map-zoom-out" onClick={() => map.zoomOut()} />
    </>
  );
}

function MapButtonBridge({ id, onClick }: { id: string; onClick: () => void }) {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const button = document.getElementById(id);
      if (button) {
        button.addEventListener("click", onClick);
      }
    });

    return () => {
      window.cancelAnimationFrame(frame);
      document.getElementById(id)?.removeEventListener("click", onClick);
    };
  }, [id, onClick]);

  return null;
}
