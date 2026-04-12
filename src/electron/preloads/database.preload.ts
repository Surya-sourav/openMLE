/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Connection } from '../internal-database/schemas/connections.schema.js';

export interface DatabaseAPI {
  getAll: () => Promise<Connection[]>;
  getDefault: () => Promise<Connection>;
  saveConnection: (connection: Connection, setAsDefault: boolean) => Promise<Connection>;
  setDefaultConnection: (id: number) => Promise<{ success: boolean }>;
  connect: (id: number) => Promise<{ success: boolean; message: string }>;
  disconnect: (id: number) => Promise<{ success: boolean }>;
  deleteConnection: (id: number) => Promise<boolean>;
  isActiveConnection: (id: number) => Promise<boolean>;
  getActiveConnection: (id: number) => Promise<any>;
  testConnection: (connection : Connection) => Promise<boolean>;
}
