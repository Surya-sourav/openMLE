import fs from 'fs';
import path from 'path';
import { config } from '../config.js';
import type { MLPlan } from '../types/plan.js';

function planPath(planId: string): string {
  const dir = path.join(config.workspacePath, planId);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'plan.json');
}

export function savePlan(plan: MLPlan): void {
  fs.writeFileSync(planPath(plan.id), JSON.stringify(plan, null, 2), 'utf-8');
}

export function loadPlan(planId: string): MLPlan | null {
  const p = planPath(planId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as MLPlan;
}

export function updatePlanStatus(planId: string, status: MLPlan['status'], feedback?: string): void {
  const plan = loadPlan(planId);
  if (!plan) return;
  plan.status = status;
  if (feedback) plan.rejectionFeedback = feedback;
  savePlan(plan);
}
