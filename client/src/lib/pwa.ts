/**
 * Progressive Web App helpers: service worker registration and install
 * prompt plumbing.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

/** Key used to remember that the user dismissed the install prompt. */
export const INSTALL_DISMISSED_KEY = "duoday-install-dismissed";

/** Guard so an update can only ever reload the page once per session. */
const RELOAD_GUARD_KEY = "duoday-sw-reloaded";

/** True when the page is already running as an installed app. */
export function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    nav.standalone === true
  );
}

/** Safari on iOS has no install API, but supports "Add to Home Screen". */
export function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const isIpadOs = /Macintosh/.test(ua) && "ontouchend" in document;
  return isIos || isIpadOs;
}

/**
 * Registers the service worker that makes the app installable and usable
 * offline. The worker itself detects the Vite dev server at runtime and stays
 * transparent there, so this registration is safe in every environment.
 */
export function registerServiceWorker(): void {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const swUrl = "/sw.js";

  const register = () => {
    // Only reload when a *previous* worker was controlling the page, otherwise
    // the very first registration would trigger a pointless refresh.
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloaded = false;

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloaded) return;
      try {
        if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
        sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
      } catch {
        // sessionStorage unavailable — reload anyway.
      }
      reloaded = true;
      window.location.reload();
    });

    navigator.serviceWorker
      .register(swUrl, { scope: "/" })
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              console.info("[PWA] New content is available — reloading.");
            }
          });
        });
      })
      .catch((error) => {
        console.warn("[PWA] Service worker registration failed:", error);
      });
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}
