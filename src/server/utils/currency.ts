import { CURRENCY_MAP, RUSSIAN_DESTS, MOSCOW_DEST, BY_DEST } from "../../shared/constants";

export function detectCurrency(dest: string, defaultCurr: string): string {
  if (CURRENCY_MAP[dest]) return CURRENCY_MAP[dest];
  if (RUSSIAN_DESTS.has(dest)) return "rub";
  return defaultCurr;
}

export function isRussianDest(dest: string): boolean {
  return RUSSIAN_DESTS.has(dest) || dest.startsWith("123") || dest === MOSCOW_DEST || dest === BY_DEST;
}
