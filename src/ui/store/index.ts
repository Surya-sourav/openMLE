import { create } from 'zustand';
import { createDatasetsSlice, type DatasetsSlice } from './slices/datasets';
import { createModeSlice, type ModeSlice } from './slices/mode';
import { createPlanSlice, type PlanSlice } from './slices/plan';
import { createTasksSlice, type TasksSlice } from './slices/tasks';
import { createKernelSlice, type KernelSlice } from './slices/kernel';
import { createMetricsSlice, type MetricsSlice } from './slices/metrics';
import { createChatSlice, type ChatSlice } from './slices/chat';

export type AppStore = DatasetsSlice & ModeSlice & PlanSlice & TasksSlice & KernelSlice & MetricsSlice & ChatSlice;

export const useAppStore = create<AppStore>()((...a) => ({
  ...createDatasetsSlice(...a),
  ...createModeSlice(...a),
  ...createPlanSlice(...a),
  ...createTasksSlice(...a),
  ...createKernelSlice(...a),
  ...createMetricsSlice(...a),
  ...createChatSlice(...a),
}));

// Re-export slice types for convenience
export type { DatasetsSlice, ModeSlice, PlanSlice, TasksSlice, KernelSlice, MetricsSlice, ChatSlice };
export type { ChatMessage, MessageType } from './slices/chat';
export type { TaskItem } from './slices/tasks';
export type { KernelStatus } from './slices/kernel';
export type { PlanStatus } from './slices/plan';
