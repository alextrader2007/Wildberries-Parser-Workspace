import { useState } from 'react';
import { Search, Layers, RefreshCw, AlertCircle, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { Product } from './types';
import { getBasketStatic, buildImageUrl, buildItemUrl } from './shared/basket';
import { CLIENT_CHUNK_SIZE, DETAIL_MIRRORS, FALLBACK_DESTS_FOR_STOCKS, REGIONS, WBAAS_SEARCH_ENDPOINT, WBAAS_TOKEN_REGEX, WBAAS_TOKEN_COOKIE_SRC, WBAAS_APP_TYPE, WBAAS_SPA_VERSION, WBAAS_SEARCH_PAGE_LIMIT } from './shared/constants';
import MetricCards from './components/MetricCards';
import AiAssistant from './components/AiAssistant';
import ProductMetadataDrawer from './components/ProductMetadataDrawer';
import ConfigPanel from './components/ConfigPanel';
import ProductsTable from './components/ProductsTable';
import ExportSection from './components/ExportSection';

export default function App() {
  const [activeTab, setActiveTab] = useState<'keyword' | 'sku'>('keyword');
  const [query, setQuery] = useState('платье женское вечернее');
  const [pages, setPages] = useState(2);
  const [pageDelay, setPageDelay] = useState(1.5);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);
  const [skuInput, setSkuInput] = useState('172345591\n107932148\n218329431\n208173492');
  const [dest, setDest] = useState('-2888067');
  const [curr, setCurr] = useState('byn');
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const getCurrencySymbol = () => {
    if (curr === 'byn') return 'BYN';
    if (curr === 'rub') return 'RUB';
    return curr.toUpperCase();
  };

  const PROXY_SOURCES = [
    { name: 'local', getTarget: (_e: string, url: string) => `/api/wb-proxy?url=${encodeURIComponent(url)}` },
    { name: 'corsproxy.io', getTarget: (enc: string) => `https://corsproxy.io/?url=${enc}` },
    { name: 'allorigins', getTarget: (enc: string) => `https://api.allorigins.win/raw?url=${enc}` },
    { name: 'codetabs', getTarget: (enc: string) => `https://codetabs.com/cors-proxy/request?url=${enc}` },
    { name: 'crossorigin', getTarget: (_: string, url: string) => `https://crossorigin.me/${url}` },
    { name: 'corsproxy.org', getTarget: (enc: string) => `https://corsproxy.org/?${enc}` },
    { name: 'corsproxy.biz', getTarget: (enc: string) => `https://corsproxy.biz/?url=${enc}` },
    { name: 'api.codetabs', getTarget: (enc: string) => `https://api.codetabs.com/v1/proxy?quest=${enc}` },
    { name: 'proxy.cors.sh', getTarget: (enc: string) => `https://proxy.cors.sh/${enc}` },
    { name: 'proxy.cors', getTarget: (enc: string) => `https://proxy.cors.biz/${enc}` },
    { name: 'crossproxy', getTarget: (enc: string) => `https://crossproxy.me/?url=${enc}` },
    { name: 'corsproxy.dev', getTarget: (enc: string) => `https://corsproxy.dev/${enc}` },
    { name: 'corsproxy.live', getTarget: (enc: string) => `https://corsproxy.live/?url=${enc}` },
    { name: 'proxy.cors.lol', getTarget: (enc: string) => `https://proxy.cors.lol/${enc}` },
    { name: 'corsproxy.space', getTarget: (enc: string) => `https://corsproxy.space/?url=${enc}` },
    { name: 'proxy.cors.sh1', getTarget: (enc: string) => `https://api.cors.sh/${enc}` },
  ];

  const fetchWithProxy = async (url: string, usedProxies: Set<string>): Promise<any> => {
    const enc = encodeURIComponent(url);
    const available = [...PROXY_SOURCES].filter(s => !usedProxies.has(s.name)).sort(() => Math.random() - 0.5);
    if (available.length === 0) throw new Error("Все прокси исчерпаны.");

    let lastError: any = null;
    for (const source of available) {
      usedProxies.add(source.name);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(source.getTarget(enc, url), { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const text = await res.text();
          const trimmed = text.trim();
          if (!trimmed || trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html")) continue;
          return JSON.parse(trimmed);
        }
      } catch (err: any) {
        lastError = err;
      }
    }
    throw lastError || new Error("Все прокси временно перегружены.");
  };

  const fetchHtmlWithProxy = async (url: string, usedProxies: Set<string>): Promise<string> => {
    const enc = encodeURIComponent(url);
    const available = [...PROXY_SOURCES].filter(s => !usedProxies.has(s.name)).sort(() => Math.random() - 0.5);
    if (available.length === 0) throw new Error("Все прокси исчерпаны.");
    let lastError: any = null;
    for (const source of available) {
      usedProxies.add(source.name);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(source.getTarget(enc, url), { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const text = await res.text();
          const trimmed = text.trim();
          if (trimmed) return trimmed;
        }
      } catch (err: any) { lastError = err; }
    }
    throw lastError || new Error("Все прокси временно перегружены.");
  };

  const wbaasTokenCache: { token: string | null; ts: number } = { token: null, ts: 0 };
  const WBAAS_TOKEN_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

  const getWbaasToken = async (): Promise<string | null> => {
    const now = Date.now();
    if (wbaasTokenCache.token && now - wbaasTokenCache.ts < WBAAS_TOKEN_CACHE_TTL) {
      return wbaasTokenCache.token;
    }
    try {
      const res = await fetch("/api/wbaas-token");
      const data = await res.json();
      if (data.token) {
        wbaasTokenCache.token = data.token;
        wbaasTokenCache.ts = now;
        return data.token;
      }
    } catch {}

    const proxySet = new Set<string>();
    try {
      const html = await fetchHtmlWithProxy(WBAAS_TOKEN_COOKIE_SRC, proxySet);
      const match = WBAAS_TOKEN_REGEX.exec(html);
      if (match) {
        wbaasTokenCache.token = match[1];
        wbaasTokenCache.ts = now;
        return match[1];
      }
    } catch {}
    return null;
  };

  const searchViaInternalApi = async (searchToken: string, searchQuery: string, page: number, usedProxies: Set<string>): Promise<any[]> => {
    const params = new URLSearchParams();
    params.append("ab_testing", "false");
    params.append("appType", WBAAS_APP_TYPE);
    params.append("curr", curr);
    params.append("dest", dest);
    params.append("query", searchQuery);
    params.append("resultset", "catalog");
    params.append("sort", "popular");
    params.append("spp", "30");
    if (page > 1) {
      params.append("page", String(page - 1));
      params.append("limit", String(WBAAS_SEARCH_PAGE_LIMIT));
    }

    const url = `${WBAAS_SEARCH_ENDPOINT}?${params.toString()}`;
    const enc = encodeURIComponent(url);
    const available = [...PROXY_SOURCES].filter(s => !usedProxies.has(s.name)).sort(() => Math.random() - 0.5);
    if (available.length === 0) return [];

    let lastError: any = null;
    for (const source of available) {
      usedProxies.add(source.name);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(source.getTarget(enc, url), {
          signal: controller.signal,
          headers: {
            "X-Requested-With": "XMLHttpRequest",
            "X-Spa-Version": WBAAS_SPA_VERSION,
            "X-Userid": "0",
            "x-wbaas-token": searchToken,
            "Accept": "*/*",
            "Accept-Language": "ru-RU,ru;q=0.9",
            "Referer": `https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(searchQuery)}`,
          },
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const text = await res.text();
          const trimmed = text.trim();
          if (trimmed && !trimmed.startsWith("<!DOCTYPE") && !trimmed.startsWith("<html")) {
            const payload = JSON.parse(trimmed);
            const items = payload.products || payload.data?.products || [];
            return items;
          }
        }
      } catch (err: any) { lastError = err; }
    }
    return [];
  };

  const clientFetchDetailsBatch = async (skus: number[], currentDest: string, currentCurr: string, whMap: Record<number, string>, basketMap?: Record<number, string>): Promise<any[]> => {
    const skuString = skus.join(";");
    let regionalProducts: any[] = [];
    const detailProxies = new Set<string>();

    for (const baseUrl of DETAIL_MIRRORS) {
      try {
        const url = `${baseUrl}?appType=1&curr=${currentCurr}&dest=${currentDest}&spp=30&nm=${skuString}`;
        const payload = await fetchWithProxy(url, detailProxies);
        const list = payload.products || payload.data?.products || [];
        if (list && list.length > 0) { regionalProducts = list; break; }
      } catch (err) { console.warn(`[Client] Mirror failed:`, err); }
    }

    if (regionalProducts.length === 0) throw new Error("Не удалось получить детальные данные.");

    const extraDests = FALLBACK_DESTS_FOR_STOCKS.filter(fd => fd !== currentDest);
    const moscowDest = REGIONS.MOSCOW_CENTRAL;

    const fetchForDest = async (targetDest: string) => {
      let targetCurr = currentCurr;
      if (targetDest.startsWith("123") || targetDest === "-1257786" || targetDest === "-1181704" || targetDest === "111174") targetCurr = "rub";
      for (const baseUrl of DETAIL_MIRRORS) {
        try {
          const url = `${baseUrl}?appType=1&curr=${targetCurr}&dest=${targetDest}&spp=30&nm=${skuString}`;
          const payload = await fetchWithProxy(url, detailProxies);
          const list = payload.products || payload.data?.products || [];
          if (list && list.length > 0) return { dest: targetDest, products: list };
        } catch {}
      }
      return { dest: targetDest, products: [] };
    };

    const extraResults = await Promise.all(extraDests.map(fetchForDest));

    const allInstancesMap: Record<number, any[]> = {};
    const moscowMap: Record<number, any> = {};

    for (const p of regionalProducts) {
      if (!allInstancesMap[p.id]) allInstancesMap[p.id] = [];
      allInstancesMap[p.id].push(p);
      if (currentDest === moscowDest) moscowMap[p.id] = p;
    }
    for (const resObj of extraResults) {
      for (const p of resObj.products) {
        if (!allInstancesMap[p.id]) allInstancesMap[p.id] = [];
        allInstancesMap[p.id].push(p);
        if (resObj.dest === moscowDest) moscowMap[p.id] = p;
      }
    }

    const merged: any[] = [];
    for (const prod of regionalProducts) {
      const id = prod.id;
      const moscowProd = moscowMap[id] || prod;
      let priceU = prod.priceU;
      let salePriceU = prod.salePriceU;
      if ((priceU === undefined || salePriceU === undefined) && prod.sizes?.length) {
        const priceObj = prod.sizes[0].price || {};
        priceU = priceObj.basic;
        salePriceU = priceObj.product;
      }
      const priceOriginal = priceU ? priceU / 100 : 0;
      const priceDiscounted = salePriceU ? salePriceU / 100 : 0;
      const priceWallet = Math.floor(priceDiscounted * 0.97);

      const sizeWhQty: Record<string, Record<number, number>> = {};
      const mergeSizes = (sizesList: any[]) => {
        if (!Array.isArray(sizesList)) return;
        sizesList.forEach((sz, idx) => {
          const szKey = sz.name || sz.origName || `size-${idx}`;
          if (!sizeWhQty[szKey]) sizeWhQty[szKey] = {};
          (sz.stocks || []).forEach((st: any) => {
            sizeWhQty[szKey][st.wh] = Math.max(sizeWhQty[szKey][st.wh] || 0, st.qty || 0);
          });
        });
      };
      (allInstancesMap[id] || [prod]).forEach(inst => mergeSizes(inst.sizes));

      let totalStock = 0;
      const whQuantities: Record<string, number> = {};
      Object.values(sizeWhQty).forEach(whMapForSize => {
        Object.entries(whMapForSize).forEach(([whIdStr, qty]) => {
          totalStock += qty;
          const whName = whMap[Number(whIdStr)] || `Склад ${whIdStr}`;
          whQuantities[whName] = (whQuantities[whName] || 0) + qty;
        });
      });

      let reportedTotal = 0;
      (allInstancesMap[id] || [prod]).forEach((inst: any) => {
        if (inst.totalQuantity !== undefined && inst.totalQuantity > reportedTotal) reportedTotal = inst.totalQuantity;
      });
      if (reportedTotal > totalStock) totalStock = reportedTotal;

      const stocksDetail = Object.keys(whQuantities).length > 0
        ? Object.entries(whQuantities).map(([name, qty]) => `${name}: ${qty}`).join(", ")
        : "Нет в наличии";

      const basket = basketMap?.[id] ? (basketMap[id] as any).basket : undefined;
      const imageUrl = basket ? `https://basket-${basket}.wbbasket.ru/vol${Math.floor(id/100000)}/part${Math.floor(id/1000)}/${id}/images/big/1.webp` : buildImageUrl(id);
      const itemUrl = buildItemUrl(id);

      merged.push({
        id, name: prod.name || "Без названия", brand: prod.brand || "Без бренда",
        supplier: prod.supplier || "Неизвестный продавец", supplierId: prod.supplierId || 0,
        priceOriginal, priceDiscounted, priceWallet,
        rating: prod.rating || 0, feedbacks: prod.feedbacks || 0,
        totalStock, stocksDetail, itemUrl, imageUrl, basket,
        deliveryMsk: moscowProd.time1 && moscowProd.time2 ? `${moscowProd.time1}-${moscowProd.time2} дн.` : undefined,
        deliveryBy: prod.time1 && prod.time2 ? `${prod.time1}-${prod.time2} дн.` : undefined,
      });
    }
    return merged;
  };

  const handleSearchParsing = async () => {
    if (!query.trim()) { setError("Пожалуйста, укажите поисковую ключевую фразу."); return; }
    setLoading(true); setError(null); setSuccessMessage(null); setSearchWarning(null);
    setLoadingStep("Загружаем справочник складов...");

    const storesRes = await fetch('/api/stores');
    const whMap = storesRes.ok ? await storesRes.json() : {};

    setLoadingStep("Поиск через браузер (Chrome откроется на ~10 сек)...");
    let response;
    try {
      response = await fetch('/api/browser-search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, pages, dest, curr })
      });
    } catch (e: any) {
      setError("Не удалось запустить браузерный поиск. Используйте вкладку SKU.");
      setLoading(false);
      return;
    }

    const data = await response.json();
    if (!data.success || !data.products?.length) {
      setError(data.error || `Ничего не найдено по запросу "${query}".`);
      setLoading(false);
      return;
    }

    const searchProducts = data.products;
    const clientSkus: number[] = [];
    const clientMeta: Record<number, { position: number; isPromo: string }> = {};

    searchProducts.forEach((p: any, idx: number) => {
      const id = p.id;
      if (id && !clientMeta[id]) {
        clientMeta[id] = { position: idx + 1, isPromo: p.panelPromoId && p.panelPromoId !== 0 ? "Да" : "Нет" };
        clientSkus.push(id);
      }
    });

    setLoadingStep(`Определяем корзины для ${clientSkus.length} SKU...`);
    let basketMap: Record<number, string> = {};
    try {
      const bRes = await fetch('/api/basket-info', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: clientSkus })
      });
      if (bRes.ok) basketMap = await bRes.json();
    } catch {}

    setLoadingStep(`Собрано ${clientSkus.length} SKU. Стягиваем региональные цены...`);
    let allParsed: any[] = [];
    for (let i = 0; i < clientSkus.length; i += CLIENT_CHUNK_SIZE) {
      const chunk = clientSkus.slice(i, i + CLIENT_CHUNK_SIZE);
      setLoadingStep(`Региональные остатки (${i + 1}-${Math.min(i + CLIENT_CHUNK_SIZE, clientSkus.length)})...`);
      try {
        const details = await clientFetchDetailsBatch(chunk, dest, curr, whMap, basketMap);
        allParsed = [...allParsed, ...details];
      } catch (e: any) {
        console.warn(`[Search] Chunk ${i} failed:`, e);
        setError(`Ошибка при загрузке деталей (позиции ${i + 1}-${Math.min(i + CLIENT_CHUNK_SIZE, clientSkus.length)}): ${e.message}. Попробуйте уменьшить глубину поиска.`);
        setLoading(false);
        return;
      }
    }

    const finalProducts = allParsed
      .map(p => ({ ...p, position: clientMeta[p.id]?.position || 0, isPromo: clientMeta[p.id]?.isPromo || "Нет" }))
      .sort((a, b) => (a.position || 0) - (b.position || 0));

    setProducts(finalProducts);
    setSuccessMessage(`Успешно собрано ${finalProducts.length} карточек товара!`);
    setLoading(false);
  };

  const handleSkuParsing = async () => {
    const skusArray = skuInput.split(/[\s,;\n]+/).map(s => s.trim()).filter(s => s.length > 0 && !isNaN(Number(s))).map(Number);
    if (skusArray.length === 0) { setError("Укажите как минимум один числовой артикул."); return; }
    setLoading(true); setError(null); setSuccessMessage(null);
    setLoadingStep("Загружаем справочник складов...");

    try {
      const storesRes = await fetch('/api/stores');
      const whMap = storesRes.ok ? await storesRes.json() : {};
      setLoadingStep("Параллельный опрос карточек на клиенте...");

      let allParsed: any[] = [];
      for (let i = 0; i < skusArray.length; i += CLIENT_CHUNK_SIZE) {
        const chunk = skusArray.slice(i, i + CLIENT_CHUNK_SIZE);
        setLoadingStep(`Сбор региональных данных (${i + 1}-${Math.min(i + CLIENT_CHUNK_SIZE, skusArray.length)})...`);
        const details = await clientFetchDetailsBatch(chunk, dest, curr, whMap);
        allParsed = [...allParsed, ...details];
      }

      setProducts(allParsed);
      if (allParsed.length === 0) {
        setError("Ни один из артикулов не найден.");
      } else {
        setSuccessMessage(`Найдено и проанализировано ${allParsed.length} позиций.`);
      }
      setLoading(false);
      return;
    } catch (clientErr: any) {
      console.warn("[Client SKU] Failed, falling back to server...", clientErr);
    }

    setLoadingStep("Инициализируем парсинг на сервере...");
    try {
      const response = await fetch('/api/parse-skus', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skus: skusArray, dest, curr })
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Ошибка парсинга.");
      setProducts(data.products);
      if (data.products.length === 0) {
        setError("Ни один из артикулов не найден.");
      } else {
        setSuccessMessage(`Завершен точечный сбор! Найдено ${data.products.length} позиций.`);
      }
    } catch (err: any) {
      setError(err.message || "Ошибка соединения с бэкенд драйвером.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 font-sans antialiased text-slate-800">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-berry-700 to-berry-500 text-white flex items-center justify-center font-bold text-xl shadow-[0_4px_12px_rgba(203,38,230,0.2)] font-display">WB</div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight font-display flex items-center gap-1.5 leading-none">Wildberries Parser Workspace</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">Умный ИИ-аналитик логистики, цен и SEO-копирайтинга</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-full">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono">UTC: 2026-05-25</span>
            </div>
            <a href="https://www.wildberries.ru" target="_blank" rel="noopener noreferrer"
              className="text-xs font-semibold text-berry-600 hover:text-berry-800 flex items-center gap-1 hover:underline">
              Перейти на WB <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.01)] overflow-hidden">
          <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5">
            <button onClick={() => { setActiveTab('keyword'); setError(null); }}
              className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'keyword' ? "bg-white text-berry-900 shadow-sm" : "text-slate-500 hover:bg-white/40 hover:text-slate-800"}`}>
              <Search className="w-4 h-4 text-berry-500" /> Поиск по Ключевому Слову
            </button>
            <button onClick={() => { setActiveTab('sku'); setError(null); }}
              className={`flex-1 py-3 px-4 rounded-2xl text-xs font-bold tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'sku' ? "bg-white text-berry-900 shadow-sm" : "text-slate-500 hover:bg-white/40 hover:text-slate-800"}`}>
              <Layers className="w-4 h-4 text-berry-500" /> Анализ Списка SKU
            </button>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            {activeTab === 'keyword' ? (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Поисковый запрос</label>
                  <div className="relative">
                    <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                      placeholder="Пример: джинсы женские завышенные"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 focus:bg-white text-sm border border-slate-200 focus:border-berry-500 focus:ring-1 focus:ring-berry-200 rounded-xl outline-none transition-all font-medium" />
                    <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Глубина поиска</label>
                    <span className="text-xs font-bold font-mono text-berry-600">{pages} стр.</span>
                  </div>
                  <input type="range" min="1" max="10" value={pages} onChange={(e) => setPages(Number(e.target.value))}
                    className="w-full accent-berry-500 h-2 bg-slate-100 rounded-lg cursor-pointer" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-berry-500" /> Задержка</label>
                    <span className="text-xs font-bold font-mono text-berry-600">{pageDelay} сек.</span>
                  </div>
                  <input type="range" min="0.5" max="5" step="0.5" value={pageDelay} onChange={(e) => setPageDelay(Number(e.target.value))}
                    className="w-full accent-berry-500 h-2 bg-slate-100 rounded-lg cursor-pointer" />
                </div>
                <button onClick={handleSearchParsing} disabled={loading}
                  className="w-full bg-berry-600 hover:bg-berry-700 disabled:bg-berry-300 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl shadow-[0_4px_14px_rgba(203,38,230,0.15)] hover:shadow-[0_6px_20px_rgba(203,38,230,0.25)] transition-all flex items-center justify-center gap-2 h-[46px]">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Искать на WB
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Числовые SKU артикулы</label>
                  <textarea rows={2} value={skuInput} onChange={(e) => setSkuInput(e.target.value)}
                    placeholder="Вставьте список SKU, например: 172345591, 107932148"
                    className="w-full p-3.5 bg-slate-50 focus:bg-white text-sm border border-slate-200 focus:border-berry-500 focus:ring-1 focus:ring-berry-200 rounded-xl outline-none transition-all font-mono text-xs" />
                </div>
                <button onClick={handleSkuParsing} disabled={loading}
                  className="w-full bg-berry-600 hover:bg-berry-700 disabled:bg-berry-300 text-white font-bold text-xs uppercase tracking-wider py-3.5 px-6 rounded-xl shadow-[0_4px_14px_rgba(203,38,230,0.15)] hover:shadow-[0_6px_20px_rgba(203,38,230,0.25)] transition-all flex items-center justify-center gap-2 h-[52px]">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                  Парсить артикулы
                </button>
              </div>
            )}

            <ConfigPanel dest={dest} setDest={setDest} curr={curr} setCurr={setCurr} />

            {loading && (
              <div className="bg-berry-50/20 border border-berry-100 p-5 rounded-2xl flex items-center gap-4 animate-pulse">
                <RefreshCw className="w-6 h-6 text-berry-600 animate-spin flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-berry-900">Выполняем парсинг...</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{loadingStep}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl flex items-start gap-2.5 border border-red-100">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
                <div>
                  <p className="font-semibold">Произошла ошибка</p>
                  <p className="mt-0.5 text-slate-500">{error}</p>
                </div>
              </div>
            )}

            {successMessage && !loading && (
              <div className="p-4 bg-emerald-50 text-emerald-800 text-xs rounded-xl flex items-start gap-2.5 border border-emerald-100">
                <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                <p className="font-medium">{successMessage}</p>
              </div>
            )}

            {searchWarning && !loading && (
              <div className="p-4 bg-amber-50 text-amber-800 text-xs rounded-xl flex items-start gap-2.5 border border-amber-100">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-500" />
                <div>
                  <p className="font-semibold">Парсинг выполнен частично</p>
                  <p className="mt-0.5 text-slate-600 font-medium leading-relaxed">{searchWarning}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <MetricCards products={products} currencySymbol={getCurrencySymbol()} />

        {products.length > 0 && (
          <>
            <ProductsTable
              products={products}
              currencySymbol={getCurrencySymbol()}
              onSelectProduct={setSelectedProduct}
              onFilteredChange={setFilteredProducts}
            />
            <AiAssistant products={products} />
            <ExportSection products={filteredProducts.length ? filteredProducts : products} activeTab={activeTab} />
          </>
        )}
      </main>

      {selectedProduct && (
        <ProductMetadataDrawer
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
