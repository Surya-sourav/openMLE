import { ConversationRepository } from "../internal-database/repositories/conversation.repository.js";
import { NewSession , session } from "../internal-database/schemas/chat-session.schema.js";
import { NewMessage , Message } from "../internal-database/schemas/chat-messages.schema.js";
import { processRequest } from "../agents/sql-agent.js";
import { LLMservice } from "../llm-gateway/services/llm.service.js";
import { SQLAgentQueryRequest } from "../interfaces/requests/sql-agent-query.request.js";

export class SQLAgentService {

    private repository : ConversationRepository;
    private initialized: boolean = false;

    constructor()
    {
        this.repository = new ConversationRepository();
    }


    async newSession(name : string) : Promise<NewSession>
    {
        const sessiondetails = await this.repository.newSession(name);
        console.log("New Session Created");
        return sessiondetails;
    }   

    async getSession(id : number) : Promise<session>
    {
        const session = this.repository.getSession(id);
        return session!;
    }

    async getAllSessions() : Promise<session[]>
    {
        return await this.repository.getAllSessions();
    }

    async deleteSession(id : number) : Promise<void>
    {
        await this.repository.deleteSession(id);
    }

    /* 
    Service Methods for Messages
    */

    async newMessage(payload : SQLAgentQueryRequest) : Promise<NewMessage>
    {  

        try {
            // Process the message through the SQL Agent workflow
            const responseText = await processRequest(payload.query , payload.llmId , payload.connectionId);

            // Store both the user message and the agent's response in the database
            const newmessage = await this.repository.newMessage({
                session_id: payload.sessionId,
                request: payload.query,
                response: responseText
            });

            return newmessage;
        } catch (error) {
            console.error('Error processing message with SQL Agent:', error);
            
            // Store the message with an error response
            const newmessage = await this.repository.newMessage({
                session_id: payload.sessionId,
                request: payload.query,
                response: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
            });

            return newmessage;
        }
    }

    async getAllMessagesPerSession(sessionId : number)
    {
        const Messages = await this.repository.fetchAllMessagesPerSession(sessionId);
        return Messages;
    }

    async DeleteMessage(messageId : number)
    {
        await this.repository.deleteMessage(messageId);
    }



}