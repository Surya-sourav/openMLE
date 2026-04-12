import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import type { ConnectionCredentials } from '../../interfaces/connectioncredentials.interface.js';


export const connections = sqliteTable(
  'connections',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    connector: text('connector').notNull(),
    type: text('type', { enum: ['credentials', 'url'] }).notNull(),
    creds: text('creds', { mode: 'json' }).$type<ConnectionCredentials>(),
    is_default: integer('isdefault', { mode: 'boolean' }),
    created_at: integer('created_at', { mode: 'timestamp' }),
    updated_at: integer('updated_at', { mode: 'timestamp' }),
    is_valid : integer('isValid',{mode : 'boolean'}),
  },
  (Table) => ({
    connectorIdx: index('connections_connector').on(Table.connector),
    defaultIdx: index('idx_connections_default').on(Table.is_default),
    validIdx: index('idx_connections_valid').on(Table.is_valid),
  }),
);

// Typescript Interfaces :
export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
