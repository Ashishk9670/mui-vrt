import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { resolveUrl } from "./config";
import { contrastRatioFromComputedStyle, parseColor } from "./color";
import type { CaptureArtifact, ComputedStyleSample, Scenario, SiteConfig } from "./types";

const DISABLE_MOTION_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
`;

interface RawStyleChain {
  color: string;
  /** background-color of el, then each ancestor in turn, out to <html>. */
  backgroundChain: string[];
  fontSize: string;
  fontWeight: string;
}

/** Collects raw computed styles in-browser; color math happens in Node (see src/color.ts). */
function collectStyleChain(el: Element): RawStyleChain {
  const backgroundChain: string[] = [];
  let node: Element | null = el;
  while (node) {
    backgroundChain.push(getComputedStyle(node).backgroundColor);
    node = node.parentElement;
  }
  const style = getComputedStyle(el);
  return { color: style.color, backgroundChain, fontSize: style.fontSize, fontWeight: style.fontWeight };
}

async function applyState(page: import("playwright").Page, selector: string, state: Scenario["state"]) {
  if (!state || state === "default") return;
  const locator = page.locator(selector).first();
  if (state === "hover") await locator.hover();
  else if (state === "focus") await locator.focus();
  else if (state === "active") {
    const box = await locator.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
    }
  }
}

export async function captureScenarios(
  config: SiteConfig,
  destDir: string,
): Promise<CaptureArtifact[]> {
  fs.mkdirSync(destDir, { recursive: true });
  const browser: Browser = await chromium.launch();
  const artifacts: CaptureArtifact[] = [];

  try {
    for (const scenario of config.scenarios) {
      const viewport = scenario.viewport ?? config.defaultViewport ?? { width: 1280, height: 800 };
      const context = await browser.newContext({
        viewport,
        colorScheme: scenario.colorScheme ?? "light",
      });
      const page = await context.newPage();
      try {
        await page.goto(resolveUrl(config, scenario.url), { waitUntil: "networkidle" });
        await page.addStyleTag({ content: DISABLE_MOTION_CSS });

        const waitSelector = scenario.waitFor ?? scenario.selector;
        if (waitSelector) await page.waitForSelector(waitSelector, { state: "visible" });

        if (config.beforeCapture) await config.beforeCapture(page, scenario);
        if (scenario.selector) await applyState(page, scenario.selector, scenario.state);

        const locator = scenario.selector ? page.locator(scenario.selector).first() : page.locator("body");
        const pngPath = path.join(destDir, `${scenario.name}.png`);
        await locator.screenshot({ path: pngPath });

        const raw = await locator.evaluate(collectStyleChain);
        const contrastRatio = contrastRatioFromComputedStyle(raw.color, raw.backgroundChain);
        const firstOpaqueBg =
          raw.backgroundChain.find((c) => (parseColor(c)?.a ?? 0) > 0) ??
          raw.backgroundChain[raw.backgroundChain.length - 1];
        const style: ComputedStyleSample = {
          color: raw.color,
          backgroundColor: firstOpaqueBg,
          fontSize: raw.fontSize,
          fontWeight: raw.fontWeight,
        };

        const metaPath = path.join(destDir, `${scenario.name}.json`);
        fs.writeFileSync(metaPath, JSON.stringify({ style, contrastRatio }, null, 2));

        artifacts.push({ scenario, pngPath, metaPath, style, contrastRatio });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }

  return artifacts;
}
