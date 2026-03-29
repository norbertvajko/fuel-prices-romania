import { useEffect, useState } from "react";

const FuelLoader = ({ onComplete, progress }: { onComplete: () => void; progress?: number }) => {
  const [fillLevel, setFillLevel] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsLightMode(document.documentElement.classList.contains("light"));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // If progress is provided, use it directly
    if (progress !== undefined) {
      setFillLevel(progress);
      if (progress >= 100) {
        setTimeout(() => setFadeOut(true), 200);
        setTimeout(() => onComplete(), 700);
      }
      return;
    }

    // Fallback: auto-increment if no progress provided
    const interval = setInterval(() => {
      setFillLevel((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setFadeOut(true), 200);
          setTimeout(() => onComplete(), 700);
          return 100;
        }
        return prev + 2;
      });
    }, 30);
    return () => clearInterval(interval);
  }, [onComplete, progress]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-500 ${
        fadeOut ? "opacity-0" : "opacity-100"
      } ${isLightMode ? "bg-white" : "bg-hero-bg"}`}
    >
      {/* Fuel pump icon */}
      <div className="relative mb-8">
        <svg
          width="80"
          height="100"
          viewBox="0 0 80 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          {/* Pump body */}
          <rect x="10" y="20" width="45" height="65" rx="6" stroke={isLightMode ? "hsl(222.2 47.4% 11.2%)" : "white"} strokeWidth="3" fill="none" />
          
          {/* Fuel fill - animated */}
          <clipPath id="pumpClip">
            <rect x="11.5" y="21.5" width="42" height="62" rx="5" />
          </clipPath>
          <rect
            x="11.5"
            y={21.5 + 62 * (1 - fillLevel / 100)}
            width="42"
            height={62 * (fillLevel / 100)}
            rx="0"
            fill="hsl(45, 100%, 55%)"
            clipPath="url(#pumpClip)"
            className="transition-all duration-75"
          />

          {/* Nozzle */}
          <path d="M55 35 H65 V25 Q72 25 72 32 V55 Q72 60 67 60 V50 H62 V40 H55" stroke={isLightMode ? "hsl(222.2 47.4% 11.2%)" : "white"} strokeWidth="3" fill="none" />
          
          {/* Screen on pump */}
          <rect x="20" y="30" width="25" height="15" rx="2" stroke={isLightMode ? "hsl(222.2 47.4% 11.2%)" : "white"} strokeWidth="1.5" fill={isLightMode ? "hsla(222.2 47.4% 11.2%, 0.1)" : "hsla(0,0%,100%,0.1)"} />
          
          {/* Base */}
          <rect x="5" y="85" width="55" height="6" rx="3" fill={isLightMode ? "hsl(222.2 47.4% 11.2%)" : "white"} />
        </svg>

        {/* Drip animation */}
        {fillLevel < 100 && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="absolute inline-block w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: "hsl(45, 100%, 55%)",
                  left: `${(i - 1) * 8}px`,
                  animation: `drip 0.8s ${i * 0.25}s ease-in infinite`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Percentage */}
      <p className={`text-2xl font-bold tabular-nums tracking-wider ${isLightMode ? "text-gray-900" : "text-primary-foreground"}`}>
        {Math.round(fillLevel)}%
      </p>
      <p className={`text-sm mt-2 tracking-widest uppercase ${isLightMode ? "text-gray-600" : "text-primary-foreground/60"}`}>
        Se încarcă...
      </p>

      <style>{`
        @keyframes drip {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(16px); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default FuelLoader;
