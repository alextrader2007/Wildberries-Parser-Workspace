import { BASKET_RANGES, BASKET_OFFSET_START, BASKET_OFFSET_DIVISOR, BASKET_MAX } from "./constants";

export function getBasketStatic(vol: number): string {
  for (const range of BASKET_RANGES) {
    if (vol <= range.maxVol) return range.basket;
  }
  const calc = Math.floor(BASKET_OFFSET_START + (vol - 2406) / BASKET_OFFSET_DIVISOR);
  return `${Math.min(calc, BASKET_MAX)}`.padStart(2, "0");
}

export function buildImageUrl(id: number, basket?: string): string {
  const vol = Math.floor(id / 100000);
  const part = Math.floor(id / 1000);
  const b = basket || getBasketStatic(vol);
  return `https://basket-${b}.wbbasket.ru/vol${vol}/part${part}/${id}/images/big/1.webp`;
}

export function buildItemUrl(id: number): string {
  return `https://www.wildberries.ru/catalog/${id}/detail.aspx`;
}
