import { useState, useCallback, useEffect } from 'react';

export interface SearchHistoryEntry {
  id: string;
  query: string;
  type: 'keyword' | 'sku' | 'seller';
  skuInput?: string;
  sellerId?: string;
  dest: string;
  curr: string;
  pages?: number;
  timestamp: number;
}

const STORAGE_KEY = 'wb_search_history';
const MAX_ENTRIES = 20;

function loadHistory(): SearchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryEntry[]>(loadHistory);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const addEntry = useCallback((entry: Omit<SearchHistoryEntry, 'id' | 'timestamp'>) => {
    setHistory(prev => {
      const filtered = prev.filter(e => !(e.query === entry.query && e.type === entry.type));
      const newEntry: SearchHistoryEntry = {
        ...entry,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        timestamp: Date.now(),
      };
      return [newEntry, ...filtered].slice(0, MAX_ENTRIES);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setHistory(prev => prev.filter(e => e.id !== id));
  }, []);

  return { history, addEntry, clearHistory, removeEntry };
}
