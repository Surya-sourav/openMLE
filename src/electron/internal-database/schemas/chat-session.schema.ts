import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable('chat-sessions',{

    id : integer('id').primaryKey({autoIncrement : true}).notNull(),
    name : text('name').notNull(),
    created_at : integer('created_at' , {mode : 'timestamp'}),
    updated_at : integer('updated_at' , {mode : 'timestamp'}),

});

export type session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;