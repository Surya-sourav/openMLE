import type { StateCreator } from 'zustand';
import type { AppStore } from '../index';

export interface TaskItem {
  key: string;
  label: string;
  status: 'pending' | 'active' | 'done' | 'failed';
}

export interface TasksSlice {
  currentStage: string;
  taskList: TaskItem[];
  agentLogs: string[];
  setCurrentStage: (stage: string) => void;
  setTaskList: (tasks: TaskItem[]) => void;
  appendAgentLog: (line: string) => void;
  clearAgentLogs: () => void;
  resetTasks: () => void;
}

export const createTasksSlice: StateCreator<AppStore, [], [], TasksSlice> = (set) => ({
  currentStage: 'idle',
  taskList: [],
  agentLogs: [],
  setCurrentStage: (currentStage) => set({ currentStage }),
  setTaskList: (taskList) => set({ taskList }),
  appendAgentLog: (line) => set((s) => ({ agentLogs: [...s.agentLogs, line] })),
  clearAgentLogs: () => set({ agentLogs: [] }),
  resetTasks: () => set({ currentStage: 'idle', taskList: [], agentLogs: [] }),
});
