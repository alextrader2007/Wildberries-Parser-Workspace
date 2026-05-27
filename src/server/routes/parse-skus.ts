import { Router } from "express";
import { getWarehouses } from "../services/warehouse";
import { fetchDetailsBatch } from "../services/details";
import { CHUNK_SIZE_DETAILS } from "../../shared/constants";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { skus, dest, curr } = req.body;
    if (!skus || !Array.isArray(skus) || skus.length === 0) {
      return res.status(400).json({ error: "Передайте корректный массив артикулов (skus)." });
    }

    const currentDest = dest || "-2888067";
    const currentCurr = curr || "byn";
    const whMap = await getWarehouses();

    const allProducts: any[] = [];
    for (let i = 0; i < skus.length; i += CHUNK_SIZE_DETAILS) {
      const chunk = skus.slice(i, i + CHUNK_SIZE_DETAILS);
      const products = await fetchDetailsBatch(chunk, currentDest, currentCurr, whMap);
      allProducts.push(...products);
    }

    res.json({ success: true, products: allProducts });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
