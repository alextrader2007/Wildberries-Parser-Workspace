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
    const results: Record<number, { vol: number; part: number; basket: string; imageUrl: string }> = {};

    await Promise.all(
      uniqueIds.map(async (id) => {
        const vol = Math.floor(id / 100000);
        const part = Math.floor(id / 1000);
        const basket = await getBasketDynamic(vol, id);
        results[id] = {
          vol,
          part,
          basket,
          imageUrl: `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${id}/images/big/1.webp`,
        };
      })
    );

    res.json(results);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
