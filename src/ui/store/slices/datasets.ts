import type { StateCreator } from 'zustand';
import type { AppStore } from '../index';
import type { MLDataset } from '../../../electron/preloads/ml-agent.preload';

export interface DatasetsSlice {
  selectedDatasetId: string | null;
  uploadProgress: number;
  setSelectedDatasetId: (id: string | null) => void;
  setUploadProgress: (progress: number) => void;
}

export const createDatasetsSlice: StateCreator<AppStore, [], [], DatasetsSlice> = (set) => ({
  selectedDatasetId: null,
  uploadProgress: 0,
  setSelectedDatasetId: (selectedDatasetId) => set({ selectedDatasetId }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),
});

// Re-export type for convenience
export type { MLDataset };
