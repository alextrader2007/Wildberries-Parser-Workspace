import { Router } from "express";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { findPython } from "../utils/findPython";

const router = Router();

let cachedToken: string | null = null;
let cachedAt = 0;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

const myFilename = typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "";
const myDirname = myFilename ? path.dirname(myFilename) : process.cwd();
const SCRIPT_PATH = path.resolve(myDirname, "../../../scripts/get_wbaas_token.py");

function fetchTokenWithPython(): string | null {
  try {
    const PYTHON = findPython();
    const result = execSync(`"${PYTHON}" "${SCRIPT_PATH}"`, {
      encoding: "utf-8",
      timeout: 90000,
      windowsHide: true,
    });
    const token = result.trim();
    if (token) {
      console.log(`[wbaas-token] Token obtained, length: ${token.length}`);
      return token;
    }
    return null;
  } catch (e: any) {
    if (e.stdout) {
      const token = String(e.stdout).trim();
      if (token && token.length > 20) {
        console.log(`[wbaas-token] Token obtained from stderr, length: ${token.length}`);
        return token;
      }
    }
    console.error(`[wbaas-token] Failed: ${e.message}`);
    return null;
  }
}

router.get("/", async (_req, res) => {
  const now = Date.now();
  if (cachedToken && now - cachedAt < CACHE_TTL) {
    return res.json({ token: cachedToken, cached: true });
  }

  const token = fetchTokenWithPython();

  if (token) {
    cachedToken = token;
    cachedAt = now;
    return res.json({ token, cached: false });
  }

  return res.status(502).json({ error: "Не удалось получить x_wbaas_token.", token: null });
});

export default router;
