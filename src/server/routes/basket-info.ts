import { Router } from "express";
import { getBasketDynamic } from "../utils/basket";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Передайте массив id товаров." });
    }

    const uniqueIds = [...new Set<number>(ids)];

    // Group by vol to run getBasketDynamic once per vol
    const volToIds = new Map<number, number[]>();
    for (const id of uniqueIds) {
      const vol = Math.floor(id / 100000);
      if (!volToIds.has(vol)) volToIds.set(vol, []);
      volToIds.get(vol)!.push(id);
    }

    const results: Record<number, { vol: number; part: number; basket: string; imageUrl: string }> = {};

    // Process each vol group sequentially (not parallel) to avoid memory spikes
    for (const [vol, groupIds] of volToIds) {
      const sampleId = groupIds[0];
      const basket = await getBasketDynamic(vol, sampleId);
      for (const id of groupIds) {
        const part = Math.floor(id / 1000);
        results[id] = {
          vol,
          part,
          basket,
          imageUrl: `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${id}/images/big/1.webp`,
        };
      }
    }

    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
