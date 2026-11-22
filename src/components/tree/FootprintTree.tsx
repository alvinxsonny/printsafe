"use client";

import React, { useState } from "react";
import { SHEETS_PER_CANOPY_TIER, SHEETS_PER_TREE_APPROX } from "@/config/app";
import { Badge } from "@/components/ui/Badge";
import { Card3D } from "@/components/ui/Card3D";
import { Button3D } from "@/components/ui/Button3D";
import { Sparkles, Award } from "lucide-react";

export interface FootprintTreeProps {
  sheetsPrintedTotal: number;
  hasNoPrintsLast30Days?: boolean;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function FootprintTree({
  sheetsPrintedTotal = 0,
  hasNoPrintsLast30Days = false,
  className = "",
  showDetails = true,
  compact = false,
}: FootprintTreeProps) {
  const [showCelebration, setShowCelebration] = useState(hasNoPrintsLast30Days);

  const sheets = Math.max(0, Math.floor(sheetsPrintedTotal));
  const sheetsPerCycle = 5 * SHEETS_PER_CANOPY_TIER; // 50 sheets
  const cycle = Math.floor(sheets / sheetsPerCycle);
  const sheetsInCycle = sheets % sheetsPerCycle;

  // Tiers lost in current cycle: 0 to 5
  // Note: if sheets > 0 and exact multiple of 50, it represents completion of 5 tiers
  const tiersLost =
    sheets > 0 && sheetsInCycle === 0
      ? 5
      : Math.min(5, Math.floor(sheetsInCycle / SHEETS_PER_CANOPY_TIER));
  const tiersRemaining = 5 - tiersLost;
  const isStump = tiersRemaining === 0;
  const showSapling = isStump || cycle > 0;

  // Approximate percentage calculation
  const treeFraction = (sheets / SHEETS_PER_TREE_APPROX) * 100;
  const percentageDisplay =
    sheets === 0
      ? "0%"
      : treeFraction < 0.01
        ? "< 0.01%"
        : `${treeFraction.toFixed(2)}%`;

  return (
    <div
      className={`relative flex flex-col items-center select-none ${className}`}
      data-testid="footprint-tree-container"
    >
      {/* 3D Isometric Tree SVG */}
      <div className="relative flex items-center justify-center">
        <svg
          viewBox="0 0 240 240"
          className={`${compact ? "w-36 h-36" : "w-52 h-52 sm:w-60 sm:h-60"} drop-shadow-md transition-all duration-300`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label={`Paper Footprint Tree showing ${tiersRemaining} canopy tiers remaining and ${tiersLost} logs harvested.`}
        >
          <defs>
            {/* Ground Gradients */}
            <radialGradient
              id="groundShadow"
              cx="50%"
              cy="50%"
              r="50%"
              fx="50%"
              fy="50%"
            >
              <stop offset="0%" stopColor="#12724A" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#12724A" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="groundTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--surface-2, #EAE4D4)" />
              <stop offset="100%" stopColor="var(--surface, #FBF9F3)" />
            </linearGradient>

            {/* Tree Foliage Gradients */}
            <linearGradient id="canopyTop" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3DD68C" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <linearGradient id="canopyLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <linearGradient
              id="canopyRight"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>

            {/* Trunk Wood Gradients */}
            <linearGradient id="woodCut" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#B45309" />
            </linearGradient>
            <linearGradient id="barkLeft" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#8B5A2B" />
              <stop offset="100%" stopColor="#6B4226" />
            </linearGradient>
            <linearGradient id="barkRight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6B4226" />
              <stop offset="100%" stopColor="#452712" />
            </linearGradient>
          </defs>

          {/* 1. Ambient Drop Shadow */}
          <ellipse
            cx="120"
            cy="198"
            rx="75"
            ry="24"
            fill="url(#groundShadow)"
          />

          {/* 2. Isometric Earth Base Tile */}
          <g id="ground-base">
            {/* Top Surface */}
            <polygon
              points="120,165 195,192 120,218 45,192"
              fill="url(#groundTop)"
              stroke="var(--border, #DED7C6)"
              strokeWidth="1.5"
            />
            {/* Left Extruded Edge */}
            <polygon
              points="45,192 120,218 120,224 45,198"
              fill="var(--edge-2, #C6BCA6)"
            />
            {/* Right Extruded Edge */}
            <polygon
              points="120,218 195,192 195,198 120,224"
              fill="var(--edge-3, #B4A88E)"
            />
            {/* Patch of subtle grass tuft on base */}
            <path
              d="M100,188 L103,180 L106,188 M104,188 L108,178 L111,188"
              stroke="#10B981"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </g>

          {/* 3. Tree Trunk / Stump */}
          <g id="tree-trunk">
            {/* Left Bark Face */}
            <polygon
              points="112,156 120,160 120,192 112,188"
              fill="url(#barkLeft)"
            />
            {/* Right Bark Face */}
            <polygon
              points="120,160 128,156 128,188 120,192"
              fill="url(#barkRight)"
            />
            {/* Cut Trunk Top Surface (Always present, revealed when canopies fall) */}
            <polygon
              points="120,152 128,156 120,160 112,156"
              fill="url(#woodCut)"
              stroke="#78350F"
              strokeWidth="0.8"
            />
            {/* Annual growth ring on top of stump */}
            <ellipse
              cx="120"
              cy="156"
              rx="4"
              ry="2"
              fill="none"
              stroke="#92400E"
              strokeWidth="0.8"
            />
          </g>

          {/* 4. Logs at the base (1 log per lost tier) */}
          <g id="ground-logs">
            {/* Log 1: Bottom left */}
            {tiersLost >= 1 && (
              <g
                id="log-1"
                className="transition-all duration-500 ease-out animate-log-appear"
              >
                <polygon
                  points="78,196 96,203 96,208 78,201"
                  fill="url(#barkLeft)"
                />
                <polygon
                  points="96,203 102,199 102,204 96,208"
                  fill="url(#barkRight)"
                />
                <ellipse
                  cx="78"
                  cy="198.5"
                  rx="3.5"
                  ry="2.5"
                  fill="url(#woodCut)"
                  stroke="#78350F"
                  strokeWidth="0.6"
                />
              </g>
            )}

            {/* Log 2: Bottom right */}
            {tiersLost >= 2 && (
              <g
                id="log-2"
                className="transition-all duration-500 ease-out animate-log-appear"
              >
                <polygon
                  points="140,195 158,188 158,193 140,200"
                  fill="url(#barkRight)"
                />
                <ellipse
                  cx="140"
                  cy="197.5"
                  rx="3.5"
                  ry="2.5"
                  fill="url(#woodCut)"
                  stroke="#78350F"
                  strokeWidth="0.6"
                />
              </g>
            )}

            {/* Log 3: Top right */}
            {tiersLost >= 3 && (
              <g
                id="log-3"
                className="transition-all duration-500 ease-out animate-log-appear"
              >
                <polygon
                  points="136,178 152,172 152,177 136,183"
                  fill="url(#barkRight)"
                />
                <ellipse
                  cx="136"
                  cy="180.5"
                  rx="3.2"
                  ry="2.2"
                  fill="url(#woodCut)"
                  stroke="#78350F"
                  strokeWidth="0.6"
                />
              </g>
            )}

            {/* Log 4: Top left */}
            {tiersLost >= 4 && (
              <g
                id="log-4"
                className="transition-all duration-500 ease-out animate-log-appear"
              >
                <polygon
                  points="88,180 104,186 104,191 88,185"
                  fill="url(#barkLeft)"
                />
                <ellipse
                  cx="88"
                  cy="182.5"
                  rx="3.2"
                  ry="2.2"
                  fill="url(#woodCut)"
                  stroke="#78350F"
                  strokeWidth="0.6"
                />
              </g>
            )}

            {/* Log 5: Stacked at base center */}
            {tiersLost >= 5 && (
              <g
                id="log-5"
                className="transition-all duration-500 ease-out animate-log-appear"
              >
                <polygon
                  points="110,202 128,208 128,213 110,207"
                  fill="url(#barkLeft)"
                />
                <ellipse
                  cx="110"
                  cy="204.5"
                  rx="3.5"
                  ry="2.5"
                  fill="url(#woodCut)"
                  stroke="#78350F"
                  strokeWidth="0.6"
                />
              </g>
            )}
          </g>

          {/* 5. Young Sapling Sprouting Beside the Stump */}
          {showSapling && (
            <g
              id="new-sapling"
              className="animate-sapling-sprout transition-all duration-700"
            >
              {/* Soil mound */}
              <ellipse
                cx="162"
                cy="186"
                rx="7"
                ry="3"
                fill="#8B5A2B"
                opacity="0.8"
              />
              {/* Stem */}
              <path
                d="M162,186 Q163,172 165,164"
                stroke="#059669"
                strokeWidth="2.2"
                strokeLinecap="round"
                fill="none"
              />
              {/* Left Leaf */}
              <path
                d="M165,168 C158,166 156,160 160,158 C164,157 165,164 165,168 Z"
                fill="#3DD68C"
                stroke="#10B981"
                strokeWidth="0.7"
              />
              {/* Right Leaf */}
              <path
                d="M165,165 C172,163 174,156 170,155 C166,155 165,161 165,165 Z"
                fill="#34D399"
                stroke="#059669"
                strokeWidth="0.7"
              />
              {/* Bud apex */}
              <circle cx="165" cy="162" r="1.5" fill="#6EE7B7" />
            </g>
          )}

          {/* 6. Isometric Canopy Tiers (Tier 1 at bottom, Tier 5 at apex) */}
          {/* Tier 1 (Lowest, Base Tier) */}
          {tiersRemaining >= 1 && (
            <g id="tier-1" className="transition-all duration-500 ease-out">
              {/* Left Face */}
              <polygon
                points="68,136 120,159 120,167 68,144"
                fill="url(#canopyLeft)"
              />
              {/* Right Face */}
              <polygon
                points="120,159 172,136 172,144 120,167"
                fill="url(#canopyRight)"
              />
              {/* Top Face */}
              <polygon
                points="120,113 172,136 120,159 68,136"
                fill="url(#canopyTop)"
                stroke="#059669"
                strokeWidth="0.8"
              />
            </g>
          )}

          {/* Tier 2 */}
          {tiersRemaining >= 2 && (
            <g id="tier-2" className="transition-all duration-500 ease-out">
              <polygon
                points="76,114 120,134 120,141 76,121"
                fill="url(#canopyLeft)"
              />
              <polygon
                points="120,134 164,114 164,121 120,141"
                fill="url(#canopyRight)"
              />
              <polygon
                points="120,94 164,114 120,134 76,114"
                fill="url(#canopyTop)"
                stroke="#059669"
                strokeWidth="0.8"
              />
            </g>
          )}

          {/* Tier 3 */}
          {tiersRemaining >= 3 && (
            <g id="tier-3" className="transition-all duration-500 ease-out">
              <polygon
                points="84,94 120,111 120,118 84,101"
                fill="url(#canopyLeft)"
              />
              <polygon
                points="120,111 156,94 156,101 120,118"
                fill="url(#canopyRight)"
              />
              <polygon
                points="120,77 156,94 120,111 84,94"
                fill="url(#canopyTop)"
                stroke="#059669"
                strokeWidth="0.8"
              />
            </g>
          )}

          {/* Tier 4 */}
          {tiersRemaining >= 4 && (
            <g id="tier-4" className="transition-all duration-500 ease-out">
              <polygon
                points="93,76 120,89 120,95 93,82"
                fill="url(#canopyLeft)"
              />
              <polygon
                points="120,89 147,76 147,82 120,95"
                fill="url(#canopyRight)"
              />
              <polygon
                points="120,63 147,76 120,89 93,76"
                fill="url(#canopyTop)"
                stroke="#059669"
                strokeWidth="0.8"
              />
            </g>
          )}

          {/* Tier 5 (Top Apex) */}
          {tiersRemaining >= 5 && (
            <g id="tier-5" className="transition-all duration-500 ease-out">
              <polygon
                points="102,59 120,68 120,73 102,64"
                fill="url(#canopyLeft)"
              />
              <polygon
                points="120,68 138,59 138,64 120,73"
                fill="url(#canopyRight)"
              />
              <polygon
                points="120,50 138,59 120,68 102,59"
                fill="#6EE7B7"
                stroke="#10B981"
                strokeWidth="0.8"
              />
            </g>
          )}
        </svg>

        {/* Floating Tier Remaining Badge */}
        <div className="absolute top-2 right-2">
          {tiersRemaining > 0 ? (
            <Badge variant="live" size="sm">
              {tiersRemaining} / 5 Tiers
            </Badge>
          ) : (
            <Badge variant="pending" size="sm">
              Sapling Sprouting
            </Badge>
          )}
        </div>
      </div>

      {/* Details & Honest Math (Tasks 1, 2, 3) */}
      {showDetails && (
        <div className="w-full mt-3 space-y-2 text-center">
          {/* Honest Metric text */}
          <p className="text-xs sm:text-sm font-semibold text-[var(--text)] leading-relaxed">
            You have printed{" "}
            <span className="font-extrabold font-mono text-[var(--text)] underline decoration-[#3DD68C]">
              {sheets.toLocaleString()}
            </span>{" "}
            {sheets === 1 ? "sheet" : "sheets"}, roughly{" "}
            <span className="font-extrabold font-mono text-[var(--accent)]">
              {percentageDisplay}
            </span>{" "}
            of one tree{" "}
            <span className="text-[var(--text-muted)] font-normal">
              (approximate)
            </span>
            .
          </p>

          {/* Gentle Nudge */}
          <p className="text-[11px] text-[var(--text-muted)] italic">
            Sharing a PDF digitally saves paper.
          </p>

          {/* Month with No Printing Celebration (Task 4) */}
          {showCelebration && (
            <div className="mt-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left flex items-start gap-3 relative overflow-hidden animate-confetti-banner">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
                <Award className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Month Without Printing Award
                  </h4>
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-snug">
                  Zero sheets printed in the past 30 days! You are actively
                  helping conserve forest ecosystems.
                </p>
              </div>
            </div>
          )}

          {/* Celebration replay toggle if month is zero-print */}
          {hasNoPrintsLast30Days && !showCelebration && (
            <Button3D
              variant="outline"
              size="sm"
              onClick={() => setShowCelebration(true)}
              className="text-[11px] mt-1"
            >
              <Sparkles className="w-3 h-3 mr-1 text-amber-500" /> View 30-Day
              Eco Award
            </Button3D>
          )}
        </div>
      )}

      {/* Scoped CSS animations with prefers-reduced-motion fallback */}
      <style jsx>{`
        @keyframes logAppear {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          70% {
            transform: scale(1.15);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes saplingSprout {
          0% {
            transform: scale(0.2);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes confettiBanner {
          0% {
            opacity: 0;
            transform: translateY(6px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-log-appear {
          animation: logAppear 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)
            forwards;
          transform-origin: center;
        }

        .animate-sapling-sprout {
          animation: saplingSprout 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)
            forwards;
          transform-origin: 165px 186px;
        }

        .animate-confetti-banner {
          animation: confettiBanner 0.4s ease-out forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-log-appear,
          .animate-sapling-sprout,
          .animate-confetti-banner {
            animation: none !important;
            transition: none !important;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * FootprintTreeCard
 * Polished container card for the customer dashboard and job complete screens.
 */
export function FootprintTreeCard({
  sheetsPrintedTotal = 0,
  hasNoPrintsLast30Days = false,
  className = "",
}: {
  sheetsPrintedTotal: number;
  hasNoPrintsLast30Days?: boolean;
  className?: string;
}) {
  return (
    <Card3D className={`p-5 bg-[var(--surface)] ${className}`}>
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)] mb-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-sm">
            🌳
          </span>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--text)]">
              Paper Footprint Tree
            </h3>
            <p className="text-[10px] text-[var(--text-muted)]">
              Playful visual scale &bull; 10 sheets per tier
            </p>
          </div>
        </div>

        <Badge variant="live" size="sm">
          Eco Impact
        </Badge>
      </div>

      <FootprintTree
        sheetsPrintedTotal={sheetsPrintedTotal}
        hasNoPrintsLast30Days={hasNoPrintsLast30Days}
      />
    </Card3D>
  );
}
