import type { LanguagePreference } from "@/lib/preferences";
import type { FeaturedEvent, Venue } from "@/lib/types";

const englishEvents: Record<string, Partial<FeaturedEvent>> = {
  "sunset-beats": {
    date: "Friday",
    genre: "House and Brazilian grooves",
    highlight: "Guest DJ, ocean view and group combo.",
    mood: "High energy",
  },
  "samba-da-vila": {
    date: "Saturday",
    genre: "Samba and pagode",
    price: "Free",
    highlight: "Shared tables, signature drinks and friendly guest list.",
    mood: "Packed roda",
  },
  "karaoke-night": {
    date: "Sunday",
    genre: "Open mic",
    highlight: "Night ranking, giveaways and an open stage.",
    mood: "Light and social",
  },
  "forro-na-orla": {
    date: "Thursday",
    genre: "Forro and xote",
    highlight: "Open class early in the night and free dance floor until late.",
    mood: "Danceable",
  },
  "rock-lagoon": {
    date: "Saturday",
    genre: "Live rock",
    highlight: "Local bands, craft beer and outdoor area by the lagoon.",
    mood: "Live",
  },
  "brunch-sunset": {
    date: "Sunday",
    genre: "Sunset and jazz",
    highlight: "Late afternoon with a special menu, jazz and panoramic view.",
    mood: "Chill",
  },
  "open-decks": {
    date: "Friday",
    genre: "Electronic",
    highlight: "Rotating lineup with regional DJs and a dance floor until late.",
    mood: "Full dance floor",
  },
  "comedy-drinks": {
    date: "Tuesday",
    genre: "Stand-up",
    highlight: "Comedy night with a signature drinks menu.",
    mood: "Easygoing",
  },
};

export function localizeEvent(event: FeaturedEvent, language: LanguagePreference) {
  if (language === "pt") return event;
  return { ...event, ...englishEvents[event.id] };
}

const englishVenues: Record<string, Partial<Venue>> = {
  maralto: {
    category: "Beach and music",
    vibe: "View, music and groups",
  },
  "vila-gastrobar": {
    category: "Bar and food",
    vibe: "Drinks, samba and dinner",
  },
  "lagoa-lounge": {
    category: "Lounge and drinks",
    vibe: "Lounge, karaoke and meetups",
  },
  "deck-itauna": {
    category: "Dance and beach",
    vibe: "Forro, open dance floor and seafront",
  },
  "wave-club": {
    category: "Club and DJs",
    vibe: "Electronic music, dance floor and late night",
  },
};

export function localizeVenue(venue: Venue, language: LanguagePreference) {
  if (language === "pt") return venue;
  return { ...venue, ...englishVenues[venue.id] };
}
