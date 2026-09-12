# mui-vrt

Lightweight visual regression + contrast diff tool. Built with MUI components
in mind, but the engine has no MUI dependency — point it at any site via a
config file.

Two independent checks run per scenario:

- **Pixel diff** ([pixelmatch](https://github.com/mapbox/pixelmatch)) — catches layout/spacing/color shifts.
- **Contrast diff** — reads the computed `color`/`background-color` for the captured element via the browser itself, computes the WCAG contrast ratio, and flags a regression when it drops below threshold or falls sharply vs. baseline. This catches a contrast regression a pixel diff can miss (small pixel delta, big perceptual/accessibility impact) and avoids false positives from anti-aliasing noise (many pixels differ, contrast unchanged).

## Install

```bash
npm install
npx playwright install chromium
npm run build
```

## Quick start

```bash
node dist/cli.js init                          # writes mui-vrt.config.js
node dist/cli.js compare --config mui-vrt.config.js
```

First run seeds the baseline (status `new`) for every scenario. Re-run after
a change and it diffs against that baseline. Open the generated
`mui-vrt-report.html` to see baseline/current/diff thumbnails side by side.

```bash
node dist/cli.js approve --config mui-vrt.config.js       # accept all current as new baseline
node dist/cli.js approve --config mui-vrt.config.js my-scenario  # accept just one
```

Try it against a real, live site with no setup — [examples/mui-docs.config.js](examples/mui-docs.config.js) points at mui.com's own Button docs page:

```bash
node dist/cli.js compare --config examples/mui-docs.config.js
```

### Verifying it actually catches a regression

[examples/regression-fixture.config.js](examples/regression-fixture.config.js) points at a tiny local HTML fixture so you can see a real failure, not just a clean run:

```bash
node dist/cli.js compare --config examples/regression-fixture.config.js   # seeds baseline, status: new
# edit examples/regression-fixture.html: change #1976d2 to a lighter blue like #90caf9
node dist/cli.js compare --config examples/regression-fixture.config.js   # now FAILs
```

That one-line color change drops the button's contrast ratio from 4.60:1 to
1.75:1 (below the 4.5:1 AA threshold) and moves ~77% of the button's pixels —
both checks catch it independently. Revert the color and re-run to see it
pass again.

## Config

A config is a plain Node module exporting a `SiteConfig` (see
[src/types.ts](src/types.ts)):

```js
module.exports = {
  site: "my-app",
  baseUrl: "http://localhost:3000",
  defaultPixelThreshold: 0.01,      // fail if >1% of pixels differ
  defaultContrastThreshold: 4.5,    // WCAG AA for normal text
  scenarios: [
    { name: "primary-button", url: "/components/buttons", selector: ".MuiButton-contained.MuiButton-colorPrimary" },
    { name: "primary-button-hover", url: "/components/buttons", selector: ".MuiButton-contained.MuiButton-colorPrimary", state: "hover" },
  ],
};
```

- `selector` — CSS selector to capture; omit to screenshot the full page. If a selector matches more than one element, the first is used.
- `state` — `"hover" | "focus" | "active"`, simulated before capture.
- `colorScheme` — `"light" | "dark"`.
- `beforeCapture(page, scenario)` — optional hook for login/cookie-consent/etc., since the config is a real JS module.

Per-scenario `pixelThreshold` / `contrastThreshold` override the config
defaults (e.g. loosen `contrastThreshold` for a disabled control).

## Output layout

```
.mui-vrt/
  baseline/<scenario>.png, .json   # commit these — reviewable in PRs
  current/<scenario>.png, .json    # this run's capture (gitignored)
  diff/<scenario>.png              # pixelmatch diff image (gitignored)
  report.json                      # machine-readable results (gitignored)
mui-vrt-report.html                # human-readable report (gitignored)
```

## CI

`compare` exits non-zero if any scenario's status is `fail`, so it plugs
straight into a CI gate. [.github/workflows/ci.yml](.github/workflows/ci.yml)
wires this up for this repo as three jobs:

- **build** — `npm ci` + `npm run build` (typecheck).
- **vrt-self-test** — runs `compare` against
  [examples/regression-fixture.config.js](examples/regression-fixture.config.js),
  a local `file://` fixture with its baseline committed to the repo. No
  network dependency, so this blocks the build on a real failure.
- **vrt-live-smoke** — runs `compare` against
  [examples/mui-docs.config.js](examples/mui-docs.config.js) (the live
  mui.com docs site) as a best-effort demo that the tool works against an
  external site. Marked `continue-on-error: true` since an external site can
  change or go down independently of this repo — it still uploads its HTML
  report as an artifact either way.

To wire this into your own app's repo instead, drop your own config in and
point the run step at it:

```yaml
- run: npx playwright install --with-deps chromium
- run: node dist/cli.js compare --config mui-vrt.config.js
- if: failure()
  uses: actions/upload-artifact@v4
  with: { name: mui-vrt-report, path: mui-vrt-report.html }
```

Commit `.mui-vrt/baseline/` to your repo so the diff is meaningful from the
first CI run, and review baseline changes in PRs the same way you'd review
any other generated-asset diff.
