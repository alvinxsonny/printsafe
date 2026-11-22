import React from "react";

export function PaperStackIllustration({
  className = "w-48 h-48",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g filter="drop-shadow(0 20px 24px rgba(20, 33, 61, 0.18))">
        {/* Bottom Paper Sheet */}
        <g transform="translate(0, 30)">
          {/* Top Face */}
          <polygon
            points="100,60 160,95 100,130 40,95"
            fill="var(--surface-2)"
          />
          {/* Left Face */}
          <polygon points="40,95 100,130 100,136 40,101" fill="var(--edge-2)" />
          {/* Right Face */}
          <polygon
            points="100,130 160,95 160,101 100,136"
            fill="var(--edge-3)"
          />
        </g>

        {/* Middle Paper Sheet */}
        <g transform="translate(0, 15)">
          {/* Top Face */}
          <polygon points="100,50 160,85 100,120 40,85" fill="var(--surface)" />
          {/* Left Face */}
          <polygon points="40,85 100,120 100,126 40,91" fill="var(--edge-1)" />
          {/* Right Face */}
          <polygon
            points="100,120 160,85 160,91 100,126"
            fill="var(--edge-2)"
          />
        </g>

        {/* Top Paper Sheet (with Accent Header Line) */}
        <g transform="translate(0, 0)">
          {/* Top Face */}
          <polygon
            points="100,40 160,75 100,110 40,75"
            fill="var(--surface)"
            stroke="var(--border)"
            strokeWidth="0.5"
          />
          {/* Left Face */}
          <polygon points="40,75 100,110 100,117 40,82" fill="var(--edge-1)" />
          {/* Right Face */}
          <polygon
            points="100,110 160,75 160,82 100,117"
            fill="var(--edge-2)"
          />

          {/* Isometric Document Lines */}
          {/* Green Title Bar */}
          <polygon
            points="90,56 120,73.5 110,79 80,61.5"
            fill="var(--accent-fill)"
          />
          {/* Text Line 1 */}
          <polygon
            points="75,69 135,103.5 130,106.5 70,72"
            fill="var(--text-muted)"
            opacity="0.4"
          />
          {/* Text Line 2 */}
          <polygon
            points="72,77 125,107.5 120,110.5 67,80"
            fill="var(--text-muted)"
            opacity="0.3"
          />
          {/* Text Line 3 */}
          <polygon
            points="69,85 105,106 100,109 64,88"
            fill="var(--text-muted)"
            opacity="0.2"
          />

          {/* Secure Padlock Stamp Icon in Isometric Perspective */}
          <circle
            cx="135"
            cy="65"
            r="10"
            fill="var(--accent-fill)"
            opacity="0.9"
          />
          <path
            d="M133 63h4v4h-4z M134 63v-1.5a1 1 0 0 1 2 0V63"
            stroke="#09090b"
            strokeWidth="1.5"
            fill="none"
          />
        </g>
      </g>
    </svg>
  );
}
