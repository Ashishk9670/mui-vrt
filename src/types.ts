import type { Page } from "playwright";

export type ColorScheme = "light" | "dark" | "no-preference";
export type ScenarioState = "default" | "hover" | "focus" | "active";

export interface Viewport {
  width: number;
  height: number;
}

export interface Scenario {
  /** Unique, filesystem-safe name. Used as the baseline/current file key. */
  name: string;
  /** Absolute URL, or a path resolved against config.baseUrl. */
  url: string;
  /** CSS selector to screenshot. Omit to capture the full page. */
  selector?: string;
  /** Selector to wait for before capturing (defaults to `selector` if set). */
  waitFor?: string;
  /** Simulated interaction state before capture. */
  state?: ScenarioState;
  viewport?: Viewport;
  colorScheme?: ColorScheme;
  /** Pixel mismatch ratio (0-1) above which this scenario fails. Overrides config default. */
  pixelThreshold?: number;
  /** Minimum acceptable WCAG contrast ratio for the sampled text/background pair. */
  contrastThreshold?: number;
}

export interface SiteConfig {
  /** Human-readable name shown in the report. */
  site: string;
  baseUrl?: string;
  outputDir?: string;
  defaultViewport?: Viewport;
  /** Default pixel mismatch ratio (0-1) above which a scenario fails. */
  defaultPixelThreshold?: number;
  /** Default minimum WCAG contrast ratio. */
  defaultContrastThreshold?: number;
  scenarios: Scenario[];
  /** Optional hook for auth/login/cookie-consent, run once per scenario before capture. */
  beforeCapture?: (page: Page, scenario: Scenario) => Promise<void>;
}

export interface ComputedStyleSample {
  color: string;
  /** First non-transparent background in the ancestor chain — for display only. */
  backgroundColor: string;
  fontSize: string;
  fontWeight: string;
}

export interface CaptureArtifact {
  scenario: Scenario;
  pngPath: string;
  metaPath: string;
  style: ComputedStyleSample;
  contrastRatio: number | null;
}

export type ScenarioStatus = "pass" | "warn" | "fail" | "new";

export interface PixelDiffResult {
  mismatchedPixels: number;
  totalPixels: number;
  ratio: number;
  diffPngPath: string | null;
}

export interface ContrastDiffResult {
  baselineRatio: number | null;
  currentRatio: number | null;
  delta: number | null;
  status: ScenarioStatus;
  reason: string;
}

export interface ScenarioResult {
  name: string;
  status: ScenarioStatus;
  baselinePngPath: string | null;
  currentPngPath: string;
  pixelDiff: PixelDiffResult | null;
  contrastDiff: ContrastDiffResult | null;
}

export interface RunReport {
  site: string;
  generatedAt: string;
  results: ScenarioResult[];
  pass: boolean;
}
