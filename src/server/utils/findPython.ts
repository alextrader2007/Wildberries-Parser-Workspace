import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const DRIVES = ["C:", "D:", "E:", "F:"];
const PY_VERSIONS = ["313", "312", "311", "310"];

function* enumeratePaths(): Generator<string> {
  for (const drive of DRIVES) {
    for (const ver of PY_VERSIONS) {
      yield `${drive}\\Program Files\\Python${ver}\\python.exe`;
      yield `${drive}\\Programs\\Python\\Python${ver}\\python.exe`;
    }
  }
  const local = process.env.LOCALAPPDATA;
  if (local) {
    for (const ver of PY_VERSIONS) {
      yield `${local}\\Programs\\Python\\Python${ver}\\python.exe`;
    }
  }
}

let cachedPython: string | null = null;

export function findPython(): string {
  if (cachedPython) return cachedPython;

  const pathFile = path.join(os.tmpdir(), ".python-path");
  if (fs.existsSync(pathFile)) {
    const p = fs.readFileSync(pathFile, "utf-8").trim();
    if (p && fs.existsSync(p)) {
      cachedPython = p;
      console.log(`[findPython] from .python-path: ${p}`);
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
        console.log(`[findPython] from where python: ${line}`);
        return line;
      }
    }
  } catch {}

  try {
    const result = execSync("py -3 -c \"import sys; print(sys.executable)\"", { encoding: "utf-8", timeout: 5000 });
    const py = result.trim();
    if (py && fs.existsSync(py)) {
      cachedPython = py;
      console.log(`[findPython] from py -3: ${py}`);
      return py;
    }
  } catch {}

  for (const p of enumeratePaths()) {
    if (fs.existsSync(p)) {
      cachedPython = p;
      console.log(`[findPython] from known path: ${p}`);
      return p;
    }
  }

  cachedPython = "python";
  console.log(`[findPython] fallback to "python"`);
  return "python";
}
