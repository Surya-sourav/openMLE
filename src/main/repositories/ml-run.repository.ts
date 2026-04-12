import { getDatabase } from '../../electron/internal-database/local.database-config.js';
import { mlRuns } from '../../electron/internal-database/schemas/ml-runs.schema.js';
import { mlRunLogs } from '../../electron/internal-database/schemas/ml-run-logs.schema.js';
import { eq } from 'drizzle-orm';

export type NewMLRun = typeof mlRuns.$inferInsert;
export type MLRunRow = typeof mlRuns.$inferSelect;

export class MLRunRepository {
  private get db() { return getDatabase(); }

  create(run: NewMLRun): MLRunRow {
    return this.db
      .insert(mlRuns)
      .values({ ...run, created_at: new Date() })
      .returning()
      .get();
  }

  getById(id: number): MLRunRow | undefined {
    return this.db.select().from(mlRuns).where(eq(mlRuns.id, id)).get();
  }

  listByProject(projectId: number): MLRunRow[] {
    return this.db.select().from(mlRuns).where(eq(mlRuns.project_id, projectId)).all();
  }

  updateStage(id: number, stage: string): void {
    this.db.update(mlRuns).set({ stage }).where(eq(mlRuns.id, id)).run();
  }

  updateStatus(id: number, status: string): void {
    this.db.update(mlRuns).set({ status }).where(eq(mlRuns.id, id)).run();
  }

  saveEdaResult(id: number, json: string): void {
    this.db.update(mlRuns).set({ eda_result_json: json }).where(eq(mlRuns.id, id)).run();
  }

  savePlan(id: number, planJson: string): void {
    this.db.update(mlRuns).set({ plan_json: planJson, status: 'awaiting_approval' }).where(eq(mlRuns.id, id)).run();
  }

  approvePlan(id: number): void {
    this.db.update(mlRuns).set({ plan_approved: true, status: 'approved' }).where(eq(mlRuns.id, id)).run();
  }

  saveCodePath(id: number, codePath: string): void {
    this.db.update(mlRuns).set({ code_path: codePath }).where(eq(mlRuns.id, id)).run();
  }

  saveModelPath(id: number, modelPath: string): void {
    this.db.update(mlRuns).set({ model_path: modelPath }).where(eq(mlRuns.id, id)).run();
  }

  saveEvaluation(id: number, evalJson: string): void {
    this.db.update(mlRuns).set({ eval_json: evalJson }).where(eq(mlRuns.id, id)).run();
  }

  saveReport(id: number, reportPath: string): void {
    this.db.update(mlRuns).set({ report_path: reportPath }).where(eq(mlRuns.id, id)).run();
  }

  setError(id: number, message: string): void {
    this.db.update(mlRuns).set({ error_message: message, status: 'failed' }).where(eq(mlRuns.id, id)).run();
  }

  complete(id: number): void {
    this.db
      .update(mlRuns)
      .set({ status: 'completed', completed_at: new Date() })
      .where(eq(mlRuns.id, id))
      .run();
  }

  appendLog(runId: number, level: string, message: string): void {
    this.db.insert(mlRunLogs).values({ run_id: runId, level, message, created_at: new Date() }).run();
  }

  getLogs(runId: number): { level: string | null; message: string; created_at: Date | null }[] {
    return this.db.select().from(mlRunLogs).where(eq(mlRunLogs.run_id, runId)).all();
  }
}
