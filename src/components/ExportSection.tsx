import { useState } from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Product } from '../types';

interface ExportSectionProps {
  products: Product[];
  activeTab: string;
}

export default function ExportSection({ products, activeTab }: ExportSectionProps) {
  const [includeDetailsInExcel, setIncludeDetailsInExcel] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const handleExcelExport = async () => {
    if (products.length === 0) return;
    setExportLoading(true);

    try {
      let exportProducts = [...products] as any[];

      if (includeDetailsInExcel) {
        const skusToFetch = products.map(p => p.id);
        const detailsRes = await fetch('/api/parse-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skus: skusToFetch })
        });
        const detailsData = await detailsRes.json();

        if (detailsRes.ok && detailsData.success && detailsData.details) {
          exportProducts = products.map(p => {
            const extra = detailsData.details[p.id];
            return { ...p, description: extra?.description || '', characteristics: extra?.characteristics || [] };
          });
        }
      }

      const downloadRes = await fetch('/api/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: exportProducts, includeDetails: includeDetailsInExcel })
      });

      if (!downloadRes.ok) throw new Error("Не удалось экспортировать книгу .xlsx через сервер.");

      const blob = await downloadRes.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wb_parsing_${activeTab}_${Date.now()}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err.message || "Ошибка при экспортировании файла.");
    } finally {
      setExportLoading(false);
    }
  };

  if (products.length === 0) return null;

  return (
    <div className="bg-slate-900 text-white p-6 md:p-8 rounded-3xl flex flex-col lg:flex-row justify-between items-center gap-6 shadow-xl relative overflow-hidden">
      <div className="absolute -right-16 -bottom-16 w-48 h-48 bg-berry-500/20 rounded-full blur-3xl"></div>
      <div className="absolute -left-16 -top-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>

      <div className="space-y-2 text-center lg:text-left relative z-10 max-w-xl">
        <span className="bg-berry-700 text-[10px] font-bold tracking-widest uppercase px-2.5 py-1 rounded-full text-berry-100">Экспорт & Спецификации</span>
        <h3 className="text-lg font-bold font-display tracking-tight text-white mt-1">Скачать подробный отчет Wildberries</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Будет сгенерирована полноценная книга Excel (.xlsx) с главным листом агрегации и отдельными листами спецификаций.
        </p>
        <label className="flex items-center gap-2 cursor-pointer pt-3 text-xs text-slate-300 font-semibold justify-center lg:justify-start">
          <input type="checkbox" checked={includeDetailsInExcel} onChange={(e) => setIncludeDetailsInExcel(e.target.checked)}
            className="rounded border-slate-700 bg-slate-800 text-berry-600 focus:ring-berry-500 w-4 h-4" />
          Интегрировать полное описание и карточки в книгу
        </label>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto relative z-10">
        <button onClick={handleExcelExport} disabled={exportLoading}
          className="flex-1 sm:flex-initial bg-berry-600 hover:bg-berry-700 disabled:bg-slate-700 text-white font-bold text-xs uppercase tracking-wider py-4 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all">
          {exportLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          Экспорт Excel (.xlsx)
        </button>
        <button onClick={() => {
          const headers = ["ID", "Бренд", "Название", "Цена", "Кошелек", "Рейтинг", "Отзывы", "Склады"];
          const rows = products.map(p => [p.id, p.brand, p.name, p.priceDiscounted, p.priceWallet, p.rating, p.feedbacks, p.totalStock]);
          const csvContent = "data:text/csv;charset=utf-8-sig," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
          const link = document.createElement("a");
          link.setAttribute("href", encodeURI(csvContent));
          link.setAttribute("download", `wb_results_${Date.now()}.csv`);
          document.body.appendChild(link);
          link.click();
          link.remove();
        }}
          className="flex-1 sm:flex-initial border border-slate-700 text-slate-300 hover:bg-white/5 text-xs font-bold uppercase tracking-wider py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2">
          Экспорт CSV
        </button>
      </div>
    </div>
  );
}
