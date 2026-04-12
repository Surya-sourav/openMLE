import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const llmconn = sqliteTable('llmconnections', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  provider: text('provider').notNull(),
  key: text('key').notNull(),
  model: text('model').notNull(), // Default model for this connection
  is_default: integer('is_default', { mode: 'boolean' }).default(false),
  created_at: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
  updated_at: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type llmconn = typeof llmconn.$inferSelect;

export type NewConnection = Omit<llmconn, 'id' | 'created_at' | 'updated_at'> & {
  created_at?: Date;
  updated_at?: Date;
};
