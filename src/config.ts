import path from "node:path";
import type { SiteConfig } from "./types";

/**
 * Loads a site config. Supports `.js`/`.cjs` (CommonJS `module.exports = {...}`)
 * and `.json`. Config files are plain Node modules, so auth/login logic can be
 * expressed as a real `beforeCapture` function rather than JSON data.
 */
export async function loadConfig(configPath: string): Promise<SiteConfig> {
  const resolved = path.resolve(process.cwd(), configPath);
  const mod = require(resolved);
  const config: SiteConfig = mod.default ?? mod;

  if (!config || !Array.isArray(config.scenarios) || config.scenarios.length === 0) {
    throw new Error(
      `Config at ${resolved} must export a SiteConfig with a non-empty "scenarios" array.`,
    );
  }
  const names = new Set<string>();
  for (const scenario of config.scenarios) {
    if (!scenario.name || !scenario.url) {
      throw new Error(`Every scenario needs a "name" and a "url". Got: ${JSON.stringify(scenario)}`);
    }
    if (names.has(scenario.name)) {
      throw new Error(`Duplicate scenario name "${scenario.name}" — names must be unique.`);
    }
    names.add(scenario.name);
  }
  return config;
}

export function resolveUrl(config: SiteConfig, scenarioUrl: string): string {
  if (/^(https?|file):\/\//i.test(scenarioUrl)) return scenarioUrl;
  if (!config.baseUrl) {
    throw new Error(`Scenario url "${scenarioUrl}" is relative but config.baseUrl is not set.`);
  }
  return new URL(scenarioUrl, config.baseUrl).toString();
}

export function outputDir(config: SiteConfig): string {
  return path.resolve(process.cwd(), config.outputDir ?? ".mui-vrt");
}
