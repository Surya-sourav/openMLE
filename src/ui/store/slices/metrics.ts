import type { StateCreator } from 'zustand';
import type { AppStore } from '../index';

export interface MetricsSlice {
  modelMetrics: Record<string, unknown> | null;
  reportPath: string | null;
  setModelMetrics: (metrics: Record<string, unknown> | null) => void;
  setReportPath: (path: string | null) => void;
  resetMetrics: () => void;
}

export const createMetricsSlice: StateCreator<AppStore, [], [], MetricsSlice> = (set) => ({
  modelMetrics: null,
  reportPath: null,
  setModelMetrics: (modelMetrics) => set({ modelMetrics }),
  setReportPath: (reportPath) => set({ reportPath }),
  resetMetrics: () => set({ modelMetrics: null, reportPath: null }),
});
