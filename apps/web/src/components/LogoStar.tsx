"use client";

import { useId } from "react";

export function LogoStar({ size = 40, className }: { size?: number; className?: string }) {
  const gradId = `logo-star-${useId().replace(/:/g, "")}`;
  const c = size / 2;
  const r = c * 0.84;
  const p = r * 0.22;
  const d = `M${c},${c - r} L${c + p},${c - p} L${c + r},${c} L${c + p},${c + p} L${c},${c + r} L${c - p},${c + p} L${c - r},${c} L${c - p},${c - p} Z`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      className={className}
      aria-hidden
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e8b94a" />
          <stop offset="45%" stopColor="#c48a30" />
          <stop offset="100%" stopColor="#6b3518" />
        </radialGradient>
      </defs>
      <path d={d} fill={`url(#${gradId})`} />
    </svg>
  );
}
