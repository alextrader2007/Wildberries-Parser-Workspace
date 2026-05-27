import path from "path";
import { existsSync } from "fs";
import { fileURLToPath } from "url";

/** Resolve project root directory regardless of ESM/CJS build context */
export function getProjectRoot(): string {
  let dirname: string | undefined;

  // CJS (built dist/server.cjs) – __dirname is dist/
  try {
    if (typeof __dirname === "string") dirname = __dirname;
  } catch { /* ESM – __dirname not available */ }

  if (dirname) {
    const candidate = path.resolve(dirname, "..");
    if (existsSync(path.join(candidate, "scripts"))) return candidate;
    return dirname; // fallback
  }

  // ESM (tsx dev) – import.meta.url points to this file
  if (typeof import.meta !== "undefined" && import.meta.url) {
    dirname = path.dirname(fileURLToPath(import.meta.url));
    // This file is at src/server/utils/paths.ts → up 3 levels to root
    return path.resolve(dirname, "../../..");
  }

  return process.cwd();
}

/** Resolve a path relative to the project root */
export function resolveRoot(...segments: string[]): string {
  return path.resolve(getProjectRoot(), ...segments);
}
