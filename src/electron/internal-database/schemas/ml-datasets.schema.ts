import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const mlDatasets = sqliteTable('ml_datasets', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  name:          text('name').notNull(),
  original_name: text('original_name').notNull(),
  file_path:     text('file_path').notNull(),
  file_size:     integer('file_size'),
  mime_type:     text('mime_type'),
  row_count:     integer('row_count'),
  col_count:     integer('col_count'),
  columns_json:  text('columns_json'),
  inferred_task: text('inferred_task'),
  created_at:    integer('created_at', { mode: 'timestamp' }),
});
