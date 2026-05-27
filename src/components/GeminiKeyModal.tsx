import { useState, useEffect } from 'react';
import { Key, X, Eye, EyeOff } from 'lucide-react';

interface GeminiKeyModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function GeminiKeyModal({ open, onClose, onSaved }: GeminiKeyModalProps) {
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetch('/api/gemini/check-key').then(r => r.json()).then(d => {
        if (!d.hasKey) setKey('');
      }).catch(() => {});
    }
  }, [open]);

  if (!open) return null;

  const handleSave = async () => {
    if (!key.trim()) { setError('Введите API ключ.'); return; }
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/gemini/set-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key.trim() })
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Ошибка сохранения'); }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-berry-100 text-berry-700 rounded-lg"><Key className="w-5 h-5" /></div>
            <h3 className="font-bold text-slate-800 font-display">Ключ API Gemini</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed">
          Для работы AI-функций требуется ключ Google Gemini API.
          Получить ключ можно в <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-berry-600 hover:underline font-semibold">Google AI Studio</a>.
        </p>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={e => { setKey(e.target.value); setError(null); }}
            placeholder="Введите ваш Gemini API ключ..."
            className="w-full px-4 py-3 pr-10 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-berry-500 font-mono text-sm"
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          />
          <button onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">Отмена</button>
          <button onClick={handleSave} disabled={saving || !key.trim()}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
}
