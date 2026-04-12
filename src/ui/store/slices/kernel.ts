import type { StateCreator } from 'zustand';
import type { AppStore } from '../index';

export type KernelStatus = 'idle' | 'starting' | 'busy' | 'dead';

export interface KernelSlice {
  kernelStatus: KernelStatus;
  setKernelStatus: (status: KernelStatus) => void;
}

export const createKernelSlice: StateCreator<AppStore, [], [], KernelSlice> = (set) => ({
  kernelStatus: 'idle',
  setKernelStatus: (kernelStatus) => set({ kernelStatus }),
});
