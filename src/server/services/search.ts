import { SearchCandidate, ProductRaw } from "../types";
import { SEARCH_CANDIDATE_REGIONS, SEARCH_VERSIONS, FETCH_TIMEOUT_MS, WBAAS_SEARCH_ENDPOINT, WBAAS_APP_TYPE, WBAAS_SPA_VERSION, WBAAS_SEARCH_PAGE_LIMIT } from "../../shared/constants";
import { fetchWithTimeout } from "../utils/fetch";

const globalSearchCandidate: SearchCandidate = {
  domain: "search.wb.ru",
  region: "ru",
  version: "v4",
};

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

export interface SearchPageResult {
  items: ProductRaw[];
  isBlocked: boolean;
}

function getCandidates(curr: string, dest: string): { region: string; version: string }[] {
  const isRussian = curr === "rub" || dest === "-1257786" || dest === "-1181704";
  const primaryRegion = isRussian ? "ru" : "sng";
  const fallbackRegion = isRussian ? "sng" : "ru";

  const raw = [
    { region: globalSearchCandidate.region, version: globalSearchCandidate.version },
    { region: primaryRegion, version: "v4" },
    { region: primaryRegion, version: "v5" },
    { region: fallbackRegion, version: "v4" },
    { region: fallbackRegion, version: "v5" },
  ];

  return raw.filter(
    (cand, index, self) =>
      self.findIndex((c) => c.region === cand.region && c.version === cand.version) === index,
  );
}

export async function searchPage(
  query: string,
  page: number,
  curr: string,
  dest: string,
  wbaasToken?: string,
): Promise<SearchPageResult> {
  const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  const candidates = getCandidates(curr, dest);

  for (const cand of candidates) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const url = wbaasToken
          ? buildInternalSearchUrl(query, page, curr, dest)
          : `https://search.wb.ru/exactmatch/${cand.region}/common/${cand.version}/search?ab_testing=false&appType=1&curr=${curr}&dest=${dest}&query=${encodeURIComponent(query)}&resultset=catalog&sort=popular&spp=30&page=${page}`;

        const headers: Record<string, string> = {
          "User-Agent": randomUA,
          Accept: wbaasToken ? "*/*" : "application/json, text/plain, */*",
          "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        };

        if (wbaasToken) {
          headers["X-Requested-With"] = "XMLHttpRequest";
          headers["X-Spa-Version"] = WBAAS_SPA_VERSION;
          headers["X-Userid"] = "0";
          headers["Cookie"] = `x_wbaas_token=${wbaasToken}`;
          headers["Referer"] = `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(query)}`;
        }

        const response = await fetchWithTimeout(url, { headers });

        if (response.status === 429 || response.status === 403 || response.status === 498) {
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, attempt * 2000));
            continue;
          }
          break;
        }

        if (response.ok) {
          const text = await response.text();
          const trimmed = text.trim();

          if (trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) {
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, attempt * 2000));
              continue;
            }
            break;
          }

          try {
            const payload = JSON.parse(text);
            const items = payload.products || payload.data?.products || [];
            if (items.length > 0 && !wbaasToken) {
              globalSearchCandidate.region = cand.region;
              globalSearchCandidate.version = cand.version;
            }
            return { items, isBlocked: false };
          } catch {
            if (attempt < 2) {
              await new Promise((r) => setTimeout(r, attempt * 2000));
              continue;
            }
            break;
          }
        }
      } catch (e: any) {
        console.error(`[Search] Exception: ${e.message}`);
      }
      break;
    }
  }

  return { items: [], isBlocked: true };
}

function buildInternalSearchUrl(query: string, page: number, curr: string, dest: string): string {
  const params = new URLSearchParams();
  params.append("ab_testing", "false");
  params.append("appType", WBAAS_APP_TYPE);
  params.append("curr", curr);
  params.append("dest", dest);
  params.append("query", query);
  params.append("resultset", "catalog");
  params.append("sort", "popular");
  params.append("spp", "30");
  if (page > 1) {
    params.append("page", String(page - 1));
    params.append("limit", String(WBAAS_SEARCH_PAGE_LIMIT));
  }
  return `${WBAAS_SEARCH_ENDPOINT}?${params.toString()}`;
}
