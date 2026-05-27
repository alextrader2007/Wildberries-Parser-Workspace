import { useMemo, useState, useEffect } from 'react';
import { SlidersHorizontal, Table, Eye, Copy, ExternalLink, Store } from 'lucide-react';
import { Product } from '../types';
import ProductImage from './ProductImage';

interface ProductsTableProps {
  products: Product[];
  currencySymbol: string;
  onSelectProduct: (p: Product) => void;
  onFilteredChange?: (filtered: Product[]) => void;
}

export default function ProductsTable({ products, currencySymbol, onSelectProduct, onFilteredChange }: ProductsTableProps) {
  const [filterText, setFilterText] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
  const [onlyPromo, setOnlyPromo] = useState(false);
  const [onlyOnStock, setOnlyOnStock] = useState(false);
  const [sortKey, setSortKey] = useState<string>('default');
  const [copiedSku, setCopiedSku] = useState<number | null>(null);
  const [copiedSupplierId, setCopiedSupplierId] = useState<number | null>(null);

  const suppliersList = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => { if (p.supplier) set.add(p.supplier); });
    return Array.from(set);
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (filterText.trim()) {
      const match = filterText.toLowerCase();
      result = result.filter(
        p => p.name.toLowerCase().includes(match) ||
             p.brand.toLowerCase().includes(match) ||
             p.id.toString().includes(match) ||
             p.supplierId.toString().includes(match)
      );
    }

    if (selectedSupplier !== 'all') {
      result = result.filter(p => p.supplier === selectedSupplier);
    }

    if (onlyPromo) {
      result = result.filter(p => p.isPromo === "Да");
    }

    if (onlyOnStock) {
      result = result.filter(p => p.totalStock > 0);
    }

    switch (sortKey) {
      case 'priceDesc': result.sort((a, b) => b.priceDiscounted - a.priceDiscounted); break;
      case 'priceAsc': result.sort((a, b) => a.priceDiscounted - b.priceDiscounted); break;
      case 'rating': result.sort((a, b) => b.rating - a.rating); break;
      case 'feedbacks': result.sort((a, b) => b.feedbacks - a.feedbacks); break;
      case 'stock': result.sort((a, b) => b.totalStock - a.totalStock); break;
    }

    return result;
  }, [products, filterText, selectedSupplier, onlyPromo, onlyOnStock, sortKey]);

  useEffect(() => { onFilteredChange?.(filteredProducts); }, [filteredProducts, onFilteredChange]);

  const copyToClipboard = (sku: number) => {
    navigator.clipboard.writeText(sku.toString());
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku(null), 1500);
  };
  const copySupplierId = (id: number) => {
    navigator.clipboard.writeText(id.toString());
    setCopiedSupplierId(id);
    setTimeout(() => setCopiedSupplierId(null), 1500);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_12px_rgba(0,0,0,0.01)] p-5 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <SlidersHorizontal className="w-4 h-4 text-berry-500" /> Фильтрация и Сортировка
          </div>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            Показано <span className="font-semibold text-slate-700 dark:text-slate-300">{filteredProducts.length}</span> из{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">{products.length}</span> товаров
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5">Поиск в таблице</label>
            <input type="text" value={filterText} onChange={(e) => setFilterText(e.target.value)}
              placeholder="Бренд, SKU, название..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-berry-400 text-slate-800 dark:text-slate-200" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5">Фильтр по продавцу</label>
            <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-berry-400 font-semibold text-slate-700 dark:text-slate-200">
              <option value="all">Все продавцы ({suppliersList.length})</option>
              {suppliersList.map((sup, idx) => (<option key={idx} value={sup}>{sup}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5">Упорядочить по</label>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg outline-none focus:border-berry-400 font-semibold text-slate-700 dark:text-slate-200">
              <option value="default">Позиция по умолчанию</option>
              <option value="priceDesc">Сначала дорогие</option>
              <option value="priceAsc">Сначала бюджетные</option>
              <option value="rating">Высокий рейтинг ★</option>
              <option value="feedbacks">Много отзывов</option>
              <option value="stock">Большие Склады</option>
            </select>
          </div>
          <div className="flex flex-col justify-end gap-2.5 pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={onlyPromo} onChange={(e) => setOnlyPromo(e.target.checked)}
                className="rounded border-slate-300 accent-berry-500 text-berry-600 focus:ring-berry-500 w-3.5 h-3.5" />
              Только реклама (Promo)
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600 dark:text-slate-300">
              <input type="checkbox" checked={onlyOnStock} onChange={(e) => setOnlyOnStock(e.target.checked)}
                className="rounded border-slate-300 accent-berry-500 text-berry-600 focus:ring-berry-500 w-3.5 h-3.5" />
              Есть в наличии на складе
            </label>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-[0_4px_24px_rgba(0,0,0,0.01)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs text-slate-700 dark:text-slate-300">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold font-display">
                <th className="p-4 w-12 text-center">№</th>
                <th className="p-4 w-14">Фото</th>
                <th className="p-4 w-28">SKU Артикул</th>
                <th className="p-4">Товар / Бренд</th>
                <th className="p-4 text-right">Базовая цена</th>
                <th className="p-4 text-right text-emerald-700 dark:text-emerald-400">Кошелек</th>
                <th className="p-4 text-center">Рейтинг / Отзывы</th>
                <th className="p-4 text-center min-w-[170px]">Склады</th>
                <th className="p-4 text-center">Доставка</th>
                <th className="p-4 text-right pr-6 w-24">Анализ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredProducts.map((p, idx) => (
                <tr key={p.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${p.isPromo === "Да" ? "bg-amber-50/20 dark:bg-amber-900/10" : ""}`}>
                  <td className="p-4 text-center font-mono text-slate-400 dark:text-slate-500 font-semibold">{p.position || idx + 1}</td>
                  <td className="p-4">
                    <div className="w-10 h-14 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-600 shadow-xs">
                      <ProductImage id={p.id} basket={p.basket} alt={p.name} className="w-full h-full object-cover" />
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col space-y-1">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{p.id}</span>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <button onClick={() => copyToClipboard(p.id)} className="text-[10px] text-slate-400 hover:text-berry-700 dark:hover:text-berry-400 flex items-center gap-0.5" title="Скопировать артикул">
                          {copiedSku === p.id ? "Скопировано!" : <><Copy className="w-3 h-3" /> Копировать</>}
                        </button>
                        <span className="text-slate-300 dark:text-slate-600 text-[10px]">|</span>
                        <a href={`https://www.wildberries.ru/catalog/${p.id}/detail.aspx`} target="_blank" rel="noopener noreferrer"
                          className="text-[10px] text-berry-600 hover:text-berry-800 dark:hover:text-berry-400 flex items-center gap-0.5 font-medium hover:underline"
                          title="Открыть карточку товара на Wildberries">
                          <ExternalLink className="w-3 h-3" /> На ВБ
                        </a>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 space-y-1 max-w-[200px] truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 border border-slate-100 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 px-1 py-0.5">{p.brand}</span>
                      {p.isPromo === "Да" && <span className="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold uppercase text-[9px] tracking-wider rounded-md px-1 py-0.5">Promo</span>}
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 line-clamp-1 truncate font-medium max-w-[260px]" title={p.name}>{p.name}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                      <Store className="w-3 h-3 text-slate-400 dark:text-slate-500 mt-0.5 shrink-0" />
                      <span className="truncate max-w-[100px]" title={p.supplier}>{p.supplier}</span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="font-mono text-slate-500 dark:text-slate-400" title={`ID продавца: ${p.supplierId}`}>ID {p.supplierId}</span>
                      <button onClick={() => copySupplierId(p.supplierId)} className="text-slate-400 hover:text-berry-700 dark:hover:text-berry-400 flex items-center gap-0.5" title="Скопировать ID продавца">
                        {copiedSupplierId === p.supplierId ? "OK" : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono">
                    <p className="text-slate-700 dark:text-slate-300 font-semibold">{p.priceDiscounted.toFixed(2)} {currencySymbol}</p>
                    {p.priceOriginal > p.priceDiscounted && (
                      <p className="text-slate-400 dark:text-slate-500 line-through text-[10px] mt-0.5">{p.priceOriginal.toFixed(2)} {currencySymbol}</p>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="inline-flex flex-col items-end">
                      <span className="font-mono font-bold text-berry-700 dark:text-berry-400 text-sm">{p.priceWallet.toFixed(2)} {currencySymbol}</span>
                      <span className="bg-fuchsia-100 dark:bg-berry-900/30 text-berry-900 dark:text-berry-300 text-[9px] font-bold px-1.5 py-0.2 rounded-md mt-0.5">с Кошельком</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="inline-flex flex-col items-center">
                      <span className="font-bold text-amber-600 dark:text-amber-400 font-display">★ {p.rating.toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{p.feedbacks.toLocaleString()} отз.</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col items-center gap-1.5 min-w-[150px] max-w-[190px] mx-auto">
                      <span className={`font-bold text-[10px] rounded-full px-2 py-0.5 shadow-xs uppercase tracking-wide shrink-0 ${
                        p.totalStock > 20 ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800"
                          : p.totalStock > 0 ? "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-800"
                            : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-100 dark:border-red-800"}`}>
                        Всего: {p.totalStock} шт
                      </span>
                      <div className="w-full flex flex-col gap-1 max-h-[85px] overflow-y-auto pr-0.5 text-[9px] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {p.stocksDetail === "Нет в наличии" || p.totalStock === 0 ? (
                          <span className="text-red-400 font-medium text-center italic">Нет в наличии</span>
                        ) : (
                          p.stocksDetail.split(", ").map((item, idy) => {
                            const [whName, whQty] = item.split(": ");
                            return (
                              <div key={idy} className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-600 hover:bg-slate-100/70 dark:hover:bg-slate-600/50 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 transition-colors" title={item}>
                                <span className="truncate max-w-[100px] text-slate-500 dark:text-slate-400 font-medium" title={whName}>{whName}</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 select-all">{whQty} шт</span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center space-y-1">
                    {p.deliveryBy && <span className="block text-[10px] bg-slate-100 dark:bg-slate-700 font-semibold text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-md uppercase">Регион: {p.deliveryBy}</span>}
                    {p.deliveryMsk && <span className="block text-[10px] bg-sky-50 dark:bg-sky-900/20 font-semibold text-sky-700 dark:text-sky-300 px-1.5 py-0.5 rounded-md uppercase">Мск: {p.deliveryMsk}</span>}
                  </td>
                  <td className="p-4 text-right pr-6">
                    <button onClick={() => onSelectProduct(p)}
                      className="bg-slate-800 dark:bg-slate-600 hover:bg-slate-900 dark:hover:bg-slate-500 text-white p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider shadow-sm hover:shadow"
                      title="Детали и SEO-генератор">
                      <Eye className="w-3.5 h-3.5" /> Обзор
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-12 text-center text-slate-400 dark:text-slate-500 space-y-2">
            <Table className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="text-sm">Ни один товар не соответствует критериям примененных фильтров.</p>
          </div>
        )}
      </div>
    </div>
  );
}
