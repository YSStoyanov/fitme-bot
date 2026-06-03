// In-memory store for sharing state between screens within a session.
// Persisted history is loaded from Supabase via app/lib/history.ts.
import type { HistoryRow } from './history';

type Store = {
  personImage: string | null;
  clothingImage: string | null;
  clothingName: string | null;
  clothingCategory: string | null;
  resultImage: string | null;
  sizeRecommendation: any | null;
  fit: 'tight' | 'regular' | 'loose';
  userHeight: string;
  userWeight: string;
  history: HistoryRow[];
  historyLoaded: boolean;
};

// Re-export for backwards compatibility
export type HistoryItem = HistoryRow;

const store: Store = {
  personImage: null,
  clothingImage: null,
  clothingName: null,
  clothingCategory: null,
  resultImage: null,
  sizeRecommendation: null,
  fit: 'regular',
  userHeight: '',
  userWeight: '',
  history: [],
  historyLoaded: false,
};

const listeners = new Set<() => void>();

export function getStore(): Store {
  return store;
}

export function updateStore(partial: Partial<Store>) {
  Object.assign(store, partial);
  listeners.forEach((l) => l());
}

export function setHistory(items: HistoryRow[]) {
  store.history = items;
  store.historyLoaded = true;
  listeners.forEach((l) => l());
}

export function prependHistoryItem(item: HistoryRow) {
  store.history = [item, ...store.history].slice(0, 50);
  listeners.forEach((l) => l());
}

export function removeHistoryItem(id: string) {
  store.history = store.history.filter((h) => h.id !== id);
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
