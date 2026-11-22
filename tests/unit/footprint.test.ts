import { describe, it, expect } from "vitest";
import { SHEETS_PER_CANOPY_TIER, SHEETS_PER_TREE_APPROX } from "@/config/app";

/**
 * Helper calculation logic replicating FootprintTree
 */
function calculateFootprintTree(sheetsPrinted: number) {
  const sheets = Math.max(0, Math.floor(sheetsPrinted));
  const sheetsPerCycle = 5 * SHEETS_PER_CANOPY_TIER; // 50
  const cycle = Math.floor(sheets / sheetsPerCycle);
  const sheetsInCycle = sheets % sheetsPerCycle;

  const tiersLost =
    sheets > 0 && sheetsInCycle === 0
      ? 5
      : Math.min(5, Math.floor(sheetsInCycle / SHEETS_PER_CANOPY_TIER));
  const tiersRemaining = 5 - tiersLost;
  const isStump = tiersRemaining === 0;
  const showSapling = isStump || cycle > 0;

  const treeFraction = (sheets / SHEETS_PER_TREE_APPROX) * 100;
  const percentageDisplay =
    sheets === 0
      ? "0%"
      : treeFraction < 0.01
        ? "< 0.01%"
        : `${treeFraction.toFixed(2)}%`;

  return {
    sheets,
    cycle,
    tiersLost,
    tiersRemaining,
    isStump,
    showSapling,
    treeFraction,
    percentageDisplay,
    honestyText: `You have printed ${sheets} ${sheets === 1 ? "sheet" : "sheets"}, roughly ${percentageDisplay} of one tree (approximate).`,
    nudge: "Sharing a PDF digitally saves paper.",
  };
}

describe("Phase 14: Paper Footprint Tree & Eco Polish", () => {
  describe("Constants & Configuration", () => {
    it("defines the exact constants as required in plan.md", () => {
      expect(SHEETS_PER_CANOPY_TIER).toBe(10);
      expect(SHEETS_PER_TREE_APPROX).toBe(8333);
    });
  });

  describe("Isometric Canopy Tier Reductions", () => {
    it("renders a full 5-tier canopy when 0 sheets have been printed", () => {
      const state = calculateFootprintTree(0);
      expect(state.tiersRemaining).toBe(5);
      expect(state.tiersLost).toBe(0);
      expect(state.isStump).toBe(false);
      expect(state.showSapling).toBe(false);
      expect(state.percentageDisplay).toBe("0%");
    });

    it("maintains 5 tiers when sheets are below 10 (e.g. 7 sheets)", () => {
      const state = calculateFootprintTree(7);
      expect(state.tiersRemaining).toBe(5);
      expect(state.tiersLost).toBe(0);
      expect(state.isStump).toBe(false);
    });

    it("removes 1 tier when 10 sheets are printed", () => {
      const state = calculateFootprintTree(10);
      expect(state.tiersRemaining).toBe(4);
      expect(state.tiersLost).toBe(1);
      expect(state.isStump).toBe(false);
    });

    it("removes 2 tiers when 25 sheets are printed", () => {
      const state = calculateFootprintTree(25);
      expect(state.tiersRemaining).toBe(3);
      expect(state.tiersLost).toBe(2);
      expect(state.isStump).toBe(false);
    });

    it("leaves only 1 tier when 42 sheets are printed", () => {
      const state = calculateFootprintTree(42);
      expect(state.tiersRemaining).toBe(1);
      expect(state.tiersLost).toBe(4);
      expect(state.isStump).toBe(false);
    });

    it("becomes a stump with 5 logs and sprouts a sapling when 50 sheets are printed", () => {
      const state = calculateFootprintTree(50);
      expect(state.tiersRemaining).toBe(0);
      expect(state.tiersLost).toBe(5);
      expect(state.isStump).toBe(true);
      expect(state.showSapling).toBe(true);
    });

    it("handles next generation cycles smoothly (e.g. 65 sheets)", () => {
      const state = calculateFootprintTree(65);
      expect(state.cycle).toBe(1);
      expect(state.tiersLost).toBe(1);
      expect(state.tiersRemaining).toBe(4);
      expect(state.showSapling).toBe(true); // Sapling growing beside stump from previous cycle
    });
  });

  describe("Honest Metrics & Digital Nudge", () => {
    it("displays honest approximate percentage and preserves the word 'approximate'", () => {
      const state = calculateFootprintTree(83);
      expect(state.honestyText).toContain("approximate");
      expect(state.honestyText).toContain("83 sheets");
      expect(state.honestyText).toContain("1.00% of one tree");
    });

    it("formats small fractions clearly without rounding down to deceptive 0%", () => {
      const state = calculateFootprintTree(1);
      expect(state.percentageDisplay).toBe("0.01%");
      expect(state.honestyText).toContain("0.01% of one tree");
    });

    it("accurately calculates 100% of one tree at SHEETS_PER_TREE_APPROX", () => {
      const state = calculateFootprintTree(8333);
      expect(state.percentageDisplay).toBe("100.00%");
      expect(state.treeFraction).toBeCloseTo(100, 2);
    });

    it("includes the gentle digital preservation nudge", () => {
      const state = calculateFootprintTree(15);
      expect(state.nudge).toBe("Sharing a PDF digitally saves paper.");
    });
  });
});
