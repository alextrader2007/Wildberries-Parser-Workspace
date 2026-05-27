export const BASKET_RANGES: { maxVol: number; basket: string }[] = [
  { maxVol: 143, basket: "01" },
  { maxVol: 287, basket: "02" },
  { maxVol: 431, basket: "03" },
  { maxVol: 719, basket: "04" },
  { maxVol: 1007, basket: "05" },
  { maxVol: 1061, basket: "06" },
  { maxVol: 1115, basket: "07" },
  { maxVol: 1169, basket: "08" },
  { maxVol: 1313, basket: "09" },
  { maxVol: 1601, basket: "10" },
  { maxVol: 1655, basket: "11" },
  { maxVol: 1919, basket: "12" },
  { maxVol: 2045, basket: "13" },
  { maxVol: 2189, basket: "14" },
  { maxVol: 2405, basket: "15" },
];

export const BASKET_OFFSET_START = 16;
export const BASKET_OFFSET_DIVISOR = 216;
export const BASKET_MIN = 1;
export const BASKET_MAX = 55;

export const REGIONS = {
  GRODNO: "-2888067",
  MOSCOW: "-1257786",
  MOSCOW_CENTRAL: "123585815",
  SPB_NORTHWEST: "123585590",
  BY_GRODNO: "-3895003",
} as const;

export const MOSCOW_DEST = REGIONS.MOSCOW;
export const BY_DEST = REGIONS.SPB_NORTHWEST;

export const FALLBACK_DESTS_FOR_STOCKS = [
  REGIONS.MOSCOW_CENTRAL,
  REGIONS.SPB_NORTHWEST,
  REGIONS.GRODNO,
];

export const RUSSIAN_DESTS: Set<string> = new Set([
  REGIONS.MOSCOW_CENTRAL,
  REGIONS.SPB_NORTHWEST,
  REGIONS.MOSCOW,
]);

export const CURRENCY_MAP: Record<string, string> = {
  [REGIONS.GRODNO]: "byn",
  [REGIONS.BY_GRODNO]: "byn",
};

export const DETAIL_MIRRORS = [
  "https://search.wb.ru/cards/v4/detail",
  "https://catalog.wb.ru/cards/v4/detail",
  "https://card.wb.ru/cards/v4/detail",
];

export const SEARCH_CANDIDATE_REGIONS = ["ru", "sng"] as const;
export const SEARCH_VERSIONS = ["v4", "v5"] as const;

export const CHUNK_SIZE_DETAILS = 100;
export const CLIENT_CHUNK_SIZE = 150;
export const PARALLEL_DETAILS_BATCH = 10;
export const EXCEL_MAX_SHEETS = 200;
export const AI_PRODUCT_LIMIT = 40;
export const DEFAULT_PAGE_DELAY_MS = 1500;
export const TOKEN_CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // ~1 week
export const WAREHOUSE_CACHE_DURATION_MS = 6 * 60 * 60 * 1000;
export const PAYMENT_CACHE_DURATION_MS = 60 * 60 * 1000;
export const FETCH_TIMEOUT_MS = 15000;

// Internal search API (SPA backend) — bypasses Qrator
export const WBAAS_SEARCH_ENDPOINT = "https://www.wildberries.ru/__internal/u-search/exactmatch/sng/common/v18/search";
export const WBAAS_TOKEN_REGEX = /x_wbaas_token\s*=\s*'([^']+)'/;
export const WBAAS_TOKEN_COOKIE_SRC = "https://www.wildberries.ru/";
export const WBAAS_APP_TYPE = "64";
export const WBAAS_SPA_VERSION = "13.15.1";
export const WBAAS_SEARCH_PAGE_LIMIT = 300;
