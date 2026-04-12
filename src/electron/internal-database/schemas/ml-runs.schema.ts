import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { mlProjects } from './ml-projects.schema.js';

export const mlRuns = sqliteTable('ml_runs', {
  id:               integer('id').primaryKey({ autoIncrement: true }),
  project_id:       integer('project_id').notNull().references(() => mlProjects.id, { onDelete: 'cascade' }),
  stage:            text('stage').notNull().default('eda'),
  status:           text('status').notNull().default('pending'),
  eda_result_json:  text('eda_result_json'),
  plan_json:        text('plan_json'),
  plan_approved:    integer('plan_approved', { mode: 'boolean' }),
  code_path:        text('code_path'),
  model_path:       text('model_path'),
  eval_json:        text('eval_json'),
  report_path:      text('report_path'),
  error_message:    text('error_message'),
  started_at:       integer('started_at', { mode: 'timestamp' }),
  completed_at:     integer('completed_at', { mode: 'timestamp' }),
  created_at:       integer('created_at', { mode: 'timestamp' }),
});
