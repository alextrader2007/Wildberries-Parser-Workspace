import { useState } from 'react';
import { SlidersHorizontal, MapPin, BadgeHelp, Info, ToggleLeft, Activity } from 'lucide-react';

interface ConfigPanelProps {
  dest: string;
  setDest: (val: string) => void;
  curr: string;
  setCurr: (val: string) => void;
}

export default function ConfigPanel({ dest, setDest, curr, setCurr }: ConfigPanelProps) {
  const [showConfig, setShowConfig] = useState(false);

  // Popular Region Presets
  const regions = [
    { name: "Беларусь (Гродно)", id: "-2888067", curr: "byn" },
    { name: "Россия (Москва)", id: "-1257786", curr: "rub" },
  ];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-[0_2px_12px_rgba(0,0,0,0.01)] p-4 mb-6">
      <button
        onClick={() => setShowConfig(!showConfig)}
        className="w-full flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <SlidersHorizontal className="w-4 h-4 text-berry-500" /> Настройки Региональной Логистики и Цен
        </span>
        <span className="text-[11px] font-semibold text-berry-600 dark:text-berry-400 border border-berry-100 dark:border-berry-800 rounded-lg px-2 py-0.5 whitespace-nowrap bg-berry-50/20 dark:bg-berry-900/20 hover:bg-berry-50 dark:hover:bg-berry-900/30 transition-colors">
          {regions.find(r => r.id === dest)?.name || `Кастом (ID ${dest})`} • {curr.toUpperCase()}
        </span>
      </button>

      {showConfig && (
        <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in text-xs">
          {/* Region presets */}
          <div className="space-y-3">
            <h5 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Выберите локацию ПВЗ (склады доставки)
            </h5>
            <div className="grid grid-cols-2 gap-2">
              {regions.map((reg) => (
                <button
                  key={reg.id}
                  onClick={() => {
                    setDest(reg.id);
                    setCurr(reg.curr);
                  }}
                  className={`p-2.5 rounded-xl text-left border text-[11px] font-semibold transition-all ${
                    dest === reg.id
                      ? "border-berry-500 bg-berry-50/20 dark:bg-berry-900/20 text-berry-900 dark:text-berry-300 shadow-inner"
                      : "border-slate-100 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-500"
                  }`}
                >
                  {reg.name}
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 font-mono uppercase">ID: {reg.id} / {reg.curr}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Expert destination ID */}
          <div className="space-y-3">
            <h5 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Activity className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Кастомные параметры
            </h5>
            <div className="space-y-2">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Идентификатор региона (dest id)</label>
                <input
                  type="text"
                  value={dest}
                  onChange={(e) => setDest(e.target.value)}
                  placeholder="Например, -2888067"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-xl outline-none focus:border-berry-500 font-mono text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1">Валюта API (curr)</label>
                <div className="flex gap-2">
                  {["byn", "rub"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setCurr(c)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase ${
                        curr === c
                          ? "bg-slate-800 dark:bg-slate-600 text-white"
                          : "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-1 p-2 bg-blue-50/50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg text-[9px] leading-relaxed">
              <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <p>Установленный регион влияет на цены, сроки доставки товара и наличие остатков на ближайшем ПВЗ сортировочного центра.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
