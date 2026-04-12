import { ipcMain } from 'electron';
import { SQLAgentService } from '../services/sql-agent.service.js';
import { ConnectionService } from '../services/connection.sevice.js';
import { SQLAgentQueryRequest } from '../interfaces/requests/sql-agent-query.request.js';

export class AgentHandler {

    private agentService: SQLAgentService;

    constructor() {
        this.agentService = new SQLAgentService();
    }


    public registerAgentHandlers(): void {

          
        /* 
        Session Handlers 
        */
        // Create a new session
        ipcMain.handle('agent/session/new', async (event, sessionName: string) => {
            try {
                return await this.agentService.newSession(sessionName);
            } catch (error) {
                console.error('Error creating new session:', error);
                throw error;
            }
        });

        // Get a specific session by ID
        ipcMain.handle('agent/session/get', async (event, sessionId: number) => {
            try {
                return await this.agentService.getSession(sessionId);
            } catch (error) {
                console.error('Error getting session:', error);
                throw error;
            }
        });

        // Get all sessions
        ipcMain.handle('agent/session/getall', async (event) => {
            try {
                return await this.agentService.getAllSessions();
            } catch (error) {
                console.error('Error getting all sessions:', error);
                throw error;
            }
        });

        // Delete a session
        ipcMain.handle('agent/session/delete', async (event, sessionId: number) => {
            try {
                await this.agentService.deleteSession(sessionId);
                return { success: true };
            } catch (error) {
                console.error('Error deleting session:', error);
                throw error;
            }
        });

        /* 
        Message Handlers
        */

        // Send a new message and get AI response
        ipcMain.handle('agent/message/new', async (event, payloadreq : SQLAgentQueryRequest) => {
            try {
                // Check if database is connected
                const connService = await ConnectionService.getInstance(payloadreq.connectionId);
                if (!connService.client) {
                    throw new Error('No active database connection. Please connect to a database first.');
                }
                return await this.agentService.newMessage( payloadreq );
            } catch (error) {
                console.error('Error processing new message:', error);
                throw error;
            }
        });

        // Get all messages for a session
        ipcMain.handle('agent/message/getall', async (event, sessionId: number) => {
            try {
                return await this.agentService.getAllMessagesPerSession(sessionId);
            } catch (error) {
                console.error('Error getting messages:', error);
                throw error;
            }
        });

        console.log('✅ SQL Agent handlers registered');
    }
}