import { useSyncExternalStore } from "react";
import type { N8nResult } from "@/types/n8n";

type State = {
  isLoading: boolean;
  n8nData: N8nResult | null;
  sourceLink: string | null;
};

const STORAGE_KEY = "maitr_analysis_data";

// Initialize from localStorage if available
function loadFromStorage(): N8nResult | null {
  try {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (e) {
    console.warn("Failed to load from localStorage:", e);
    return null;
  }
}

let state: State = {
  isLoading: false,
  n8nData: loadFromStorage(),
  sourceLink: null,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function persistToStorage(data: N8nResult | null) {
  try {
    if (typeof window === "undefined") return;
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn("Failed to persist to localStorage:", e);
  }
}

export function getAnalysisState() {
  return state;
}

export function setIsLoading(v: boolean) {
  state = { ...state, isLoading: v };
  notify();
}

export function setN8nData(d: N8nResult | null) {
  state = { ...state, n8nData: d };
  persistToStorage(d);
  notify();
}

export function setSourceLink(link: string | null) {
  state = { ...state, sourceLink: link };
  notify();
}

export function clearAnalysisData() {
  state = { ...state, n8nData: null, sourceLink: null };
  persistToStorage(null);
  notify();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAnalysis() {
  const snapshot = useSyncExternalStore(subscribe, getAnalysisState, getAnalysisState);
  return {
    ...snapshot,
    setIsLoading,
    setN8nData,
    setSourceLink,
    clearAnalysisData,
  } as const;
}
