import { WarehouseMap } from "../types";
import { WAREHOUSE_CACHE_DURATION_MS } from "../../shared/constants";
import { fetchWithTimeout } from "../utils/fetch";

let warehouseCache: WarehouseMap = {};
let lastWarehouseFetch = 0;

export async function getWarehouses(): Promise<WarehouseMap> {
  const now = Date.now();
  if (Object.keys(warehouseCache).length > 0 && now - lastWarehouseFetch < WAREHOUSE_CACHE_DURATION_MS) {
    return warehouseCache;
  }

  try {
    const res = await fetchWithTimeout("https://static-basket-01.wbbasket.ru/vol0/data/stores-data.json");
    if (res.ok) {
      const list: any[] = await res.json();
      const map: WarehouseMap = {};
      for (const item of list) {
        if (item.id && item.name) {
          map[item.id] = item.name;
        }
      }
      warehouseCache = map;
      lastWarehouseFetch = now;
      return map;
    }
  } catch (err) {
    console.error("Error fetching stores map:", err);
  }
  return warehouseCache;
}
