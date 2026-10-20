// Service Worker for Shahkar Marketplace Mobile PWA
const CACHE_NAME = "shahkar-marketplace-v2.4.0";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./app.jsx",
  "./manifest.json",
  "./favicon.ico",
  "https://cdn.tailwindcss.com",
  "https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[ServiceWorker] Pre-caching offline app shell");
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[ServiceWorker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  // Pass API requests directly to network
  if (event.request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request).then((networkResponse) => {
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Fallback response for offline mode
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        })
      );
    })
  );
});

// Push Notification Simulation
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : { title: "بازارگاه شاهکار", body: "سفارش یا پیشنهاد جدید در انتظار شماست!" };
  const options = {
    body: data.body,
    icon: "https://cdn-icons-png.flaticon.com/512/3081/3081559.png",
    badge: "/favicon.ico",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});
