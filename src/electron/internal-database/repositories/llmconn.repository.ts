import { eq, desc, sql } from 'drizzle-orm';
import { getDatabase } from '../local.database-config.js';
import { llmconn } from '../schemas/llmconn.schema.js';
import type { NewConnection } from '../schemas/llmconn.schema.js';

import type { CreateLLMConnectionRequest as llmconnreq } from '../../llm-gateway/interfaces/requests/createllmconnection.request.js';
import type { LLMConnectionResponse } from '../../llm-gateway/interfaces/responses/llmconnection.response.js';

export class LLMconnrepository {
  private getdb = getDatabase;

  saveConnection(connection: llmconnreq) {
    try {
      const db = this.getdb();
      const result = db.insert(llmconn).values(connection).returning().get();
      return result;
    } catch (error) {
      console.error(' Error saving LLM connection:', error);
      throw error;
    }
  }

  getExistingConfigurations() {
    try {
      const db = this.getdb();
      const all_llm_apis = db.select().from(llmconn).orderBy(desc(llmconn.created_at)).all();
      return all_llm_apis;
    } catch (error) {
      console.error(' Error getting LLM configurations:', error);
      throw error;
    }
  }

  getConnectionById(id: number) {
    try {
      const db = this.getdb();
      const connection = db.select().from(llmconn).where(eq(llmconn.id, id)).get();
      return connection || null;
    } catch (error) {
      console.error(' Error getting LLM connection by ID:', error);
      throw error;
    }
  }

  getDefaultLlm() {
    try {
      const db = this.getdb();
      const defaultllm = db.select().from(llmconn).where(eq(llmconn.is_default, true)).get();
      return defaultllm || null;
    } catch (error) {
      console.error(' Error getting default LLM:', error);
      throw error;
    }
  }

  setDefaultLlm(id : number) {
    try {
      const db = this.getdb();

      // Use transaction to ensure atomicity
      db.transaction(() => {
        // Set all to false
        db.update(llmconn).set({ is_default: false }).run();

        // Set specific provider to true
        const result = db
          .update(llmconn)
          .set({ is_default: true, updated_at: new Date() })
          .where(eq(llmconn.id, id))
          .run();

        if (result.changes === 0) {
          throw new Error(`Provider '${id}' not found`);
        }
      });
    } catch (error) {
      console.error('❌ Error setting default LLM:', error);
      throw error;
    }
  }

  updateConnection(id: number, updates: Partial<NewConnection>) {
    try {
      const db = this.getdb();
      const result = db
        .update(llmconn)
        .set({ ...updates, updated_at: new Date() })
        .where(eq(llmconn.id, id))
        .returning()
        .get();

      if (!result) {
        throw new Error(`LLM connection with ID ${id} not found`);
      }

      return result;
    } catch (error) {
      console.error(' Error updating LLM connection:', error);
      throw error;
    }
  }

  getLlmConnection(id: number) {
    try {
      const db = this.getdb();
      const llmconnection = db.select().from(llmconn).where(eq(llmconn.id, id)).get();
      return llmconnection || null;
    } catch (error) {
      console.error(' Error getting LLM connection:', error);
      throw error;
    }
  }

  hasConnections(): boolean {
    try {
      const db = this.getdb();
      const result = db
        .select({ count: sql<number>`count(*)` })
        .from(llmconn)
        .get();
      return (result?.count || 0) > 0;
    } catch (error) {
      console.error(' Error checking connections:', error);
      return false;
    }
  }
}

export { llmconn };
export type { NewConnection, llmconnreq, LLMConnectionResponse };
