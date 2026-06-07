import { cpSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const defaultTarget = process.platform === "win32"
  ? path.join(process.env.LOCALAPPDATA ?? "", "FoundryVTT", "Data", "modules", "window-controls")
  : path.join(process.env.HOME ?? "", ".local", "share", "FoundryVTT", "Data", "modules", "window-controls");

const target = process.env.FOUNDRY_MODULE_PATH
  ? path.resolve(process.env.FOUNDRY_MODULE_PATH)
  : defaultTarget;

if (!target || (!process.env.FOUNDRY_MODULE_PATH && !process.env.LOCALAPPDATA && process.platform === "win32")) {
  console.error("Could not resolve Foundry module path. Set FOUNDRY_MODULE_PATH to your module folder.");
  process.exit(1);
}

mkdirSync(target, { recursive: true });

const entries = [
  "module.json",
  "windowcontrols.js",
  "windowcontrols.css",
  "lang",
  "scripts",
  "templates",
];

for (const entry of entries) {
  const source = path.join(repoRoot, entry);
  if (!existsSync(source)) {
    console.warn(`Skip missing: ${entry}`);
    continue;
  }
  const dest = path.join(target, entry);
  cpSync(source, dest, { recursive: true, force: true });
  console.log(`Copied ${entry} -> ${dest}`);
}

console.log(`\nDeployed to ${target}`);
