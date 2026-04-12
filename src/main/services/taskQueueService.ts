import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { config } from '../config.js';
import type { Task, TaskStatus, TaskType } from '../types/task.js';

type TaskExecutor = (task: Task) => Promise<void>;

export class TaskQueueService extends EventEmitter {
  private queue: Task[] = [];
  private running: Map<string, Task> = new Map();
  private history: Task[] = [];
  private executor: TaskExecutor | null = null;
  private planId = '';
  private paused = false;
  private processing = false;

  setExecutor(fn: TaskExecutor): void {
    this.executor = fn;
  }

  setPlanId(id: string): void {
    this.planId = id;
  }

  enqueue(task: Omit<Task, 'id' | 'createdAt' | 'status' | 'retryCount'>): Task {
    const t: Task = {
      ...task,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'pending',
      retryCount: 0,
    };
    this.queue.push(t);
    this.persist();
    this.emit('task_enqueued', t);
    return t;
  }

  start(): void {
    this.paused = false;
    this.drain();
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.drain();
  }

  private async drain(): Promise<void> {
    if (this.processing || this.paused) return;
    this.processing = true;

    while (this.queue.length > 0 && !this.paused) {
      const task = this.queue.shift()!;
      await this.runTask(task);
    }

    this.processing = false;
  }

  private async runTask(task: Task): Promise<void> {
    task.status = 'running';
    task.startedAt = new Date().toISOString();
    this.running.set(task.id, task);
    this.emit('status_update', task);
    this.persist();

    try {
      await this.executor!(task);
      task.status = 'success';
      task.completedAt = new Date().toISOString();
      this.running.delete(task.id);
      this.history.push(task);
      this.emit('status_update', task);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      task.retryCount += 1;
      task.error = error.message;
      task.errorStack = error.stack;
      this.running.delete(task.id);

      if (task.retryCount < task.maxRetries) {
        task.status = 'retrying';
        const delay = Math.min(Math.pow(2, task.retryCount) * 1000, 30_000);
        this.emit('status_update', task);
        await new Promise((r) => setTimeout(r, delay));
        this.queue.unshift(task);
      } else {
        task.status = 'human_checkpoint';
        this.history.push(task);
        this.emit('status_update', task);
        this.emit('human_checkpoint', task);
        this.pause();
      }
    }

    this.persist();
  }

  handleHumanResponse(taskId: string, response: 'retry' | 'skip' | 'abort'): void {
    const task = this.history.find((t) => t.id === taskId);

    if (response === 'abort') {
      this.queue.forEach((t) => { t.status = 'cancelled'; });
      this.history.push(...this.queue);
      this.queue = [];
      this.persist();
      this.emit('aborted');
      return;
    }

    if (response === 'retry' && task) {
      task.retryCount = 0;
      task.status = 'pending';
      this.history = this.history.filter((t) => t.id !== taskId);
      this.queue.unshift(task);
    } else if (response === 'skip' && task) {
      task.status = 'cancelled';
    }

    this.resume();
  }

  getQueue(): Task[] { return [...this.queue]; }
  getHistory(): Task[] { return [...this.history]; }
  getRunning(): Task[] { return [...this.running.values()]; }
  getAll(): Task[] { return [...this.getRunning(), ...this.queue, ...this.history]; }

  private persist(): void {
    if (!this.planId) return;
    const dir = config.workspacePath;
    fs.mkdirSync(dir, { recursive: true });
    const filePath = path.join(dir, `tasks_${this.planId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(this.getAll(), null, 2), 'utf-8');
  }
}
