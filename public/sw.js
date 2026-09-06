const CACHE_NAME = "nightguide-v6";
const STATIC_ASSETS = [
  "/",
  "/login",
  "/minha-conta",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/events/rock-lagoon-real.jpg",
  "/events/samba-da-vila-real.jpg",
  "/events/trio-forro-834x298.jpeg",
  "/carousel-source-images/01-sunset-beats.jpg",
  "/carousel-source-images/02-samba-da-vila.jpg",
  "/carousel-source-images/03-karaoke-night.jpg",
  "/carousel-source-images/04-forro-na-orla.jpeg",
  "/carousel-source-images/05-rock-lagoon.jpg",
  "/carousel-source-images/06-brunch-sunset.jpg",
  "/carousel-source-images/07-open-decks.jpg",
  "/carousel-source-images/08-comedy-drinks.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const url = new URL(event.request.url);

  if (event.request.destination === "image" || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/events/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return (
          cached ||
          fetch(event.request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return response;
          })
        );
      }),
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then((response) => response || caches.match("/"))),
  );
});
