import {drizzle} from 'drizzle-orm/sqlite-proxy';
import {CapacitorSQLite, SQLiteConnection} from '@capacitor-community/sqlite';
import {CapacitorSQLiteDriver} from './capacitor-driver';
import {MigrationManager} from './migration-manager';
import {user} from "./schemas/user.schema";

const sqlite = new SQLiteConnection(CapacitorSQLite);
const driver = new CapacitorSQLiteDriver(sqlite, 'meu_banco.db');

// const client = createClient({ url: process.env.DB_FILE_NAME! });

let transaction: boolean = false;

driver.init();

export const db:ReturnType<typeof drizzle> = drizzle((sql, params, method) => {

  console.log('Executing SQL:', sql, 'with params:', params, 'using method:', method);

  if(sql.includes('BEGIN')) {
    transaction = true;
  }else if(sql.includes('COMMIT') || sql.includes('ROLLBACK')) {
    transaction = false;
  }

  return driver.call(sql, params, method, transaction);

}, {
  schema: {
    user,
  }
});

console.log(db);

// export async function initDatabase() {
//   return drizzleDB;
// }
