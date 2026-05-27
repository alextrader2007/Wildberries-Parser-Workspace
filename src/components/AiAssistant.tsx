import { useState } from 'react';
import { Sparkles, MessageSquare, Flame, AlertCircle, RefreshCw, Landmark, Coins, Key } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Product } from '../types';
import GeminiKeyModal from './GeminiKeyModal';

interface AiAssistantProps {
  products: Product[];
}

export default function AiAssistant({ products }: AiAssistantProps) {
  const [promptType, setPromptType] = useState<'niche' | 'pricing' | 'reviews' | 'custom'>('niche');
  const [customPrompt, setCustomPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingState, setLoadingState] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);

  const startAiAnalysis = async (type: 'niche' | 'pricing' | 'reviews' | 'custom') => {
    if (products.length === 0) return;
    setLoading(true);
    setError(null);
    setAiResponse(null);
    setPromptType(type);

    const states = [
      "Инициализируем контекст Gemini AI...",
      "Агрегируем коммерческие показатели товарной матрицы...",
      "Составляем карту цен для нахождения выгодных категорий...",
      "Формируем маркетинговый SWOT-анализ...",
      "Генерируем экспертное заключение по входу в нишу..."
    ];

    let stateIdx = 0;
    setLoadingState(states[0]);
    const stateInterval = setInterval(() => {
      stateIdx++;
      if (stateIdx < states.length) {
        setLoadingState(states[stateIdx]);
      }
    }, 2000);

    try {
      const response = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products,
          promptType: type,
          customPrompt: type === 'custom' ? customPrompt : undefined
        })
      });

      clearInterval(stateInterval);

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Не удалось завершить анализ.");
      }

      setAiResponse(data.text);
    } catch (err: any) {
      clearInterval(stateInterval);
      const msg = err.message || "Ошибка подключения к серверу AI.";
      if (msg.includes("Ключ API Gemini отсутствует")) {
        setShowKeyModal(true);
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="ai-assistant" className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden mb-8 animate-fade-in">
      <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-berry-100 text-berry-700 rounded-lg">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 tracking-tight font-display">Бизнес-Анализ Ниши с Gemini AI</h3>
            <p className="text-xs text-slate-500">Поиск рыночных аномалий, ценовых преимуществ и дефицита</p>
          </div>
        </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowKeyModal(true)} className="text-xs font-mono bg-berry-50 text-berry-800 px-2.5 py-1 rounded-full font-semibold hover:bg-berry-100 transition-colors flex items-center gap-1">
              <Key className="w-3 h-3" /> gemini-3.5-flash
            </button>
          </div>
      </div>

      <div className="p-6">
        {products.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            Выгрузите список товаров, чтобы Gemini проанализировал нишу.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => startAiAnalysis('niche')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 hover:border-berry-200 rounded-xl hover:bg-berry-50/30 text-xs font-semibold text-slate-700 hover:text-berry-900 transition-colors disabled:opacity-50"
              >
                <Landmark className="w-4 h-4 text-berry-500" />
                SWOT & Конкуренция
              </button>
              <button
                onClick={() => startAiAnalysis('pricing')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 hover:border-berry-200 rounded-xl hover:bg-berry-50/30 text-xs font-semibold text-slate-700 hover:text-berry-900 transition-colors disabled:opacity-50"
              >
                <Coins className="w-4 h-4 text-emerald-500" />
                Ценовые сегменты
              </button>
              <button
                onClick={() => startAiAnalysis('reviews')}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 hover:border-berry-200 rounded-xl hover:bg-berry-50/30 text-xs font-semibold text-slate-700 hover:text-berry-900 transition-colors disabled:opacity-50"
              >
                <Flame className="w-4 h-4 text-amber-500" />
                Барьеры качества (Отзывы)
              </button>
            </div>

            <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Произвольный бизнес-запрос к AI</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Пример: Сравни бренд X с остальной выдачей и найди наши слабые места..."
                  className="flex-1 px-4 py-2 bg-white text-sm border border-slate-200 focus:border-berry-500 focus:ring-1 focus:ring-berry-200 rounded-xl outline-none"
                />
                <button
                  onClick={() => startAiAnalysis('custom')}
                  disabled={loading || !customPrompt.trim()}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <MessageSquare className="w-4 h-4" />
                  Спросить
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-start gap-2 text-sm border border-red-100">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p className="flex-1">{error}</p>
              </div>
            )}

            <GeminiKeyModal open={showKeyModal} onClose={() => setShowKeyModal(false)} onSaved={() => startAiAnalysis(promptType)} />

            {loading && (
              <div className="bg-berry-50/20 border border-berry-100 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-3 animate-pulse">
                <RefreshCw className="w-8 h-8 text-berry-500 animate-spin" />
                <p className="text-sm font-semibold text-berry-950 font-display">{loadingState}</p>
                <p className="text-xs text-slate-400">Это займет всего 5-10 секунд. Gemini синтезирует выдачу...</p>
              </div>
            )}

            {aiResponse && (
              <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 shadow-inner mt-4">
                <div className="flex items-center gap-1 text-xs font-bold text-berry-700 uppercase tracking-widest mb-4">
                  <Sparkles className="w-4 h-4" /> Аналитическое заключение AI
                </div>
                <div className="prose prose-slate max-w-none text-sm leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {aiResponse}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
