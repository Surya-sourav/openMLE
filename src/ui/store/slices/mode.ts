import type { StateCreator } from 'zustand';
import type { AppStore } from '../index';

export type AppMode = 'query' | 'agent';

export interface ModeSlice {
  mode: AppMode;
  activeProjectId: number | null;
  activeRunId: number | null;
  setMode: (mode: AppMode) => void;
  setActiveProjectId: (id: number | null) => void;
  setActiveRunId: (id: number | null) => void;
}

export const createModeSlice: StateCreator<AppStore, [], [], ModeSlice> = (set) => ({
  mode: 'query',
  activeProjectId: null,
  activeRunId: null,
  setMode: (mode) => set({ mode }),
  setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
  setActiveRunId: (activeRunId) => set({ activeRunId }),
});
