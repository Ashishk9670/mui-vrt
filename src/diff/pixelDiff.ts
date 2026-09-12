import fs from "node:fs";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import type { PixelDiffResult } from "../types";

/**
 * Pads the smaller of two images with transparent pixels so pixelmatch can
 * compare them — a size mismatch (e.g. a component grew taller) is itself
 * a regression signal, not something we should silently crop away.
 */
function toCommonCanvas(a: PNG, b: PNG): { a: PNG; b: PNG; width: number; height: number } {
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  if (a.width === width && a.height === height && b.width === width && b.height === height) {
    return { a, b, width, height };
  }
  const pad = (img: PNG) => {
    const out = new PNG({ width, height });
    PNG.bitblt(img, out, 0, 0, img.width, img.height, 0, 0);
    return out;
  };
  return { a: pad(a), b: pad(b), width, height };
}

export function diffPngs(
  baselinePath: string,
  currentPath: string,
  diffOutPath: string,
): PixelDiffResult {
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const current = PNG.sync.read(fs.readFileSync(currentPath));
  const { a, b, width, height } = toCommonCanvas(baseline, current);

  const diff = new PNG({ width, height });
  const mismatchedPixels = pixelmatch(a.data, b.data, diff.data, width, height, {
    threshold: 0.1,
  });

  fs.writeFileSync(diffOutPath, PNG.sync.write(diff));

  const totalPixels = width * height;
  return {
    mismatchedPixels,
    totalPixels,
    ratio: totalPixels === 0 ? 0 : mismatchedPixels / totalPixels,
    diffPngPath: diffOutPath,
  };
}
