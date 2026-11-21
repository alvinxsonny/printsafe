import React from "react";

export function FootprintTreePlaceholder({
  className = "w-40 h-40",
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
      <g filter="drop-shadow(0 14px 24px rgba(18, 114, 74, 0.15))">
        {/* Isometric Soil Base */}
        <polygon
          points="80,110 130,135 80,155 30,135"
          fill="var(--surface-2)"
        />
        <polygon points="30,135 80,155 80,158 30,138" fill="var(--edge-2)" />
        <polygon points="80,155 130,135 130,138 80,158" fill="var(--edge-3)" />

        {/* Tree Trunk Base */}
        <polygon points="76,105 84,109 84,130 76,126" fill="#8B5A2B" />
        <polygon points="84,109 92,105 92,126 84,130" fill="#6B4226" />

        {/* Lower Canopy Tier (Tier 3) */}
        <polygon points="80,70 120,95 80,115 40,95" fill="#12724A" />
        <polygon points="40,95 80,115 80,122 40,102" fill="#0D5235" />
        <polygon points="80,115 120,95 120,102 80,122" fill="#093C27" />

        {/* Middle Canopy Tier (Tier 2) */}
        <polygon points="80,50 110,70 80,90 50,70" fill="#178857" />
        <polygon points="50,70 80,90 80,96 50,76" fill="#12724A" />
        <polygon points="80,90 110,70 110,76 80,96" fill="#0D5235" />

        {/* Top Canopy Tier (Tier 1) */}
        <polygon points="80,30 100,45 80,60 60,45" fill="var(--accent-fill)" />
        <polygon points="60,45 80,60 80,65 60,50" fill="#2EB673" />
        <polygon points="80,60 100,45 100,50 80,65" fill="#178857" />
      </g>
    </svg>
  );
}
