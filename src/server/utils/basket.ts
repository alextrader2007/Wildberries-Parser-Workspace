import { getBasketStatic, buildImageUrl } from "../../shared/basket";

const basketCache = new Map<number, { basket: string; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 min

export { getBasketStatic };

export async function getBasketDynamic(vol: number, id: number): Promise<string> {
  const cached = basketCache.get(vol);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.basket;

  const guess = getBasketStatic(vol);
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  };

  const testUrl = (b: string) => buildImageUrl(id, b);

  const checkBasket = async (b: string): Promise<string | null> => {
    if (b === guess) return null;
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 1500);
      const r = await fetch(testUrl(b), { method: "HEAD", headers, signal: c.signal });
      clearTimeout(t);
      if (r.ok) return b;
    } catch {}
    return null;
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(testUrl(guess), { method: "HEAD", headers, signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      basketCache.set(vol, { basket: guess, ts: Date.now() });
      return guess;
    }
  } catch {}

  const common = ["39", "40", "41"].filter(b => b !== guess);
  const results = await Promise.all(common.map(b => checkBasket(b)));
  const found = results.find(r => r !== null);
  if (found) { basketCache.set(vol, { basket: found, ts: Date.now() }); return found; }

  const allBaskets = Array.from({ length: 200 }, (_, i) => `${i + 1}`.padStart(2, "0"))
    .filter(b => b !== guess && b !== "39" && b !== "40" && b !== "41");

  const batchSize = 20;
  for (let i = 0; i < allBaskets.length; i += batchSize) {
    const batch = allBaskets.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(b => checkBasket(b)));
    const batchFound = batchResults.find(r => r !== null);
    if (batchFound) { basketCache.set(vol, { basket: batchFound, ts: Date.now() }); return batchFound; }
  }

  basketCache.set(vol, { basket: guess, ts: Date.now() });
  return guess;
}
