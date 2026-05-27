import { Router } from "express";
import { getBasketDynamic } from "../utils/basket";
import { DetailInfo } from "../types";
import { PARALLEL_DETAILS_BATCH, FETCH_TIMEOUT_MS } from "../../shared/constants";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { skus } = req.body;
    if (!skus || !Array.isArray(skus)) {
      return res.status(400).json({ error: "Массив артикулов (skus) обязателен." });
    }

    const results: Record<number, { description: string; characteristics: { name: string; value: string }[] }> = {};

    for (let i = 0; i < skus.length; i += PARALLEL_DETAILS_BATCH) {
      const batch = skus.slice(i, i + PARALLEL_DETAILS_BATCH);
      await Promise.all(
        batch.map(async (sku: number) => {
          try {
            const vol = Math.floor(sku / 100000);
            const part = Math.floor(sku / 1000);
            const basket = await getBasketDynamic(vol, sku);
            const url = `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${sku}/info/ru/card.json`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
              const info: DetailInfo = await response.json();
              const characteristics: { name: string; value: string }[] = [];

              if (Array.isArray(info.options)) {
                for (const item of info.options) {
                  characteristics.push({ name: item.name, value: String(item.value) });
                }
              }

              if (Array.isArray(info.grouped_options)) {
                for (const group of info.grouped_options) {
                  const gName = group.name || "";
                  if (Array.isArray(group.options)) {
                    for (const o of group.options) {
                      characteristics.push({
                        name: gName ? `${gName} / ${o.name}` : o.name,
                        value: String(o.value),
                      });
                    }
                  }
                }
              }

              results[sku] = { description: info.description || "", characteristics };
            } else {
              results[sku] = { description: "", characteristics: [] };
            }
          } catch {
            results[sku] = { description: "", characteristics: [] };
          }
        }),
      );
    }

    res.json({ success: true, details: results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
