import { getDatabase } from "../local.database-config.js";
import { messages ,  NewMessage } from "../schemas/chat-messages.schema.js";
import { sessions , NewSession } from "../schemas/chat-session.schema.js";
import {eq , desc } from 'drizzle-orm';


export class ConversationRepository {

    private getDb = getDatabase;

    /* 
    Repository Methods for the Session Repository
    */
    newSession(sessionName : string)
    {
        const db = this.getDb();
        const result = db.insert(sessions).values({ name: sessionName }).returning().get();
        return result;
    }

    getSession(id : number)
    {
        const db = this.getDb();
        return db.select().from(sessions).where(eq(sessions.id, id)).get();
    }

    getAllSessions()
    {
        const db = this.getDb();
        return db.select().from(sessions).orderBy(desc(sessions.updated_at)).all();
    }

    deleteSession(id : number)
    {
        const db = this.getDb();
        try{
            db.delete(sessions).where(eq(sessions.id, id)).run();
            return {success : true};
        }
        catch(error)
        {
            return (error);
        }
    }

    /*
    Repository Methods for Messages :
     */

    newMessage(payload : NewMessage)
    {
        const db = this.getDb();
        const result = db.insert(messages).values(payload).returning().get();
        return result;
    }

    fetchAllMessagesPerSession(sessionid : number)
    {
        const db = this.getDb();
        const result = db.select().from(messages).where(eq(messages.session_id,sessionid)).orderBy(desc(messages.created_at)).all();
        return result;
    }

    deleteMessage(messageId : number)
    {
        const db = this.getDb();
        try{
            db.delete(messages).where(eq(messages.id , messageId)).run();
            return {success : true}
        }
        catch(error)
        {
            return error;
        }
    }
}




