import { Router } from "express";
import { getWarehouses } from "../services/warehouse";
import { fetchDetailsBatch } from "../services/details";
import { searchPage } from "../services/search";
import { CHUNK_SIZE_DETAILS, DEFAULT_PAGE_DELAY_MS } from "../../shared/constants";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { query, pages, dest, curr, pageDelay, preFetchedSkus, preFetchedMeta, startPage, wbaasToken } = req.body;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Поисковый запрос обязателен." });
    }

    const maxPages = Number(pages) || 1;
    const currentDest = dest || "-2888067";
    const currentCurr = curr || "byn";
    const delayMs = typeof pageDelay === "number" ? pageDelay * 1000 : DEFAULT_PAGE_DELAY_MS;
    const whMap = await getWarehouses();

    let searchSkus: number[] = [];
    const searchMeta: Record<number, { position: number; isPromo: string; deliveryBy?: string }> = {};
    let globalPosition = 0;
    let globalIsBlocked = false;
    let failedAtPage: number | null = null;

    if (preFetchedSkus && Array.isArray(preFetchedSkus) && preFetchedSkus.length > 0) {
      searchSkus = [...preFetchedSkus];
      Object.assign(searchMeta, preFetchedMeta || {});
      globalPosition = searchSkus.length;
    }

    const startFrom = Math.max(startPage || (searchSkus.length > 0 ? 1 : 1), 1);
    const endAt = startFrom + maxPages - 1;
    const serverDelay = Math.max(delayMs, 3000);

    for (let pIdx = startFrom; pIdx <= endAt; pIdx++) {
      if (pIdx > 1) {
        await new Promise((r) => setTimeout(r, serverDelay));
      }

      try {
        const { items, isBlocked } = await searchPage(query, pIdx, currentCurr, currentDest, wbaasToken);
        if (isBlocked) {
          globalIsBlocked = true;
          if (!failedAtPage) failedAtPage = pIdx;
          await new Promise((r) => setTimeout(r, 5000));
          const retry = await searchPage(query, pIdx, currentCurr, currentDest, wbaasToken);
          if (retry.isBlocked || retry.items.length === 0) continue;
          for (const item of retry.items) {
            const id = item.id;
            if (id && !searchMeta[id]) {
              globalPosition++;
              const isPromo = item.panelPromoId && item.panelPromoId !== 0 ? "Да" : "Нет";
              const deliveryBy = item.time1 && item.time2 ? `${item.time1}-${item.time2} дн.` : undefined;
              searchMeta[id] = { position: globalPosition, isPromo, deliveryBy };
              searchSkus.push(id);
            }
          }
          continue;
        }
        if (items.length === 0) continue;

        for (const item of items) {
          const id = item.id;
          if (id && !searchMeta[id]) {
            globalPosition++;
            const isPromo = item.panelPromoId && item.panelPromoId !== 0 ? "Да" : "Нет";
            const deliveryBy = item.time1 && item.time2 ? `${item.time1}-${item.time2} дн.` : undefined;
            searchMeta[id] = { position: globalPosition, isPromo, deliveryBy };
            searchSkus.push(id);
          }
        }
      } catch (err) {
        console.error(`Error searching page ${pIdx}:`, err);
        continue;
      }
    }

    if (searchSkus.length === 0) {
      if (globalIsBlocked) {
        return res.json({ success: true, products: [], isBlocked: true, failedAtPage, message: "Поисковый API Wildberries отклонил запрос." });
      }
      return res.json({ success: true, products: [], message: "Ничего не найдено." });
    }

    const allDetailedProducts: any[] = [];
    for (let i = 0; i < searchSkus.length; i += CHUNK_SIZE_DETAILS) {
      const chunk = searchSkus.slice(i, i + CHUNK_SIZE_DETAILS);
      const detailed = await fetchDetailsBatch(chunk, currentDest, currentCurr, whMap);
      allDetailedProducts.push(...detailed);
    }

    const finalProducts = allDetailedProducts
      .map((p) => {
        const meta = searchMeta[p.id];
        if (meta) {
          return { ...p, position: meta.position, isPromo: meta.isPromo, deliveryBy: p.deliveryBy || meta.deliveryBy };
        }
        return p;
      })
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    res.json({ success: true, products: finalProducts, isPartial: globalIsBlocked, failedAtPage });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
