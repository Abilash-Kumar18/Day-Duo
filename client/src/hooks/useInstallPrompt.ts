import {
  BeforeInstallPromptEvent,
  INSTALL_DISMISSED_KEY,
  isIosDevice,
  isStandaloneMode,
} from "@/lib/pwa";
import { useCallback, useEffect, useState } from "react";

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

const readDismissed = (): boolean => {
  try {
    return localStorage.getItem(INSTALL_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Tracks the browser's install prompt so the UI can offer an
 * "Install app" action (Chrome / Edge / Android) or the iOS
 * "Add to Home Screen" instructions (Safari).
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState<boolean>(() => isStandaloneMode());
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed());
  const [isIOS, setIsIOS] = useState<boolean>(() => isIosDevice());

  useEffect(() => {
    setIsIOS(isIosDevice());

    const onBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar so we can show our own UI.
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.removeItem(INSTALL_DISMISSED_KEY);
      } catch {
        // ignore storage failures
      }
    };

    const displayQuery = window.matchMedia("(display-mode: standalone)");
    const onDisplayChange = () => setInstalled(isStandaloneMode());

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    displayQuery.addEventListener?.("change", onDisplayChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      displayQuery.removeEventListener?.("change", onDisplayChange);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!deferredPrompt) return "unavailable";
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
      return outcome;
    } catch (error) {
      console.warn("[PWA] Install prompt failed:", error);
      setDeferredPrompt(null);
      return "unavailable";
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(INSTALL_DISMISSED_KEY, "1");
    } catch {
      // ignore storage failures
    }
    setDismissed(true);
  }, []);

  const resume = useCallback(() => {
    try {
      localStorage.removeItem(INSTALL_DISMISSED_KEY);
    } catch {
      // ignore storage failures
    }
    setDismissed(false);
  }, []);

  return {
    /** True when the app can be installed right now (or iOS instructions apply). */
    canInstall: Boolean(deferredPrompt) || (isIOS && !installed),
    /** True when the browser exposed a native install prompt. */
    hasNativePrompt: Boolean(deferredPrompt),
    isInstalled: installed,
    isIOS,
    dismissed,
    promptInstall,
    dismiss,
    resume,
  };
}
