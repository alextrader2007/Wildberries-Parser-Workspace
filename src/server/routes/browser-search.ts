import { Router } from "express";
import { exec } from "child_process";
import path from "path";
import { findPython } from "../utils/findPython";

const router = Router();

const SCRIPT_PATH = path.resolve(process.cwd(), "scripts/search_wb.py");

router.post("/", async (req, res) => {
  try {
    const { query, pages, dest, curr } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Поисковый запрос обязателен." });
    }

    const maxPages = Math.min(Number(pages) || 1, 20);
    const currentDest = dest || "-2888067";
    const currentCurr = curr || "byn";

    const PYTHON = findPython();

    const cmd = `"${PYTHON}" "${SCRIPT_PATH}" "${query}" ${maxPages} "${currentDest}" "${currentCurr}"`;

    const result = await new Promise<string>((resolve, reject) => {
      exec(cmd, { encoding: "utf-8", timeout: 120000, maxBuffer: 50 * 1024 * 1024, windowsHide: true }, (err, stdout) => {
        if (err) reject(err);
        else resolve(stdout || "");
      });
    });

    const output = result.trim();
    const jsonStart = output.indexOf("{");
    if (jsonStart === -1) {
      return res.status(502).json({ error: `Пустой ответ от поискового скрипта: ${output.slice(0, 200)}` });
    }
    let depth = 0;
    let jsonEnd = -1;
    for (let i = jsonStart; i < output.length; i++) {
      if (output[i] === "{") depth++;
      else if (output[i] === "}") depth--;
      if (depth === 0) { jsonEnd = i; break; }
    }
    if (jsonEnd === -1) {
      return res.status(502).json({ error: `Не удалось найти JSON в ответе: ${output.slice(0, 200)}` });
    }
    const data = JSON.parse(output.slice(jsonStart, jsonEnd + 1));

    if (!data.success) {
      return res.status(502).json({ error: data.error || "Ошибка поиска через браузер." });
    }

    res.json({ success: true, products: data.products || [], count: data.count || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
