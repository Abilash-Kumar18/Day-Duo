import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`icon-button theme-toggle-btn ${className}`}
      title={isDark ? "Switch to Light theme" : "Switch to Dark theme"}
      aria-label={isDark ? "Switch to Light theme" : "Switch to Dark theme"}
    >
      {isDark ? (
        <Sun size={17} className="theme-icon sun-icon text-amber-400" />
      ) : (
        <Moon size={17} className="theme-icon moon-icon text-slate-600" />
      )}
    </button>
  );
}
