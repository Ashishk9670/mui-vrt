// Self-contained fixture used to prove the diff pipeline actually flags a
// regression (rather than just running clean). See README "Verifying the
// tool catches regressions" for how this is used.
const path = require("node:path");

// @type {import("mui-vrt").SiteConfig}
module.exports = {
  site: "regression-fixture",
  defaultPixelThreshold: 0.01,
  defaultContrastThreshold: 4.5,
  scenarios: [
    {
      name: "fixture-button",
      url: "file://" + path.join(__dirname, "regression-fixture.html"),
      selector: "#target",
    },
  ],
};
