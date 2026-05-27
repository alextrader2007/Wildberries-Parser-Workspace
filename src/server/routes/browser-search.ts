import { Router } from "express";
import { execSync } from "child_process";
import { resolveRoot } from "../utils/paths";

const router = Router();

const SCRIPT_PATH = resolveRoot("scripts", "search_wb.py");

router.post("/", async (req, res) => {
  try {
    const { query, pages, dest, curr } = req.body;

    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Поисковый запрос обязателен." });
    }

    const maxPages = Math.min(Number(pages) || 1, 20);
    const currentDest = dest || "-2888067";
    const currentCurr = curr || "byn";

    const result = execSync(
      `python "${SCRIPT_PATH}" "${query}" ${maxPages} "${currentDest}" "${currentCurr}"`,
      { encoding: "utf-8", timeout: 300000, maxBuffer: 50 * 1024 * 1024, windowsHide: true }
    );

    const data = JSON.parse(result.trim());

    if (!data.success) {
      return res.status(502).json({ error: data.error || "Ошибка поиска через браузер." });
    }

    res.json({ success: true, products: data.products || [], count: data.count || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
