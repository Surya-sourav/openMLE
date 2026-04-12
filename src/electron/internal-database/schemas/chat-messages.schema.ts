import { text , integer, sqliteTable  } from "drizzle-orm/sqlite-core";
import { sessions } from "./chat-session.schema.js";

export const messages = sqliteTable('messages',{

    id : integer('id').primaryKey({autoIncrement : true}),
    session_id : integer('session_id').notNull().references(()=> sessions.id , {onDelete : 'cascade'}),
    request : text('request').notNull(),
    response : text ('response'),
    created_at : integer('created_at',{mode : "timestamp"}),
    updated_at : integer('updated_at',{mode : "timestamp"}),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
