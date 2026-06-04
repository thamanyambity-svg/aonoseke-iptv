import { useId } from 'react';

interface AlphaLogoProps {
  size?: number;
}

export function AlphaLogo({ size = 40 }: AlphaLogoProps): JSX.Element {
  const uid = useId().replace(/:/g, '');
  const clipId = `gc-${uid}`;

  const teeth = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="31.5" />
        </clipPath>
        {/* Radial gradient for depth on globe */}
        <radialGradient id={`rg-${uid}`} cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#2a1e00" />
          <stop offset="100%" stopColor="#0d0900" />
        </radialGradient>
      </defs>

      {/* ── Background ── */}
      <circle cx="50" cy="50" r="49.5" fill="#0d0a04" />

      {/* ── Gear ring ── */}
      <circle cx="50" cy="50" r="44" fill="#c9a84c" />
      <circle cx="50" cy="50" r="37.5" fill="#0d0a04" />

      {/* ── Gear teeth (12 × rectangular) ── */}
      {teeth.map((angle) => (
        <rect
          key={angle}
          x="47" y="3.5" width="6" height="11" rx="1.5"
          fill="#c9a84c"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}

      {/* ── Globe fill ── */}
      <circle cx="50" cy="50" r="31.5" fill={`url(#rg-${uid})`} />

      {/* ── Globe grid (clipped) ── */}
      <g clipPath={`url(#${clipId})`} stroke="#c9a84c" fill="none">
        {/* Latitude */}
        <ellipse cx="50" cy="50" rx="31.5" ry="9"   strokeWidth="0.7" opacity="0.35" />
        <ellipse cx="50" cy="50" rx="31.5" ry="18.5" strokeWidth="0.7" opacity="0.25" />
        {/* Longitude */}
        <ellipse cx="50" cy="50" rx="11"  ry="31.5" strokeWidth="0.7" opacity="0.3"  />
        <ellipse cx="50" cy="50" rx="22"  ry="31.5" strokeWidth="0.7" opacity="0.25" />
      </g>

      {/* ── Globe outline ── */}
      <circle cx="50" cy="50" r="31.5" fill="none" stroke="#c9a84c" strokeWidth="1.2" opacity="0.5" />

      {/* ── Letter A (shadow) ── */}
      <text
        x="51" y="65"
        textAnchor="middle"
        fontFamily="Georgia,'Times New Roman',serif"
        fontWeight="900"
        fontSize="47"
        fill="#000"
        opacity="0.55"
      >A</text>

      {/* ── Letter A (main gold) ── */}
      <text
        x="50" y="64"
        textAnchor="middle"
        fontFamily="Georgia,'Times New Roman',serif"
        fontWeight="900"
        fontSize="47"
        fill="#c9a84c"
      >A</text>

      {/* ── Arrow swoosh ── */}
      <path
        d="M 19 73 Q 46 38 75 23"
        stroke="#c9a84c"
        strokeWidth="2.8"
        fill="none"
        strokeLinecap="round"
      />
      {/* Arrowhead */}
      <polygon
        points="75,23 65,22 71,32"
        fill="#c9a84c"
      />
    </svg>
  );
}
