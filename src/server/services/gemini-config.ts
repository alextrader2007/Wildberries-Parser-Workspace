import fs from "fs";
import path from "path";

const CONFIG_PATH = path.resolve(process.cwd(), ".gemini-config.json");

let cachedKey: string | null = null;

export function getGeminiKey(): string | null {
  if (cachedKey) return cachedKey;
  if (process.env.GEMINI_API_KEY) {
    cachedKey = process.env.GEMINI_API_KEY;
    return cachedKey;
  }
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      if (data.apiKey) {
        cachedKey = data.apiKey;
        return cachedKey;
      }
    }
  } catch {}
  return null;
}

export function setGeminiKey(apiKey: string): void {
  cachedKey = apiKey;
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({ apiKey }, null, 2), "utf-8");
  } catch {}
}
