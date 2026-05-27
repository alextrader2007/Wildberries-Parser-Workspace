import { useState, useEffect } from 'react';
import { X, Sparkles, Copy, FileText, Check, ArrowRight, Table, AlertCircle, RefreshCw, PenTool, ExternalLink, MapPin } from 'lucide-react';
import { Product } from '../types';
import { downloadAsWord } from '../shared/word';
import GeminiKeyModal from './GeminiKeyModal';

interface ProductMetadataDrawerProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductMetadataDrawer({ product, onClose }: ProductMetadataDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [characteristics, setCharacteristics] = useState<{ name: string; value: string }[]>([]);

  // SEO Copywriting state
  const [seoText, setSeoText] = useState<string | null>(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);

  useEffect(() => {
    if (!product) return;
    
    // Clear state
    setDescription('');
    setCharacteristics([]);
    setSeoText(null);
    setError(null);

    // Fetch complete description and characteristics
    const fetchFullDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/parse-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ skus: [product.id] })
        });
        const data = await res.json();
        if (data.success && data.details && data.details[product.id]) {
          const detail = data.details[product.id];
          setDescription(detail.description);
          setCharacteristics(detail.characteristics);
          
          // Save loaded values back into local reference so table can see them if exported
          product.description = detail.description;
          product.characteristics = detail.characteristics;
        } else {
          setError("Площадка CDN Wildberries не вернула карточку info/ru/card.json для этого SKU.");
        }
      } catch (err: any) {
        setError("Не удалось загрузить детальные данные характеристики.");
      } finally {
        setLoading(false);
      }
    };

    fetchFullDetails();
  }, [product]);

  const generateSeoCopy = async (type: 'seo' | 'catchy') => {
    if (!product) return;
    setSeoLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini/seo-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: product.name,
          brand: product.brand,
          currentDescription: description,
          characteristics: characteristics,
          requestType: type
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Не удалось сгенерировать текст.");
      }
      setSeoText(data.text);
    } catch (err: any) {
      const msg = err.message || "Ошибка генерации копирайтинга.";
      if (msg.includes("Ключ API Gemini отсутствует")) {
        setShowKeyModal(true);
        return;
      }
      setError(msg);
    } finally {
      setSeoLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!seoText) return;
    navigator.clipboard.writeText(seoText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-fade-in">
      {/* Background click listener to close */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Drawer content */}
      <div className="relative w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col z-10 animate-fade-in">
        {/* Header */}
        <div className="bg-slate-50 border-b border-slate-100 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-12 h-16 object-cover rounded-lg border border-slate-100 shadow-sm"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-berry-600 font-bold">{product.id} • {product.brand}</span>
                <a 
                  href={`https://www.wildberries.ru/catalog/${product.id}/detail.aspx`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-berry-50 text-berry-700 hover:bg-berry-100 hover:text-berry-900 px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-colors font-mono font-bold text-[9px] uppercase tracking-wide cursor-pointer"
                  title="Открыть карточку товара на Wildberries"
                >
                  На ВБ <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <h4 className="text-sm font-bold text-slate-800 line-clamp-1 truncate pr-8 font-display">{product.name}</h4>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs flex items-start gap-2 border border-red-100">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="h-48 flex flex-col items-center justify-center text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-berry-500 animate-spin" />
              <p className="text-sm text-slate-500">Загружаем спецификации и характеристики из CDN WB...</p>
            </div>
          ) : (
            <>
              {/* Characteristics block */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                  <Table className="w-4 h-4 text-berry-500" /> Спецификация & Параметры ({characteristics.length})
                </div>
                {characteristics.length === 0 ? (
                  <p className="text-xs text-slate-400">Характеристики не найдены для данного артикула.</p>
                ) : (
                  <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium font-display">
                          <th className="p-3">Характеристика</th>
                          <th className="p-3">Значение</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {characteristics.slice(0, 15).map((char, index) => (
                          <tr key={index} className="hover:bg-slate-50/50">
                            <td className="p-3 text-slate-500 font-medium font-sans w-2/5 border-r border-slate-50">{char.name}</td>
                            <td className="p-3 text-slate-800 font-serif font-medium">{char.value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {characteristics.length > 15 && (
                      <div className="p-2.5 bg-slate-50 text-center text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                        Показаны первые 15 характеристик из {characteristics.length}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Warehouses & remaining inventory */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                  <MapPin className="w-4 h-4 text-berry-500" /> Наличие по складам ({product.totalStock} шт.)
                </div>
                {product.stocksDetail === "Нет в наличии" || product.totalStock === 0 ? (
                  <div className="bg-red-50/50 border border-red-100 rounded-xl p-4 text-center text-xs text-red-600 font-medium">
                    Товар полностью распродан или отсутствует на выбранных складах.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {product.stocksDetail.split(", ").map((item, idy) => {
                      const parts = item.split(": ");
                      const whName = parts[0] || "Склад Снабжения";
                      const whQtyStr = parts[1] || "0";
                      const qty = parseInt(whQtyStr) || 0;
                      
                      const isHigh = qty > 12;
                      const isLow = qty <= 3;
                      
                      return (
                        <div 
                          key={idy} 
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all shadow-xs"
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-semibold text-slate-800 text-xs truncate" title={whName}>{whName}</span>
                            <span className="text-[10px] text-slate-400">Региональный склад</span>
                          </div>
                          <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg shrink-0 ${
                            isLow 
                              ? "bg-amber-50 text-amber-700 border border-amber-100" 
                              : isHigh 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                                : "bg-berry-50/50 text-berry-800 border border-berry-100"
                          }`}>
                            {whQtyStr}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Description block */}
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  <FileText className="w-4 h-4 text-berry-500" /> Описание товара
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600 leading-relaxed font-sans max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {description || "Описание отсутствует на Wildberries."}
                </div>
              </div>

              {/* AI Copywriter Panel */}
              <div className="bg-berry-50/50 border border-berry-100 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-berry-800 uppercase tracking-widest">
                  <Sparkles className="w-4 h-4 text-berry-500" /> Копирайтер & SEO Оптимизатор
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Будь то оптимизация текущего описания под поисковые ключи (SEO) или яркий короткий пост для соцсетей, Gemini сгенерирует экспертный текст за секунды на основе характеристик.
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => generateSeoCopy('seo')}
                    disabled={seoLoading}
                    className="flex-1 py-2.5 px-4 bg-berry-600 hover:bg-berry-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <PenTool className="w-4 h-4" />
                    Оптимизировать SEO карточки
                  </button>
                  <button
                    onClick={() => generateSeoCopy('catchy')}
                    disabled={seoLoading}
                    className="flex-1 py-2.5 px-4 border border-berry-200 text-berry-800 hover:bg-berry-50/70 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    Яркий продающий пост
                  </button>
                </div>

                {seoLoading && (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-berry-700 animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Копирайтер пишет оптимизированный текст в реальном времени...
                  </div>
                )}

                {seoText && (
                  <div className="bg-white border border-berry-100 rounded-xl p-4 space-y-3 relative animate-fade-in shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Сгенерированный текст</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => downloadAsWord(seoText, 'SEO-текст Wildberries', `wb-seo-${product?.id || 'text'}`)}
                          className="text-[11px] font-semibold text-berry-600 hover:text-berry-800 flex items-center gap-1 transition-colors">
                          <FileText className="w-3.5 h-3.5" /> Word
                        </button>
                        <button
                          onClick={copyToClipboard}
                          className="text-[11px] font-semibold text-berry-600 hover:text-berry-800 flex items-center gap-1 transition-colors"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          {copied ? "Скопировано!" : "Копировать"}
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto font-sans">
                      {seoText}
                    </div>
                  </div>
              )}
            </div>
          </>  
        )}
        </div>
        <GeminiKeyModal open={showKeyModal} onClose={() => setShowKeyModal(false)} onSaved={() => generateSeoCopy('seo')} />
      </div>
    </div>
  );
}
