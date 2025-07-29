import {AsyncRemoteCallback, drizzle as baseDrizzle} from 'drizzle-orm/sqlite-proxy';
import {CapacitorSqliteDriver} from "./capacitor-sqlite-driver";
import {DrizzleConfig} from "drizzle-orm";
import {MigrationManager} from "./migration-manager";
import {SqliteRemoteDatabase} from "drizzle-orm/sqlite-proxy/driver";

export declare class CapacitorSqliteRemoteDatabase<TSchema extends Record<string, unknown> = Record<string, never>> extends SqliteRemoteDatabase<TSchema> {
  migration: () => Promise<void>;
}

export function capacitorSqliteDriver(driver: CapacitorSqliteDriver, transaction: boolean): AsyncRemoteCallback {
  return async (sql, params, method ) => {

    if(sql.trim().toLowerCase().includes('commit') || sql.trim().toLowerCase().includes('rollback')) {
      transaction = true;
    }

    const result = driver.call(sql, params, method, transaction)

    if(sql.trim().toLowerCase().includes('begin')) {
      transaction = false;
    }

    return result;
  };
}

export const drizzleCapacitor = <TSchema extends Record<string, unknown>>(db: string, config?: DrizzleConfig<TSchema>) => {
  const driver = new CapacitorSqliteDriver(db);
  driver.init().then()
  let transaction: boolean = true;
  const migration: MigrationManager = new MigrationManager(driver);

  const instance:SqliteRemoteDatabase<TSchema> = baseDrizzle<TSchema>(capacitorSqliteDriver(driver, transaction), undefined, config);

  (instance as CapacitorSqliteRemoteDatabase<TSchema>).migration = migration.applyMigrations.bind(migration);

  return instance as CapacitorSqliteRemoteDatabase<TSchema>;
}

