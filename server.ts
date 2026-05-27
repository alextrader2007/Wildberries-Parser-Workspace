import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import rateLimit from "express-rate-limit";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

import { fetchWithTimeout } from "./src/server/utils/fetch";
import storesRouter from "./src/server/routes/stores";
import parseSkusRouter from "./src/server/routes/parse-skus";
import searchRouter from "./src/server/routes/search-route";
import parseDetailsRouter from "./src/server/routes/parse-details";
import exportExcelRouter from "./src/server/routes/export-excel";
import geminiRouter from "./src/server/routes/gemini";
import wbaasTokenRouter from "./src/server/routes/wbaas-token";
import browserSearchRouter from "./src/server/routes/browser-search";
import browserSellerSearchRouter from "./src/server/routes/browser-seller-search";
import basketInfoRouter from "./src/server/routes/basket-info";
import { getWalletConfig } from "./src/server/services/payment";

const myFilename = typeof import.meta !== "undefined" && import.meta.url ? fileURLToPath(import.meta.url) : "";
const myDirname = myFilename ? path.dirname(myFilename) : process.cwd();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Слишком много запросов. Попробуйте через минуту." },
});

app.use("/api/", limiter);
app.use("/api/stores", storesRouter);
app.use("/api/parse-skus", parseSkusRouter);
app.use("/api/search", searchRouter);
app.use("/api/parse-details", parseDetailsRouter);
app.use("/api/export-excel", exportExcelRouter);
app.use("/api/gemini", geminiRouter);
app.use("/api/wbaas-token", wbaasTokenRouter);
app.use("/api/browser-search", browserSearchRouter);
app.use("/api/browser-seller-search", browserSellerSearchRouter);
app.use("/api/basket-info", basketInfoRouter);

app.get("/api/wallet-config", async (_req, res) => {
  try {
    const config = await getWalletConfig();
    res.json(config);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/api/wb-proxy", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).json({ error: "Missing url param" });
  try {
    const response = await fetchWithTimeout(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    const text = await response.text();
    res.set("Content-Type", response.headers.get("content-type") || "application/json");
    res.status(response.status).send(text);
  } catch (err: any) {
    res.status(502).json({ error: "Proxy error: " + (err.message || err) });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      configFile: false,
      server: { middlewareMode: true },
      appType: "spa",
      plugins: [react(), tailwindcss()],
      resolve: {
        alias: { "@": myDirname },
      },
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[WB Parser] Server listening on port ${PORT}`);
  });
}

startServer();
