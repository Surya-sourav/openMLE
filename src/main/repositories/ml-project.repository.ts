import { getDatabase } from '../../electron/internal-database/local.database-config.js';
import { mlProjects } from '../../electron/internal-database/schemas/ml-projects.schema.js';
import { eq } from 'drizzle-orm';

export type NewMLProject = typeof mlProjects.$inferInsert;
export type MLProjectRow = typeof mlProjects.$inferSelect;

export class MLProjectRepository {
  private get db() { return getDatabase(); }

  create(project: NewMLProject): MLProjectRow {
    return this.db
      .insert(mlProjects)
      .values({ ...project, created_at: new Date(), updated_at: new Date() })
      .returning()
      .get();
  }

  getAll(): MLProjectRow[] {
    return this.db.select().from(mlProjects).all();
  }

  getById(id: number): MLProjectRow | undefined {
    return this.db.select().from(mlProjects).where(eq(mlProjects.id, id)).get();
  }

  updateStatus(id: number, status: string): void {
    this.db
      .update(mlProjects)
      .set({ status, updated_at: new Date() })
      .where(eq(mlProjects.id, id))
      .run();
  }
}
