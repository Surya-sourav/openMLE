import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import * as schema from './schemas/index.js';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let sqliteInstance: Database.Database | null = null;
let dbInstance: BetterSQLite3Database<typeof schema> | null = null;

export function connect(): Promise<BetterSQLite3Database<typeof schema>> {
  return new Promise((resolve, reject) => {
    if (dbInstance && sqliteInstance) {
      console.log('Database Already Connected');
      resolve(dbInstance);
      return;
    }

    try {
      // Determine database path
      const db_path = app.isPackaged
        ? path.join(app.getPath('appData'), 'application_database.db')
        : path.join(__dirname, '..', '..', '_database', 'application_database.db');

      // Ensure directory exists
      const dbDir = path.dirname(db_path);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      const isFirstRun = !fs.existsSync(db_path);
      console.log('Connecting to database at:', db_path);
      console.log('First Run Database Setup', isFirstRun);

      // Check if database file is corrupted
      if (!isFirstRun) {
        try {
          const testDb = new Database(db_path, { readonly: true });
          testDb.pragma('integrity_check');
          testDb.close();
        } catch (error: any) {
          console.error('⚠️ Database corrupted, recreating...', error.message);
          // Delete corrupted database
          fs.unlinkSync(db_path);
          // Delete WAL and SHM files
          try {
            fs.unlinkSync(db_path + '-wal');
          } catch {}
          try {
            fs.unlinkSync(db_path + '-shm');
          } catch {}
        }
      }

      // Create database connection
      sqliteInstance = new Database(db_path);

      // Enable WAL mode for better performance
      sqliteInstance.pragma('journal_mode = WAL');

      console.log('DB Connected');

      dbInstance = drizzle(sqliteInstance, { schema });
      console.log('Drizzle ORM Initialized');

      const migrationsPath = app.isPackaged
        ? path.join(
            process.resourcesPath,
            'app',
            'dist-electron',
            'internal-database',
            'migrations',
          )
        : path.join(__dirname, 'migrations');

      console.log('migrations path', migrationsPath);

      if (fs.existsSync(migrationsPath)) {
        const migrationFiles = fs.readdirSync(migrationsPath).filter((f) => f.endsWith('.sql'));

        if (migrationFiles.length > 0) {
          console.log(`Running ${migrationFiles.length} migrations ...`);

          try {
            migrate(dbInstance, { migrationsFolder: migrationsPath });
            console.log('✅ Migrations Completed');
          } catch (migrationError: any) {
            console.error('⚠️ Migration failed:', migrationError.message);

            // If table already exists, it's okay - just continue
            if (migrationError.message.includes('already exists')) {
              console.log('📋 Tables already exist, skipping migration');
            } else {
              throw migrationError;
            }
          }
        } else {
          console.log('No Migrations Found !');
        }
      } else {
        console.log('Migrations Doesnot exists !');
      }

      resolve(dbInstance);
    } catch (error) {
      console.error('Database connection FAILED!', error);
      reject(error);
    }
  });
}

//     function initializeSchema(db :  sqlite3.Database) : void{

//         db.exec(`
//             CREATE TABLE IF NOT EXISTS connections (

//                 id INTEGER PRIMARY KEY AUTOINCREMENT,
//                 connector TEXT NOT NULL,
//                 type TEXT NOT NULL,
//                 host TEXT,
//                 port INTEGER,
//                 database TEXT,
//                 user TEXT,
//                 password TEXT,
//                 url TEXT,
//                 is_default INTEGER DEFAULT 0,
//                 created_at INTEGER DEFAULT (unixepoch()),
//                 updated_at INTEGER DEFAULT (unixepoch())
//             );
//         CREATE INDEX IF NOT EXISTS idx_connections_connector ON connections(connector);
//         CREATE INDEX IF NOT EXISTS idx_connections_default ON connections(is_default);

//        `);
// }

export function disconnect(): void {
  if (sqliteInstance) {
    sqliteInstance.close();
    dbInstance = null;
    console.log('Shutting Down the Database');
  }
}

export function getDatabase(): BetterSQLite3Database<typeof schema> {
  if (!dbInstance) {
    throw new Error('Database not connected');
  }
  return dbInstance;
}

export function isDatabaseExisting(): boolean {
  const db_path = app.isPackaged
    ? path.join(app.getPath('appData'), 'application_database.db')
    : path.join(__dirname, '..', '..', '..', 'database', 'application_database.db');

  return fs.existsSync(db_path);
}
