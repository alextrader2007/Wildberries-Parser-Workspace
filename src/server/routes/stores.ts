import { Router } from "express";
import { getWarehouses } from "../services/warehouse";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const map = await getWarehouses();
    res.json(map);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
