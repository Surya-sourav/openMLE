import type { StateCreator } from 'zustand';
import type { AppStore } from '../index';

export interface ModeSlice {
  mode: 'query' | 'agent';
  activeProjectId: number | null;
  activeRunId: number | null;
  setMode: (mode: 'query' | 'agent') => void;
  setActiveProjectId: (id: number | null) => void;
  setActiveRunId: (id: number | null) => void;
}

export const createModeSlice: StateCreator<AppStore, [], [], ModeSlice> = (set) => ({
  mode: 'agent',
  activeProjectId: null,
  activeRunId: null,
  setMode: (mode) => set({ mode }),
  setActiveProjectId: (activeProjectId) => set({ activeProjectId }),
  setActiveRunId: (activeRunId) => set({ activeRunId }),
});
