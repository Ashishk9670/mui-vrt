// Live, runnable example: points mui-vrt at the public MUI docs site
// (no local app needed) to prove the tool works against any site's real
// DOM, not just a fixture we control.
//
// @type {import("mui-vrt").SiteConfig}
module.exports = {
  site: "mui.com docs — Button",
  baseUrl: "https://mui.com",
  defaultViewport: { width: 1280, height: 900 },
  defaultPixelThreshold: 0.02,
  defaultContrastThreshold: 4.5,

  scenarios: [
    {
      name: "contained-primary-button",
      url: "/material-ui/react-button/",
      selector: ".MuiButton-contained.MuiButton-colorPrimary",
    },
    {
      name: "contained-primary-button-hover",
      url: "/material-ui/react-button/",
      selector: ".MuiButton-contained.MuiButton-colorPrimary",
      state: "hover",
    },
    {
      name: "disabled-contained-button",
      url: "/material-ui/react-button/",
      selector: ".MuiButton-contained.Mui-disabled",
      // Disabled controls are conventionally exempt from WCAG AA (MUI's own
      // default disabled state measures ~1.85:1) — set low so this only
      // fails on an absolute floor, not the expected baseline. The relative
      // drop check (>15% vs. baseline) still catches a real regression.
      contrastThreshold: 1,
    },
  ],
};
