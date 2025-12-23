import { useSyncExternalStore } from "react";
import type { N8nResult } from "@/types/n8n";

type State = {
  isLoading: boolean;
  n8nData: N8nResult | null;
  sourceLink: string | null;
};

let state: State = {
  isLoading: false,
  n8nData: null,
  sourceLink: null,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

export function getAnalysisState() {
  return { ...state };
}

export function setIsLoading(v: boolean) {
  state.isLoading = v;
  notify();
}

export function setN8nData(d: N8nResult | null) {
  state.n8nData = d;
  notify();
}

export function setSourceLink(link: string | null) {
  state.sourceLink = link;
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
  } as const;
}
