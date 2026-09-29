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
  colorType: "gold" | "diamond" | "emerald";
  isGlitter?: boolean;
}

export function NightSkyBackground() {
  const { theme } = useTheme();

  // Dense, beautiful celestial starfield
  const stars: Star[] = useMemo(() => {
    return Array.from({ length: 95 }, (_, i) => {
      const colorType: "gold" | "diamond" | "emerald" = 
        i % 4 === 0 ? "gold" : i % 8 === 0 ? "emerald" : "diamond";
      
      return {
        id: i,
        x: Math.round(Math.random() * 99 * 10) / 10,
        y: Math.round(Math.random() * 98 * 10) / 10,
        size: i % 8 === 0 ? 3.8 : i % 3 === 0 ? 2.6 : 1.6,
        opacity: 0.35 + Math.random() * 0.65,
        duration: 1.8 + Math.random() * 3.5,
        delay: Math.random() * 4,
        colorType,
        isGlitter: i % 4 === 0,
      };
    });
  }, []);

  const shootingStars = useMemo(() => [0, 1, 2, 3], []);

  if (theme !== "dark") return null;

  return (
    <div className="night-sky-container" aria-hidden="true">
      {/* Deep Space Background Canvas */}
      <div className="space-deep-bg" />

      {/* Cosmic Nebula Glows */}
      <div className="space-nebula space-nebula-1" />
      <div className="space-nebula space-nebula-2" />
      <div className="space-nebula space-nebula-3" />

      {/* Seamless Photorealistic Full Moon (no hard lines or dark outer border) */}
      <div className="photorealistic-moon-wrap">
        <div className="photorealistic-moon">
          <img
            src="/assets/realistic_full_moon.jpg"
            alt="Glowing Full Moon"
            className="moon-texture-image"
          />
        </div>
      </div>

      {/* Twinkling Stars & Diamond Glitter */}
      <div className="stars-field">
        {stars.map((star) => (
          <div
            key={star.id}
            className={`star-particle star-${star.colorType} ${
              star.isGlitter ? "glitter-star" : "normal-star"
            }`}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              animationDuration: `${star.duration}s`,
              animationDelay: `${star.delay}s`,
            }}
          >
            {star.isGlitter && (
              <span className={`star-sparkle-cross cross-${star.colorType}`} />
            )}
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
