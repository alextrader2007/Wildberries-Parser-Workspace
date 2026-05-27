import * as https from "https";
import { getBasketStatic } from "../../shared/basket";

// Keep-Alive agent — как requests.Session в Python, переиспользует TCP-соединения
const keepAliveAgent = new https.Agent({ keepAlive: true, maxSockets: 15 });

const basketCache = new Map<number, { basket: string; ts: number }>();
const CACHE_TTL = 30 * 60 * 1000;

export { getBasketStatic };

function headUrl(basket: string, id: number): string {
  return `https://basket-${basket}.wbbasket.ru/vol${Math.floor(id / 100000)}/part${Math.floor(id / 1000)}/${id}/images/big/1.webp`;
}

function headCheck(url: string, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.get(url, { method: "HEAD", agent: keepAliveAgent }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(timeoutMs, () => { req.destroy(); resolve(false); });
  });
}

export async function getBasketDynamic(vol: number, id: number): Promise<string> {
  const cached = basketCache.get(vol);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.basket;

  const guess = getBasketStatic(vol);
  const tryBasket = (b: string) => headCheck(headUrl(b, id));

  // Шаг 1: статическая эвристика (быстрый путь)
  if (await tryBasket(guess)) {
    basketCache.set(vol, { basket: guess, ts: Date.now() });
    return guess;
  }

  // Шаг 2: популярные корзины 39,40,41 (туда WB массово переносит товары)
  for (const b of ["39", "40", "41"]) {
    if (b !== guess && await tryBasket(b)) {
      basketCache.set(vol, { basket: b, ts: Date.now() });
      return b;
    }
  }

  // Шаг 3: все корзины 01-199, батчами по 20 (как Python ThreadPoolExecutor, но последовательно)
  const all = Array.from({ length: 200 }, (_, i) => `${i + 1}`.padStart(2, "0"))
    .filter(b => b !== guess && b !== "39" && b !== "40" && b !== "41");

  for (let i = 0; i < all.length; i += 20) {
    const batch = all.slice(i, i + 20);
    const results = await Promise.all(batch.map(b => tryBasket(b).then(ok => ok ? b : null)));
    const found = results.find(r => r !== null);
    if (found) {
      basketCache.set(vol, { basket: found, ts: Date.now() });
      return found;
    }
  }

  basketCache.set(vol, { basket: guess, ts: Date.now() });
  return guess;
}
