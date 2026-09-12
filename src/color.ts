export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

const WHITE: RGBA = { r: 255, g: 255, b: 255, a: 1 };

/** Parses `rgb(...)` / `rgba(...)` strings as returned by getComputedStyle. */
export function parseColor(input: string): RGBA | null {
  if (input === "transparent") return { r: 0, g: 0, b: 0, a: 0 };
  const match = input.match(
    /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)/i,
  );
  if (!match) return null;
  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
}

/** Alpha-composites `top` over `bottom` ("source-over"), returning an opaque-ish result. */
export function compositeOver(top: RGBA, bottom: RGBA): RGBA {
  const outA = top.a + bottom.a * (1 - top.a);
  if (outA === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (tc: number, bc: number) => (tc * top.a + bc * bottom.a * (1 - top.a)) / outA;
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: outA };
}

/**
 * Composites a chain of background-color strings — ordered from the element
 * itself outward to the document root — down onto an opaque white canvas.
 * Needed because translucent backgrounds (common in MUI disabled/overlay
 * states) can't be read as a single computed style; the visible color is a
 * stack of translucent layers.
 */
export function resolveEffectiveBackground(chainElementToRoot: string[]): RGBA {
  let bg: RGBA = WHITE;
  for (let i = chainElementToRoot.length - 1; i >= 0; i--) {
    const layer = parseColor(chainElementToRoot[i]) ?? { r: 0, g: 0, b: 0, a: 0 };
    bg = compositeOver(layer, bg);
  }
  return bg;
}

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance({ r, g, b }: RGBA): number {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/** WCAG 2.x contrast ratio between two opaque colors, in [1, 21]. */
export function contrastRatio(a: RGBA, b: RGBA): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Computes the WCAG contrast ratio between an element's text color and its
 * effective (alpha-composited) background. `backgroundChain` must be ordered
 * from the element itself outward to the document root — see
 * `resolveEffectiveBackground`. The foreground is itself composited over the
 * resolved background, since translucent text (e.g. MUI's disabled state)
 * blends with whatever is beneath it too.
 */
export function contrastRatioFromComputedStyle(
  foreground: string,
  backgroundChain: string[],
): number | null {
  const fg = parseColor(foreground);
  if (!fg) return null;
  const bg = resolveEffectiveBackground(backgroundChain);
  const effectiveFg = compositeOver(fg, bg);
  return contrastRatio(effectiveFg, bg);
}
