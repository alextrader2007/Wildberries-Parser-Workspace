import {
  ProductRaw,
  ProductOutput,
  WarehouseMap,
  PaymentConfig,
} from "../types";
import {
  DETAIL_MIRRORS,
  FALLBACK_DESTS_FOR_STOCKS,
  REGIONS,
} from "../../shared/constants";
import { fetchWithTimeout } from "../utils/fetch";
import { getBasketDynamic } from "../utils/basket";
import { detectCurrency } from "../utils/currency";
import { getWalletConfig } from "./payment";

function calculateWalletPrice(priceDiscounted: number, config: PaymentConfig): number {
  if (config.discount > 0) {
    if (config.maxPrice === 0 || priceDiscounted <= config.maxPrice) {
      return Math.floor(priceDiscounted * (100 - config.discount) / 100);
    }
  }
  return priceDiscounted;
}

function mergeStocks(instances: ProductRaw[]): { totalStock: number; whQuantities: Record<string, number> } {
  const sizeWhQty: Record<string, Record<number, number>> = {};

  for (const inst of instances) {
    if (!Array.isArray(inst.sizes)) continue;
    inst.sizes.forEach((sz, idx) => {
      const szKey = sz.name || sz.origName || `size-${idx}`;
      if (!sizeWhQty[szKey]) sizeWhQty[szKey] = {};
      const stocks = sz.stocks || [];
      stocks.forEach((st) => {
        const qty = st.qty || 0;
        sizeWhQty[szKey][st.wh] = Math.max(sizeWhQty[szKey][st.wh] || 0, qty);
      });
    });
  }

  let totalStock = 0;
  const whQuantities: Record<string, number> = {};

  Object.values(sizeWhQty).forEach((whMap) => {
    Object.entries(whMap).forEach(([whIdStr, qty]) => {
      totalStock += qty;
      whQuantities[whIdStr] = (whQuantities[whIdStr] || 0) + qty;
    });
  });

  let reportedTotal = 0;
  instances.forEach((inst) => {
    if (inst.totalQuantity !== undefined && inst.totalQuantity > reportedTotal) {
      reportedTotal = inst.totalQuantity;
    }
  });

  return {
    totalStock: Math.max(totalStock, reportedTotal),
    whQuantities,
  };
}

async function buildProduct(
  prod: ProductRaw,
  allInstances: ProductRaw[],
  moscowProd: ProductRaw | undefined,
  whMap: WarehouseMap,
  walletConfig: PaymentConfig,
): Promise<ProductOutput> {
  const id = prod.id;

  let priceU = prod.priceU;
  let salePriceU = prod.salePriceU;

  if ((priceU === undefined || salePriceU === undefined) && prod.sizes?.length) {
    const priceObj = prod.sizes[0].price || {};
    priceU = priceObj.basic;
    salePriceU = priceObj.product;
  }

  const priceOriginal = priceU ? priceU / 100 : 0;
  const priceDiscounted = salePriceU ? salePriceU / 100 : 0;
  const priceWallet = calculateWalletPrice(priceDiscounted, walletConfig);

  const { totalStock, whQuantities } = mergeStocks(allInstances);

  const stocksDetail = Object.keys(whQuantities).length > 0
    ? Object.entries(whQuantities)
        .map(([whId, qty]) => `${whMap[Number(whId)] || `Склад ${whId}`}: ${qty}`)
        .join(", ")
    : "Нет в наличии";

  const vol = Math.floor(id / 100000);
  const part = Math.floor(id / 1000);
  const basket = await getBasketDynamic(vol, id);
  const imageUrl = `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${id}/images/big/1.webp`;
  const itemUrl = `https://www.wildberries.ru/catalog/${id}/detail.aspx`;

  return {
    id,
    name: prod.name || "Без названия",
    brand: prod.brand || "Без бренда",
    supplier: prod.supplier || "Неизвестный продавец",
    supplierId: prod.supplierId || 0,
    priceOriginal,
    priceDiscounted,
    priceWallet,
    rating: prod.rating || 0,
    feedbacks: prod.feedbacks || 0,
    totalStock,
    stocksDetail,
    itemUrl,
    imageUrl,
    deliveryMsk: moscowProd?.time1 && moscowProd.time2
      ? `${moscowProd.time1}-${moscowProd.time2} дн.`
      : undefined,
    deliveryBy: prod.time1 && prod.time2
      ? `${prod.time1}-${prod.time2} дн.`
      : undefined,
  };
}

export async function fetchDetailsBatch(
  skus: number[],
  dest: string,
  curr: string,
  whMap: WarehouseMap,
): Promise<ProductOutput[]> {
  const moscowDest = REGIONS.MOSCOW;
  const skuString = skus.join(";");

  const headers: Record<string, string> = {
    "User-Agent": "Wildberries/10.0.0 (iPhone; iOS 16.0; Scale/3.00)",
    Accept: "*/*",
    "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
    Origin: "https://www.wildberries.ru",
    Referer: "https://www.wildberries.ru/",
  };

  let regionalProducts: ProductRaw[] = [];

  for (const baseUrl of DETAIL_MIRRORS) {
    try {
      const url = `${baseUrl}?appType=1&curr=${curr}&dest=${dest}&spp=30&nm=${skuString}`;
      const res = await fetchWithTimeout(url, { headers });
      if (res.ok) {
        const payload: any = await res.json();
        regionalProducts = payload.products || payload.data?.products || [];
        if (regionalProducts.length > 0) break;
      }
    } catch (e: any) {
      console.error(`[Details] Regional fetch error on ${baseUrl}: ${e.message}`);
    }
  }

  const extraDests = FALLBACK_DESTS_FOR_STOCKS.filter((fd) => fd !== dest);

  const fetchForDest = async (targetDest: string): Promise<ProductRaw[]> => {
    const targetCurr = detectCurrency(targetDest, curr);
    for (const baseUrl of DETAIL_MIRRORS) {
      try {
        const url = `${baseUrl}?appType=1&curr=${targetCurr}&dest=${targetDest}&spp=30&nm=${skuString}`;
        const res = await fetchWithTimeout(url, { headers });
        if (res.ok) {
          const payload: any = await res.json();
          const list = payload.products || payload.data?.products || [];
          if (list.length > 0) return list;
        }
      } catch {}
    }
    return [];
  };

  const extraResults = await Promise.all(extraDests.map(fetchForDest));

  const allInstancesMap: Record<number, ProductRaw[]> = {};
  const moscowMap: Record<number, ProductRaw> = {};

  for (const p of regionalProducts) {
    if (!allInstancesMap[p.id]) allInstancesMap[p.id] = [];
    allInstancesMap[p.id].push(p);
    if (dest === moscowDest) moscowMap[p.id] = p;
  }

  for (const list of extraResults) {
    for (const p of list) {
      if (!allInstancesMap[p.id]) allInstancesMap[p.id] = [];
      allInstancesMap[p.id].push(p);
      if (dest === moscowDest) moscowMap[p.id] = p;
    }
  }

  const walletConfig = await getWalletConfig();
  const merged: ProductOutput[] = [];

  for (const prod of regionalProducts) {
    const id = prod.id;
    const moscowProd = moscowMap[id];
    const instances = allInstancesMap[id] || [prod];
    merged.push(await buildProduct(prod, instances, moscowProd, whMap, walletConfig));
  }

  return merged;
}
