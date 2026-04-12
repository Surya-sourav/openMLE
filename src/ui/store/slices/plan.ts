import type { StateCreator } from 'zustand';
import type { AppStore } from '../index';

export type PlanStatus = 'idle' | 'awaiting' | 'approved' | 'rejected';

export interface PlanSlice {
  planData: unknown | null;
  planStatus: PlanStatus;
  planFeedback: string;
  setPlanData: (plan: unknown | null) => void;
  setPlanStatus: (status: PlanStatus) => void;
  setPlanFeedback: (feedback: string) => void;
  resetPlan: () => void;
}

export const createPlanSlice: StateCreator<AppStore, [], [], PlanSlice> = (set) => ({
  planData: null,
  planStatus: 'idle',
  planFeedback: '',
  setPlanData: (planData) => set({ planData }),
  setPlanStatus: (planStatus) => set({ planStatus }),
  setPlanFeedback: (planFeedback) => set({ planFeedback }),
  resetPlan: () => set({ planData: null, planStatus: 'idle', planFeedback: '' }),
});
