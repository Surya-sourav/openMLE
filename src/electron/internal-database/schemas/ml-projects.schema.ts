import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// dataset_id stores the UUID string from DatasetService (file-based registry),
// not a FK to ml_datasets, as both systems are intentionally decoupled.
export const mlProjects = sqliteTable('ml_projects', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  name:       text('name').notNull(),
  dataset_id: text('dataset_id').notNull(),
  goal:       text('goal').notNull(),
  status:     text('status').notNull().default('idle'),
  created_at: integer('created_at', { mode: 'timestamp' }),
  updated_at: integer('updated_at', { mode: 'timestamp' }),
});
