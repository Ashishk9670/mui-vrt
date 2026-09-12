// mui-vrt site config. Point this at any site — nothing here is specific
// to how the tool itself works.
//
// @type {import("mui-vrt").SiteConfig}
module.exports = {
  site: "my-app",
  baseUrl: "http://localhost:3000",
  defaultViewport: { width: 1280, height: 800 },
  defaultPixelThreshold: 0.01, // fail if >1% of pixels differ
  defaultContrastThreshold: 4.5, // WCAG AA for normal text

  // Uncomment and fill in if the app needs auth before scenarios can run:
  // async beforeCapture(page, scenario) {
  //   await page.goto(new URL("/login", "http://localhost:3000").toString());
  //   await page.fill("#email", process.env.VRT_USER ?? "");
  //   await page.fill("#password", process.env.VRT_PASS ?? "");
  //   await page.click("button[type=submit]");
  //   await page.waitForURL("**/dashboard");
  // },

  // Selectors below match MUI v5/v6 class names (MuiButton-contained +
  // MuiButton-colorPrimary as separate classes). If a selector matches more
  // than one element, mui-vrt captures the first match — scope it further
  // (e.g. with a wrapping data-testid) if that's not the one you want.
  scenarios: [
    {
      name: "primary-button-default",
      url: "/components/buttons",
      selector: ".MuiButton-contained.MuiButton-colorPrimary",
    },
    {
      name: "primary-button-hover",
      url: "/components/buttons",
      selector: ".MuiButton-contained.MuiButton-colorPrimary",
      state: "hover",
    },
    {
      name: "primary-button-disabled",
      url: "/components/buttons",
      selector: ".MuiButton-contained.Mui-disabled",
      contrastThreshold: 1, // disabled controls are conventionally exempt from AA text contrast
    },
    {
      name: "app-dark-mode",
      url: "/",
      colorScheme: "dark",
    },
  ],
};
