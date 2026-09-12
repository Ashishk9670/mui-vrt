import type { ContrastDiffResult } from "../types";

const RELATIVE_DROP_WARN = 0.15; // flag a >15% relative drop even if still above threshold

/**
 * Compares baseline vs. current WCAG contrast ratio for the same element.
 * This catches regressions a pixel diff can miss or over-flag: a subtle
 * color-token change can move contrast ratio a lot while moving few pixels,
 * and normal anti-aliasing noise moves many pixels while changing nothing
 * perceptually.
 */
export function diffContrast(
  baselineRatio: number | null,
  currentRatio: number | null,
  threshold: number,
): ContrastDiffResult {
  if (baselineRatio === null || currentRatio === null) {
    return {
      baselineRatio,
      currentRatio,
      delta: null,
      status: "warn",
      reason: "Could not resolve a solid foreground/background color pair to measure contrast.",
    };
  }

  const delta = currentRatio - baselineRatio;

  if (currentRatio < threshold) {
    return {
      baselineRatio,
      currentRatio,
      delta,
      status: "fail",
      reason: `Contrast ratio ${currentRatio.toFixed(2)}:1 is below the ${threshold}:1 threshold.`,
    };
  }

  if (baselineRatio > 0 && currentRatio < baselineRatio * (1 - RELATIVE_DROP_WARN)) {
    return {
      baselineRatio,
      currentRatio,
      delta,
      status: "warn",
      reason: `Contrast dropped ${Math.abs((delta / baselineRatio) * 100).toFixed(0)}% vs. baseline (${baselineRatio.toFixed(2)}:1 -> ${currentRatio.toFixed(2)}:1), though still above threshold.`,
    };
  }

  return {
    baselineRatio,
    currentRatio,
    delta,
    status: "pass",
    reason: "No significant contrast regression.",
  };
}
