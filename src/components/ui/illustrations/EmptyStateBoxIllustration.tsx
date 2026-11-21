import React from "react";

export function EmptyStateBoxIllustration({
  className = "w-32 h-32",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g filter="drop-shadow(0 12px 20px rgba(20, 33, 61, 0.12))">
        {/* Open Isometric Storage Box Base */}
        {/* Back Interior Face */}
        <polygon points="80,45 130,74 80,103 30,74" fill="var(--surface-2)" />

        {/* Box Left Exterior */}
        <polygon points="30,74 80,103 80,128 30,99" fill="var(--edge-2)" />
        {/* Box Right Exterior */}
        <polygon points="80,103 130,74 130,99 80,128" fill="var(--edge-3)" />

        {/* Box Front Interior Left */}
        <polygon points="30,74 80,103 80,100 30,71" fill="var(--edge-1)" />

        {/* Gentle Floating Empty Document */}
        <g transform="translate(0, -10)">
          {/* Top Face */}
          <polygon
            points="80,30 115,50 80,70 45,50"
            fill="var(--surface)"
            stroke="var(--border)"
            strokeWidth="0.5"
          />
          {/* Left Edge */}
          <polygon points="45,50 80,70 80,74 45,54" fill="var(--edge-1)" />
          {/* Right Edge */}
          <polygon points="80,70 115,50 115,54 80,74" fill="var(--edge-2)" />

          {/* Dotted outlines indicating empty paper */}
          <line
            x1="60"
            y1="48"
            x2="95"
            y2="68"
            stroke="var(--text-muted)"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.5"
          />
          <line
            x1="65"
            y1="44"
            x2="90"
            y2="58"
            stroke="var(--accent)"
            strokeWidth="1.5"
            opacity="0.6"
          />
        </g>
      </g>
    </svg>
  );
}
