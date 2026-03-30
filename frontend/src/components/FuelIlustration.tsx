import { motion } from "framer-motion";

interface FuelIllustrationProps {
  displayPrice: string;
  displayLabel: string;
  currentDate: string;
  isLightMode: boolean;
}

const FuelIllustration = ({
  displayPrice,
  displayLabel,
  currentDate,
  isLightMode,
}: FuelIllustrationProps) => {
  const stroke = isLightMode ? "hsl(217 91% 60%)" : "hsl(217 91% 65%)";
  const fill = isLightMode ? "hsl(210 40% 97%)" : "hsl(222 47% 20%)";
  const text = isLightMode ? "hsl(217 91% 40%)" : "hsl(217 91% 75%)";
  const cardBg = isLightMode ? "hsl(210 40% 100%)" : "hsl(222 47% 16%)";
  const priceBg = isLightMode ? "hsl(213 80% 97%)" : "hsl(222 47% 24%)";
  const baseBg = isLightMode ? "hsl(210 40% 92%)" : "hsl(222 47% 28%)";
  const glowColor = isLightMode ? "hsl(217 91% 60%)" : "hsl(217 91% 55%)";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
      className="hidden lg:flex items-center justify-center"
    >
      <div className="relative w-80 h-80 xl:w-96 xl:h-96">
        {/* Ambient glow behind everything */}
        <div
          className="absolute inset-0 rounded-full blur-3xl opacity-20 fuel-glow-pulse"
          style={{ background: `radial-gradient(circle, ${glowColor}, transparent 70%)` }}
        />

        <div className="absolute inset-0 flex items-center justify-center fuel-float">
          <svg viewBox="0 0 240 240" className="w-full h-full" fill="none">
            <defs>
              {/* Gradient for outer rings */}
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity="0.5" />
                <stop offset="100%" stopColor={stroke} stopOpacity="0.1" />
              </linearGradient>
              {/* Card shadow filter */}
              <filter id="cardShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor={stroke} floodOpacity="0.18" />
              </filter>
              {/* Glow filter for bubbles */}
              <filter id="bubbleGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Nozzle gradient */}
              <linearGradient id="nozzleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity="0.9" />
                <stop offset="100%" stopColor={stroke} stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Orbital rings */}
            <circle
              cx="120" cy="120" r="108"
              stroke="url(#ringGrad)"
              strokeWidth="0.8"
              strokeDasharray="4 8"
              className="fuel-spin-slow"
              style={{ transformOrigin: "120px 120px" }}
            />
            <circle
              cx="120" cy="120" r="95"
              stroke={stroke}
              strokeWidth="0.5"
              strokeOpacity="0.25"
              strokeDasharray="2 12"
              className="fuel-spin-reverse"
              style={{ transformOrigin: "120px 120px" }}
            />

            {/* Soft inner glow */}
            <circle cx="105" cy="100" r="40" fill={glowColor} fillOpacity="0.06" className="fuel-pulse-soft" />

            {/* ===== MAIN FUEL PUMP ===== */}
            <g filter="url(#cardShadow)">
              {/* Card body */}
              <rect x="72" y="62" width="68" height="92" rx="10" fill={cardBg} fillOpacity="0.95" stroke={stroke} strokeWidth="1.2" strokeOpacity="0.5" />
              
              {/* Glass shine on card */}
              <rect x="74" y="64" width="64" height="20" rx="8" fill={stroke} fillOpacity="0.04" />

              {/* Price display */}
              <rect x="82" y="76" width="48" height="28" rx="6" fill={priceBg} fillOpacity="0.95" stroke={stroke} strokeWidth="0.8" strokeOpacity="0.3" />

              {/* Price text */}
              <text x="106" y="95" textAnchor="middle" fill={text} fontSize="13" fontWeight="700" fontFamily="system-ui, sans-serif">
                {displayPrice}
              </text>

              {/* Label */}
              <text x="106" y="120" textAnchor="middle" fill={text} fontSize="8" fontWeight="600" fontFamily="system-ui, sans-serif" opacity="0.85">
                {displayLabel}
              </text>

              {/* Separator line */}
              <line x1="88" y1="128" x2="124" y2="128" stroke={stroke} strokeWidth="0.5" strokeOpacity="0.2" />

              {/* Date */}
              <text x="106" y="142" textAnchor="middle" fill={text} fontSize="6.5" fontWeight="500" fontFamily="system-ui, sans-serif" opacity="0.6">
                {currentDate}
              </text>

              {/* Base platform */}
              <rect x="68" y="154" width="76" height="10" rx="5" fill={baseBg} fillOpacity="0.6" />
            </g>

            {/* ===== NOZZLE ===== */}
            <g>
              {/* Nozzle connector */}
              <rect x="140" y="72" width="18" height="5" rx="2.5" fill={stroke} fillOpacity="0.6" />
              {/* Nozzle arm */}
              <path
                d="M158 74.5 L170 58 L170 100 L162 100 L162 80 L158 80"
                stroke="url(#nozzleGrad)"
                strokeWidth="2"
                fill="none"
                strokeLinejoin="round"
              />
              {/* Fuel stream */}
              <path
                d="M170 100 Q176 118, 164 128 Q152 138, 158 150"
                stroke={stroke}
                strokeWidth="2.5"
                strokeOpacity="0.5"
                fill="none"
                strokeLinecap="round"
                className="fuel-wave"
              />
              {/* Drip collector */}
              <g className="fuel-bounce">
                <rect x="153" y="148" width="12" height="7" rx="3" fill={stroke} fillOpacity="0.6" />
              </g>
              {/* Dripping drop */}
              <circle cx="159" cy="160" r="2.5" fill={stroke} fillOpacity="0.7" className="fuel-drip" />
            </g>

            {/* ===== FLOATING BUBBLES ===== */}
            {/* GPL */}
            <g className="fuel-orbit-1" filter="url(#bubbleGlow)">
              <circle cx="38" cy="68" r="20" fill={isLightMode ? "hsl(155 55% 48%)" : "hsl(155 65% 42%)"} fillOpacity="0.8" />
              <text x="38" y="72" textAnchor="middle" fill="hsl(0 0% 100%)" fontSize="8.5" fontWeight="700" fontFamily="system-ui, sans-serif">
                GPL
              </text>
            </g>

            {/* E95 */}
            <g className="fuel-orbit-2" filter="url(#bubbleGlow)">
              <circle cx="195" cy="85" r="18" fill={isLightMode ? "hsl(40 80% 55%)" : "hsl(40 85% 50%)"} fillOpacity="0.8" />
              <text x="195" y="89" textAnchor="middle" fill="hsl(0 0% 100%)" fontSize="7.5" fontWeight="700" fontFamily="system-ui, sans-serif">
                E95
              </text>
            </g>

            {/* E98 */}
            <g className="fuel-orbit-3" filter="url(#bubbleGlow)">
              <circle cx="190" cy="165" r="15" fill="hsl(25 85% 52%)" fillOpacity="0.85" />
              <text x="190" y="169" textAnchor="middle" fill="hsl(0 0% 100%)" fontSize="7" fontWeight="700" fontFamily="system-ui, sans-serif">
                E98
              </text>
            </g>

            {/* Diesel */}
            <g className="fuel-orbit-4" filter="url(#bubbleGlow)">
              <circle cx="42" cy="160" r="14" fill={isLightMode ? "hsl(200 60% 45%)" : "hsl(200 70% 40%)"} fillOpacity="0.75" />
              <text x="42" y="164" textAnchor="middle" fill="hsl(0 0% 100%)" fontSize="6.5" fontWeight="700" fontFamily="system-ui, sans-serif">
                DSL
              </text>
            </g>

            {/* Tiny decorative dots */}
            <circle cx="60" cy="40" r="2" fill={stroke} fillOpacity="0.2" className="fuel-pulse-dot" />
            <circle cx="185" cy="48" r="1.5" fill={stroke} fillOpacity="0.15" className="fuel-pulse-dot-2" />
            <circle cx="50" cy="200" r="1.8" fill={stroke} fillOpacity="0.18" className="fuel-pulse-dot" />
            <circle cx="200" cy="195" r="2.2" fill={stroke} fillOpacity="0.12" className="fuel-pulse-dot-2" />
          </svg>
        </div>
      </div>

      <style>{`
        @keyframes fuel-float-kf {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes fuel-spin-kf {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fuel-spin-rev-kf {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes fuel-pulse-soft-kf {
          0%, 100% { opacity: 0.06; r: 40; }
          50% { opacity: 0.12; r: 45; }
        }
        @keyframes fuel-glow-kf {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(1.05); }
        }
        @keyframes fuel-orbit-1-kf {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(8px, -10px); }
          50% { transform: translate(4px, -16px); }
          75% { transform: translate(-4px, -8px); }
        }
        @keyframes fuel-orbit-2-kf {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-6px, -8px); }
          50% { transform: translate(-10px, -4px); }
          75% { transform: translate(-4px, 6px); }
        }
        @keyframes fuel-orbit-3-kf {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(5px, -7px); }
          50% { transform: translate(-6px, -12px); }
          75% { transform: translate(-8px, -4px); }
        }
        @keyframes fuel-orbit-4-kf {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-5px, -10px); }
          50% { transform: translate(8px, -6px); }
          75% { transform: translate(3px, 5px); }
        }
        @keyframes fuel-wave-kf {
          0%, 100% { d: path("M170 100 Q176 118, 164 128 Q152 138, 158 150"); }
          50% { d: path("M170 100 Q180 115, 166 126 Q154 136, 160 150"); }
        }
        @keyframes fuel-bounce-kf {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(3px); }
        }
        @keyframes fuel-drip-kf {
          0% { cy: 160; opacity: 0.7; r: 2.5; }
          40% { cy: 172; opacity: 0.3; r: 1.5; }
          60% { cy: 174; opacity: 0; r: 1; }
          100% { cy: 160; opacity: 0.7; r: 2.5; }
        }
        @keyframes fuel-pulse-dot-kf {
          0%, 100% { opacity: 0.2; r: 2; }
          50% { opacity: 0.5; r: 3; }
        }
        @keyframes fuel-pulse-dot-2-kf {
          0%, 100% { opacity: 0.15; r: 1.5; }
          50% { opacity: 0.4; r: 2.5; }
        }

        .fuel-float { animation: fuel-float-kf 4s ease-in-out infinite; }
        .fuel-spin-slow { animation: fuel-spin-kf 30s linear infinite; }
        .fuel-spin-reverse { animation: fuel-spin-rev-kf 45s linear infinite; }
        .fuel-pulse-soft { animation: fuel-pulse-soft-kf 4s ease-in-out infinite; }
        .fuel-glow-pulse { animation: fuel-glow-kf 4s ease-in-out infinite; }
        .fuel-orbit-1 { animation: fuel-orbit-1-kf 7s ease-in-out infinite; }
        .fuel-orbit-2 { animation: fuel-orbit-2-kf 6s ease-in-out infinite 0.5s; }
        .fuel-orbit-3 { animation: fuel-orbit-3-kf 6.5s ease-in-out infinite 1s; }
        .fuel-orbit-4 { animation: fuel-orbit-4-kf 7.5s ease-in-out infinite 1.5s; }
        .fuel-wave { animation: fuel-wave-kf 3.5s ease-in-out infinite; }
        .fuel-bounce { animation: fuel-bounce-kf 3s ease-in-out infinite; }
        .fuel-drip { animation: fuel-drip-kf 2.5s ease-in-out infinite; }
        .fuel-pulse-dot { animation: fuel-pulse-dot-kf 3s ease-in-out infinite; }
        .fuel-pulse-dot-2 { animation: fuel-pulse-dot-kf 4s ease-in-out infinite 1s; }
      `}</style>
    </motion.div>
  );
};

export default FuelIllustration;