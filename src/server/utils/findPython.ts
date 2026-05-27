import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const COMMON_PATHS = [
  "C:\\Program Files\\Python313\\python.exe",
  "C:\\Program Files\\Python312\\python.exe",
  "C:\\Program Files\\Python311\\python.exe",
  "C:\\Program Files\\Python310\\python.exe",
  process.env.LOCALAPPDATA + "\\Programs\\Python\\Python313\\python.exe",
  process.env.LOCALAPPDATA + "\\Programs\\Python\\Python312\\python.exe",
  process.env.LOCALAPPDATA + "\\Programs\\Python\\Python311\\python.exe",
  process.env.LOCALAPPDATA + "\\Programs\\Python\\Python310\\python.exe",
].filter(Boolean);

let cachedPython: string | null = null;

export function findPython(): string {
  if (cachedPython) return cachedPython;

  const pathFile = path.join(os.tmpdir(), ".python-path");
  if (fs.existsSync(pathFile)) {
    const p = fs.readFileSync(pathFile, "utf-8").trim();
    if (p && fs.existsSync(p)) {
      cachedPython = p;
      return p;
    }
  }

  try {
    const result = execSync("where python", { encoding: "utf-8", timeout: 5000 });
    const lines = result.trim().split("\r\n").filter(Boolean);
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes("windowapps")) continue;
      if (fs.existsSync(line)) {
        cachedPython = line;
        return line;
      }
    }
  } catch {}

  for (const p of COMMON_PATHS) {
    if (p && fs.existsSync(p)) {
      cachedPython = p;
      return p;
    }
  }

  cachedPython = "python";
  return "python";
}
