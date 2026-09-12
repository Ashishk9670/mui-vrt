import fs from "node:fs";
import path from "node:path";
import { captureScenarios } from "./capture";
import { outputDir } from "./config";
import { diffPngs } from "./diff/pixelDiff";
import { diffContrast } from "./diff/contrastDiff";
import type { RunReport, ScenarioResult, ScenarioStatus, SiteConfig } from "./types";

const DEFAULT_PIXEL_THRESHOLD = 0.01; // 1% of pixels
const DEFAULT_CONTRAST_THRESHOLD = 4.5; // WCAG AA, normal text

function worse(a: ScenarioStatus, b: ScenarioStatus): ScenarioStatus {
  const rank: Record<ScenarioStatus, number> = { pass: 0, new: 1, warn: 2, fail: 3 };
  return rank[b] > rank[a] ? b : a;
}

export async function runCompare(config: SiteConfig): Promise<RunReport> {
  const root = outputDir(config);
  const baselineDir = path.join(root, "baseline");
  const currentDir = path.join(root, "current");
  const diffDir = path.join(root, "diff");
  fs.mkdirSync(baselineDir, { recursive: true });
  fs.mkdirSync(diffDir, { recursive: true });
  fs.rmSync(currentDir, { recursive: true, force: true });

  const artifacts = await captureScenarios(config, currentDir);
  const results: ScenarioResult[] = [];

  for (const artifact of artifacts) {
    const { scenario } = artifact;
    const baselinePng = path.join(baselineDir, `${scenario.name}.png`);
    const baselineMeta = path.join(baselineDir, `${scenario.name}.json`);
    const pixelThreshold = scenario.pixelThreshold ?? config.defaultPixelThreshold ?? DEFAULT_PIXEL_THRESHOLD;
    const contrastThreshold =
      scenario.contrastThreshold ?? config.defaultContrastThreshold ?? DEFAULT_CONTRAST_THRESHOLD;

    if (!fs.existsSync(baselinePng)) {
      // First time this scenario has been captured: seed the baseline and report it as "new".
      fs.copyFileSync(artifact.pngPath, baselinePng);
      fs.copyFileSync(artifact.metaPath, baselineMeta);
      results.push({
        name: scenario.name,
        status: "new",
        baselinePngPath: null,
        currentPngPath: artifact.pngPath,
        pixelDiff: null,
        contrastDiff: null,
      });
      continue;
    }

    const diffPngPath = path.join(diffDir, `${scenario.name}.png`);
    const pixelDiff = diffPngs(baselinePng, artifact.pngPath, diffPngPath);
    const pixelStatus: ScenarioStatus = pixelDiff.ratio > pixelThreshold ? "fail" : "pass";

    const baselineMetaJson = JSON.parse(fs.readFileSync(baselineMeta, "utf8"));
    const contrastDiff = diffContrast(
      baselineMetaJson.contrastRatio,
      artifact.contrastRatio,
      contrastThreshold,
    );

    results.push({
      name: scenario.name,
      status: worse(pixelStatus, contrastDiff.status),
      baselinePngPath: baselinePng,
      currentPngPath: artifact.pngPath,
      pixelDiff,
      contrastDiff,
    });
  }

  const report: RunReport = {
    site: config.site,
    generatedAt: new Date().toISOString(),
    results,
    pass: results.every((r) => r.status !== "fail"),
  };

  fs.writeFileSync(path.join(root, "report.json"), JSON.stringify(report, null, 2));
  return report;
}

export function approveScenarios(config: SiteConfig, names: string[] | "all"): string[] {
  const root = outputDir(config);
  const baselineDir = path.join(root, "baseline");
  const currentDir = path.join(root, "current");
  fs.mkdirSync(baselineDir, { recursive: true });

  const targets =
    names === "all" ? config.scenarios.map((s) => s.name) : names;
  const approved: string[] = [];

  for (const name of targets) {
    const pngSrc = path.join(currentDir, `${name}.png`);
    const metaSrc = path.join(currentDir, `${name}.json`);
    if (!fs.existsSync(pngSrc)) continue;
    fs.copyFileSync(pngSrc, path.join(baselineDir, `${name}.png`));
    fs.copyFileSync(metaSrc, path.join(baselineDir, `${name}.json`));
    approved.push(name);
  }
  return approved;
}
