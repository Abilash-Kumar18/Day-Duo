import { useTheme } from "@/contexts/ThemeContext";
import { useMemo } from "react";

interface Star {
  id: number;
  x: number;
  y: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  isGlitter?: boolean;
}

export function NightSkyBackground() {
  const { theme } = useTheme();

  // Generate a deterministic or randomized starfield
  const stars: Star[] = useMemo(() => {
    return Array.from({ length: 65 }, (_, i) => ({
      id: i,
      x: Math.round(Math.random() * 98 * 10) / 10,
      y: Math.round(Math.random() * 95 * 10) / 10,
      size: i % 7 === 0 ? 3.5 : i % 3 === 0 ? 2.5 : 1.5,
      opacity: 0.3 + Math.random() * 0.7,
      duration: 2 + Math.random() * 4,
      delay: Math.random() * 5,
      isGlitter: i % 5 === 0,
    }));
  }, []);

  const shootingStars = useMemo(() => [0, 1, 2], []);

  if (theme !== "dark") return null;

  return (
    <div className="night-sky-container" aria-hidden="true">
      {/* Deep Space Atmosphere Glow */}
      <div className="space-nebula space-nebula-1" />
      <div className="space-nebula space-nebula-2" />

      {/* Dynamic Floating & Glowing Moon */}
      <div className="celestial-moon-wrap">
        <div className="celestial-moon">
          <div className="moon-crater crater-1" />
          <div className="moon-crater crater-2" />
          <div className="moon-crater crater-3" />
          <div className="moon-crater crater-4" />
          <div className="moon-glow-inner" />
        </div>
        <div className="moon-aura-ring ring-1" />
        <div className="moon-aura-ring ring-2" />
      </div>

      {/* Twinkling Stars & Diamond Glitter */}
      <div className="stars-field">
        {stars.map((star) => (
          <div
            key={star.id}
            className={`star-particle ${star.isGlitter ? "glitter-star" : "normal-star"}`}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
            }}
          >
            {star.isGlitter && <span className="star-sparkle-cross" />}
          </div>
        ))}
      </div>

      {/* Occasional Shooting Glitter Meteors */}
      {shootingStars.map((id) => (
        <div
          key={id}
          className={`shooting-star-trail meteor-${id + 1}`}
        />
      ))}
    </div>
  );
}
