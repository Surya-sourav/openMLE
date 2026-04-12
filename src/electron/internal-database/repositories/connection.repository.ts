import { getDatabase } from '../local.database-config.js';
import { connections, Connection, NewConnection } from '../schemas/connections.schema.js';
import { CreateConnection } from '../../interfaces/requests/create-connection.request.js';
import { eq, desc } from 'drizzle-orm';

export class ConnectionRepository {
  private getDb = getDatabase;

  saveConnection(connection: CreateConnection): Connection {
    const db = this.getDb();
    const newconnection = {
      connector: connection.connector,
      type: connection.type,
      creds: connection.creds,
      is_default: connection.is_default || false,
      is_valid : connection.is_valid,
    };
    const result = db.insert(connections).values(newconnection).returning().get();
    return result;
  }

  // This method would be used for Getting the Connection from the Local Storage :

  getConnection(id: number): Connection | undefined {
    const db = this.getDb();
    return db.select().from(connections).where(eq(connections.id, id)).get();
  }

  getAllConnections(): Connection[] {
    const db = this.getDb();
    return db.select().from(connections).orderBy(desc(connections.updated_at)).all();
  }

  getDefaultConnection(): Connection | undefined {
    const db = this.getDb();
    return db.select().from(connections).where(eq(connections.is_default, true)).get();
  }

  setDefaultConnection(id: number): void {
    const db = this.getDb();

    db.update(connections).set({ is_default: false }).run();
    db.update(connections)
      .set({ is_default: true, updated_at: new Date() })
      .where(eq(connections.id, id))
      .run();
  }

  // This method would be used for updating the Connection :
  deleteConnection(id: number) {
    const db = this.getDb();
    db.delete(connections).where(eq(connections.id, id)).run();
    return { success: true };
  }

  hasConnections(): boolean {
    const db = this.getDb();
    const result = db.select().from(connections).limit(1).all();
    return result.length > 0;
  }

  isValid(id : number): boolean {
    try {
      const db = this.getDb();
      const res = db.select().from(connections).where(eq(connections.id,id)).get();
      return res?.is_valid?? false;
    }
    catch(error) {
      throw error;
    }
  }
}

export type { Connection, NewConnection };
