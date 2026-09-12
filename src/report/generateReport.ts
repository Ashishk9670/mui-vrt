import fs from "node:fs";
import type { RunReport, ScenarioResult, ScenarioStatus } from "../types";

function toDataUri(pngPath: string | null): string | null {
  if (!pngPath || !fs.existsSync(pngPath)) return null;
  return `data:image/png;base64,${fs.readFileSync(pngPath).toString("base64")}`;
}

const STATUS_COLOR: Record<ScenarioStatus, string> = {
  pass: "#2e7d32",
  warn: "#ed6c02",
  fail: "#d32f2f",
  new: "#0288d1",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function renderScenario(result: ScenarioResult): string {
  const baseline = toDataUri(result.baselinePngPath);
  const current = toDataUri(result.currentPngPath);
  const diff = result.pixelDiff ? toDataUri(result.pixelDiff.diffPngPath) : null;
  const color = STATUS_COLOR[result.status];

  const pixelLine = result.pixelDiff
    ? `${(result.pixelDiff.ratio * 100).toFixed(2)}% of pixels changed (${result.pixelDiff.mismatchedPixels}/${result.pixelDiff.totalPixels})`
    : "no baseline yet";

  const contrastLine = result.contrastDiff
    ? escapeHtml(result.contrastDiff.reason)
    : "not measured";

  const images = [
    ["Baseline", baseline],
    ["Current", current],
    ["Diff", diff],
  ]
    .filter(([, src]) => src)
    .map(
      ([label, src]) =>
        `<figure><img src="${src}" alt="${label}"><figcaption>${label}</figcaption></figure>`,
    )
    .join("");

  return `
    <section class="scenario">
      <header>
        <h2>${escapeHtml(result.name)}</h2>
        <span class="badge" style="background:${color}">${result.status.toUpperCase()}</span>
      </header>
      <p class="metric">Pixel diff: ${pixelLine}</p>
      <p class="metric">Contrast: ${contrastLine}</p>
      <div class="images">${images}</div>
    </section>
  `;
}

export function renderHtmlReport(report: RunReport): string {
  const order: Record<ScenarioStatus, number> = { fail: 0, warn: 1, new: 2, pass: 3 };
  const sorted = [...report.results].sort((a, b) => order[a.status] - order[b.status]);
  const summary = `${report.results.filter((r) => r.status === "fail").length} failed, ${
    report.results.filter((r) => r.status === "warn").length
  } warnings, ${report.results.filter((r) => r.status === "new").length} new, ${
    report.results.filter((r) => r.status === "pass").length
  } passed`;

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>mui-vrt report — ${escapeHtml(report.site)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 24px; background: #f5f5f5; color: #1a1a1a; }
  h1 { margin: 0 0 4px; }
  .meta { color: #555; margin-bottom: 24px; }
  .scenario { background: #fff; border-radius: 8px; padding: 16px 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
  .scenario header { display: flex; align-items: center; gap: 12px; }
  .scenario h2 { font-size: 16px; margin: 0; }
  .badge { color: #fff; font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; letter-spacing: 0.03em; }
  .metric { font-size: 13px; color: #444; margin: 6px 0; }
  .images { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
  figure { margin: 0; text-align: center; }
  figure img { max-width: 280px; max-height: 280px; border: 1px solid #ddd; background: repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 50% / 16px 16px; }
  figcaption { font-size: 11px; color: #666; margin-top: 4px; }
</style>
</head>
<body>
  <h1>mui-vrt — ${escapeHtml(report.site)}</h1>
  <p class="meta">${escapeHtml(report.generatedAt)} · ${summary} · overall: ${report.pass ? "PASS" : "FAIL"}</p>
  ${sorted.map(renderScenario).join("\n")}
</body>
</html>`;
}

export function writeHtmlReport(report: RunReport, outPath: string): void {
  fs.writeFileSync(outPath, renderHtmlReport(report));
}
