/** Brand gold + gem highlight — tweak hex values here to restyle all loaders. */
export const LOADER_GOLD = '#D6B36A';
export const LOADER_GOLD_LIGHT = '#E8DCCB';
export const LOADER_GEM = '#F0F8FF';
export const LOADER_GEM_GLOW = '#FFFFFF';

type SvgProps = {
  size?: number;
  className?: string;
};

export function WatchLoaderSvg({ size = 128, className }: SvgProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="luxWatchGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={LOADER_GOLD_LIGHT} />
          <stop offset="45%" stopColor={LOADER_GOLD} />
          <stop offset="100%" stopColor="#9A7B3F" />
        </linearGradient>
        <filter id="luxWatchGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Rotating glowing bezel */}
      <circle
        className="lux-watch-bezel"
        cx="64"
        cy="64"
        r="52"
        stroke="url(#luxWatchGold)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="18 10"
        fill="none"
        filter="url(#luxWatchGlow)"
      />

      {/* Case */}
      <circle cx="64" cy="64" r="44" fill="#121218" stroke="url(#luxWatchGold)" strokeWidth="1.5" />
      <circle cx="64" cy="64" r="38" fill="#1a1a22" stroke="rgba(214,179,106,0.25)" strokeWidth="1" />

      {/* Hour markers */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => (
        <line
          key={deg}
          x1="64"
          y1="30"
          x2="64"
          y2="34"
          stroke={LOADER_GOLD}
          strokeWidth={deg % 90 === 0 ? 2 : 1}
          strokeOpacity={deg % 90 === 0 ? 0.9 : 0.45}
          transform={`rotate(${deg} 64 64)`}
        />
      ))}

      {/* Crown */}
      <rect x="104" y="58" width="8" height="12" rx="1.5" fill="url(#luxWatchGold)" />

      {/* Hands — CSS-animated groups */}
      <g className="lux-watch-hour" style={{ transformOrigin: '64px 64px' }}>
        <line x1="64" y1="64" x2="64" y2="42" stroke={LOADER_GOLD_LIGHT} strokeWidth="2.5" strokeLinecap="round" />
      </g>
      <g className="lux-watch-minute" style={{ transformOrigin: '64px 64px' }}>
        <line x1="64" y1="64" x2="64" y2="34" stroke={LOADER_GOLD} strokeWidth="2" strokeLinecap="round" />
      </g>
      <g className="lux-watch-second" style={{ transformOrigin: '64px 64px' }}>
        <line x1="64" y1="64" x2="64" y2="30" stroke="#E8DCCB" strokeWidth="1" strokeLinecap="round" />
      </g>
      <circle cx="64" cy="64" r="3" fill={LOADER_GOLD} />
    </svg>
  );
}

export function ChainLoaderSvg({ size = 128, className }: SvgProps) {
  const links = Array.from({ length: 7 }, (_, i) => i);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="luxChainMetal" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5F0E8" />
          <stop offset="35%" stopColor={LOADER_GOLD} />
          <stop offset="70%" stopColor="#8A7344" />
          <stop offset="100%" stopColor={LOADER_GOLD_LIGHT} />
        </linearGradient>
        <filter id="luxChainShine">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
          <feOffset dy="1" result="offset" />
          <feComposite in="SourceGraphic" in2="offset" operator="over" />
        </filter>
      </defs>

      <path
        d="M 18 64 Q 64 38 110 64 Q 64 90 18 64"
        stroke="rgba(214,179,106,0.15)"
        strokeWidth="1"
        fill="none"
      />

      {links.map((i) => {
        const x = 22 + i * 14;
        const y = 64 + (i % 2 === 0 ? -4 : 4);
        return (
          <g key={i} className="lux-chain-link" style={{ transformOrigin: `${x}px ${y}px` }}>
            <ellipse
              cx={x}
              cy={y}
              rx="9"
              ry="6"
              fill="url(#luxChainMetal)"
              stroke="#6B5A32"
              strokeWidth="0.75"
              filter="url(#luxChainShine)"
              transform={`rotate(${i % 2 === 0 ? -18 : 18} ${x} ${y})`}
            />
            <ellipse
              cx={x}
              cy={y}
              rx="5"
              ry="3"
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="0.5"
              transform={`rotate(${i % 2 === 0 ? -18 : 18} ${x} ${y})`}
            />
          </g>
        );
      })}
    </svg>
  );
}

export function TennisBraceletLoaderSvg({ size = 128, className }: SvgProps) {
  const gems = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="luxBandGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8A7344" />
          <stop offset="50%" stopColor={LOADER_GOLD} />
          <stop offset="100%" stopColor="#8A7344" />
        </linearGradient>
        <radialGradient id="luxGem">
          <stop offset="0%" stopColor={LOADER_GEM_GLOW} />
          <stop offset="55%" stopColor={LOADER_GEM} />
          <stop offset="100%" stopColor="#B8D4E8" />
        </radialGradient>
        <filter id="luxGemGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Band arc */}
      <path
        d="M 20 72 Q 64 48 108 72"
        stroke="url(#luxBandGold)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {gems.map((i) => {
        const t = i / (gems.length - 1);
        const x = 20 + t * 88;
        const y = 72 - Math.sin(t * Math.PI) * 22;
        return (
          <g key={i} className="lux-bracelet-gem" style={{ transformOrigin: `${x}px ${y}px` }}>
            <circle cx={x} cy={y} r="5.5" fill="url(#luxGem)" stroke={LOADER_GOLD} strokeWidth="0.75" />
            <circle
              cx={x - 1.5}
              cy={y - 1.5}
              r="1.2"
              fill="rgba(255,255,255,0.85)"
              className="lux-bracelet-sparkle"
            />
          </g>
        );
      })}
    </svg>
  );
}

export const LOADER_SVG_ITEMS = [
  { id: 'watch', label: 'Watch', Component: WatchLoaderSvg },
  { id: 'chain', label: 'Chain', Component: ChainLoaderSvg },
  { id: 'bracelet', label: 'Bracelet', Component: TennisBraceletLoaderSvg },
] as const;
