import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { Download, Share, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface InstallAppButtonProps {
  /** `icon` renders a compact round button for the top bar, `pill` a labelled button. */
  variant?: "icon" | "pill";
  className?: string;
}

/**
 * "Install DuoDay as an app" button.
 *
 * Chrome / Edge / Android get the native install dialog, iOS Safari gets the
 * "Add to Home Screen" instructions. The button hides itself once the app is
 * running in standalone mode.
 */
export function InstallAppButton({
  variant = "icon",
  className = "",
}: InstallAppButtonProps) {
  const {
    canInstall,
    hasNativePrompt,
    isInstalled,
    isIOS,
    dismissed,
    promptInstall,
    dismiss,
  } = useInstallPrompt();
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showIOSHelp) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setShowIOSHelp(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowIOSHelp(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showIOSHelp]);

  if (isInstalled || dismissed || !canInstall) return null;

  const handleClick = async () => {
    if (hasNativePrompt) {
      const outcome = await promptInstall();
      if (outcome === "accepted") {
        toast.success("DuoDay is being installed on this device.");
      }
      return;
    }

    // iOS Safari — show the manual instructions.
    setShowIOSHelp((open) => !open);
  };

  const isPill = variant === "pill";

  return (
    <div className="install-app-wrap" ref={wrapRef}>
      <button
        type="button"
        className={isPill ? "install-app-pill" : "icon-button"}
        onClick={handleClick}
        title="Install DuoDay as an app"
        aria-label="Install DuoDay as an app"
      >
        <Download size={isPill ? 16 : 17} />
        {isPill && <span>Install app</span>}
      </button>

      {showIOSHelp && (
        <div className="install-app-panel" role="dialog" aria-label="Install DuoDay">
          <button
            type="button"
            className="install-app-close"
            onClick={() => setShowIOSHelp(false)}
            aria-label="Close instructions"
          >
            <X size={14} />
          </button>
          <strong>Install DuoDay</strong>
          <p>Add DuoDay to your home screen for a full screen, app-like experience.</p>
          <ol>
            <li>
              Tap the <Share size={12} /> Share button in the browser bar.
            </li>
            <li>Choose “Add to Home Screen”.</li>
            <li>Tap Add — DuoDay opens like a native app.</li>
          </ol>
          <button
            type="button"
            className="install-app-dismiss"
            onClick={() => {
              dismiss();
              setShowIOSHelp(false);
            }}
          >
            Don&apos;t show this again
          </button>
        </div>
      )}
    </div>
  );
}
