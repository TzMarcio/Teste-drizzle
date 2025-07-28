import { drizzle } from 'drizzle-orm/sqlite-proxy';
import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { user } from "./schemas/user.schema";
import {CapacitorSQLiteDriver} from "./capacitor-sqlite-driver";

// Initialize SQLite connection
const driver = new CapacitorSQLiteDriver('meu_banco.db');
driver.init()
// Initialize driver

// Create Drizzle instance with proxy
export const db = drizzle(
  async (sql, params, method) => {
    console.log('Executing SQL:', sql, 'with params:', params, 'using method:', method);

    // Handle transaction detection
    const isTransactionStart = sql.trim().toLowerCase().startsWith('begin');
    const isTransactionEnd = sql.trim().toLowerCase().startsWith('commit') ||
      sql.trim().toLowerCase().startsWith('rollback');
    return driver.call(sql, params, method, isTransactionStart || isTransactionEnd);
  },
  {
    schema: {
      user,
    },
  }
);

// Export driver for migrations and other operations
export { driver };

