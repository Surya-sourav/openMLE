import { getDatabase } from '../../electron/internal-database/local.database-config.js';
import { mlDatasets } from '../../electron/internal-database/schemas/ml-datasets.schema.js';
import { eq } from 'drizzle-orm';

export type NewMLDataset = typeof mlDatasets.$inferInsert;
export type MLDatasetRow = typeof mlDatasets.$inferSelect;

export class MLDatasetRepository {
  private get db() { return getDatabase(); }

  save(dataset: NewMLDataset): MLDatasetRow {
    const result = this.db
      .insert(mlDatasets)
      .values({ ...dataset, created_at: new Date() })
      .returning()
      .get();
    return result;
  }

  getAll(): MLDatasetRow[] {
    return this.db.select().from(mlDatasets).all();
  }

  getById(id: number): MLDatasetRow | undefined {
    return this.db.select().from(mlDatasets).where(eq(mlDatasets.id, id)).get();
  }

  delete(id: number): void {
    this.db.delete(mlDatasets).where(eq(mlDatasets.id, id)).run();
  }

  updateMetadata(
    id: number,
    rowCount: number,
    colCount: number,
    columnsJson: string,
    inferredTask?: string
  ): void {
    this.db
      .update(mlDatasets)
      .set({ row_count: rowCount, col_count: colCount, columns_json: columnsJson, inferred_task: inferredTask })
      .where(eq(mlDatasets.id, id))
      .run();
  }
}
