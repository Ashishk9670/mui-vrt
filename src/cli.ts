#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { loadConfig, outputDir } from "./config";
import { captureScenarios } from "./capture";
import { runCompare, approveScenarios } from "./compare";
import { writeHtmlReport } from "./report/generateReport";

const program = new Command();
program.name("mui-vrt").description("Lightweight visual regression + contrast diff tool for MUI components on any site");

program
  .command("init")
  .description("Scaffold a starter config file in the current directory")
  .option("-o, --out <path>", "config file path to write", "mui-vrt.config.js")
  .action((opts) => {
    const dest = path.resolve(process.cwd(), opts.out);
    if (fs.existsSync(dest)) {
      console.error(`Refusing to overwrite existing file: ${dest}`);
      process.exitCode = 1;
      return;
    }
    fs.copyFileSync(path.join(__dirname, "..", "examples", "starter.config.js"), dest);
    console.log(`Wrote ${dest}. Edit it, then run: mui-vrt compare --config ${opts.out}`);
  });

program
  .command("capture")
  .description("Capture screenshots for every scenario into the current/ output directory")
  .requiredOption("-c, --config <path>", "path to site config")
  .action(async (opts) => {
    const config = await loadConfig(opts.config);
    const dir = path.join(outputDir(config), "current");
    const artifacts = await captureScenarios(config, dir);
    console.log(`Captured ${artifacts.length} scenario(s) into ${dir}`);
  });

program
  .command("compare")
  .description("Capture current screenshots and diff them against the stored baseline")
  .requiredOption("-c, --config <path>", "path to site config")
  .option("--report <path>", "HTML report output path", "mui-vrt-report.html")
  .action(async (opts) => {
    const config = await loadConfig(opts.config);
    const report = await runCompare(config);
    writeHtmlReport(report, path.resolve(process.cwd(), opts.report));

    for (const r of report.results) {
      const label = r.status.toUpperCase().padEnd(4);
      console.log(`[${label}] ${r.name}`);
    }
    console.log(`\nReport written to ${opts.report}`);

    if (!report.pass) {
      console.error("\nRegressions found.");
      process.exitCode = 1;
    }
  });

program
  .command("approve")
  .description("Promote current screenshots to baseline for the given scenarios (or all)")
  .requiredOption("-c, --config <path>", "path to site config")
  .argument("[names...]", "scenario names to approve; omit to approve all")
  .action(async (names: string[], opts) => {
    const config = await loadConfig(opts.config);
    const approved = approveScenarios(config, names.length ? names : "all");
    console.log(`Approved ${approved.length} scenario(s): ${approved.join(", ")}`);
  });

program.parseAsync(process.argv);
