/* eslint-disable no-restricted-globals */
/**
 * DuoDay service worker.
 *
 * Responsibilities:
 *  - cache the app shell so the app opens instantly and survives a flaky network
 *  - serve hashed build assets cache-first (they are immutable)
 *  - keep the API and OAuth routes completely untouched (never cached)
 *
 * The worker is intentionally self-contained: it detects the Vite dev server at
 * runtime and stays completely transparent there, so HMR keeps working. This is
 * more robust than relying on build-time flags such as `import.meta.env.DEV`.
 */

const VERSION = "v1";
const SHELL_CACHE = `duoday-shell-${VERSION}`;
const ASSET_CACHE = `duoday-assets-${VERSION}`;

const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/favicon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];

/** Hashed build output — only produced by `vite build`. */
const BUILD_ASSET_PREFIX = "/assets/";
/** Markers that only ever appear in the Vite dev server response. */
const DEV_URL_PREFIXES = ["/@", "/src/", "/node_modules/", "/__vite"];
const DEV_QUERY_KEYS = ["import", "t", "v", "html-proxy", "direct"];

const isDevRequest = (url) => {
  if (DEV_URL_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    return true;
  }
  // Hashed build output never carries a query string, so query flags only
  // matter for the dev server's module graph.
  if (url.pathname.startsWith(BUILD_ASSET_PREFIX)) return false;
  return DEV_QUERY_KEYS.some((key) => url.searchParams.has(key));
};

/**
 * The production shell references hashed assets under /assets/, while the dev
 * server injects /@vite/client. Only the production shell is worth caching.
 */
const isProductionShell = async (response) => {
  try {
    const html = await response.clone().text();
    return html.includes(BUILD_ASSET_PREFIX) && !html.includes("/@vite/client");
  } catch {
    return false;
  }
};

const isCacheableAsset = (url) =>
  url.pathname.startsWith(BUILD_ASSET_PREFIX) ||
  url.pathname.startsWith("/icons/") ||
  url.pathname === "/favicon.svg";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== ASSET_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Only same-origin requests are handled.
  if (url.origin !== self.location.origin) return;

  // The API (tRPC), OAuth callbacks and storage proxy must never be cached or
  // replayed — they are always live.
  if (url.pathname.startsWith("/api/")) return;

  // Navigations: network first (so users always get fresh code) with the
  // cached production shell as an offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            // The clone has to happen before the body is handed to the page.
            const copy = response.clone();
            if (await isProductionShell(copy)) {
              event.waitUntil(
                caches
                  .open(SHELL_CACHE)
                  .then((cache) => cache.put("/index.html", copy)),
              );
            }
          }
          return response;
        } catch {
          const cached = await caches.match("/index.html");
          return (
            cached ||
            new Response("DuoDay is offline and nothing is cached yet.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  // Dev server assets are always fetched live.
  if (isDevRequest(url)) return;

  // Static assets: cache first, refresh in the background.
  if (isCacheableAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);

        const network = (async () => {
          try {
            const response = await fetch(request);
            if (response && response.ok && response.type !== "opaque") {
              // Clone before the body is consumed by the page, otherwise the
              // cache write fails with "Response body is already used".
              const copy = response.clone();
              const cache = await caches.open(ASSET_CACHE);
              await cache.put(request, copy);
            }
            return response;
          } catch {
            return undefined;
          }
        })();

        if (cached) {
          // Stale-while-revalidate: serve instantly, refresh for next time.
          event.waitUntil(network.catch(() => undefined));
          return cached;
        }

        const fresh = await network;
        return (
          fresh ||
          new Response("", { status: 504, statusText: "Gateway Timeout" })
        );
      })(),
    );
  }
});
