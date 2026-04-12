import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { mlRuns } from './ml-runs.schema.js';

export const mlRunLogs = sqliteTable('ml_run_logs', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  run_id:     integer('run_id').notNull().references(() => mlRuns.id, { onDelete: 'cascade' }),
  level:      text('level').default('info'),
  message:    text('message').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }),
});
