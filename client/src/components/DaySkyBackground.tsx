import { useTheme } from "@/contexts/ThemeContext";

export function DaySkyBackground() {
  const { theme } = useTheme();

  if (theme === "dark") return null;

  return (
    <div className="day-sky-container" aria-hidden="true">
      {/* Daytime scenic background image with hills & sun */}
      <div className="day-scenic-image" />
      
      {/* Ambient solar morning glow & sunbeams */}
      <div className="day-sun-glow" />
      <div className="day-sky-gradient" />
    </div>
  );
}
