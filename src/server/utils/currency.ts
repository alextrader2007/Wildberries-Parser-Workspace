import { CURRENCY_MAP, RUSSIAN_DESTS } from "../../shared/constants";

export function detectCurrency(dest: string, defaultCurr: string): string {
  if (CURRENCY_MAP[dest]) return CURRENCY_MAP[dest];
  if (RUSSIAN_DESTS.has(dest) || dest.startsWith("123") || dest === "-1257786" || dest === "-1181704") return "rub";
  return defaultCurr;
}
