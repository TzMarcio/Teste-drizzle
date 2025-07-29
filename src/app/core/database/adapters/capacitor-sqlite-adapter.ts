import {AsyncRemoteCallback, drizzle as baseDrizzle} from 'drizzle-orm/sqlite-proxy';
import {CapacitorSqliteDriver} from "./capacitor-sqlite-driver";
import {DrizzleConfig} from "drizzle-orm";
import {MigrationManager} from "./migration-manager";
import {SqliteRemoteDatabase} from "drizzle-orm/sqlite-proxy/driver";

type Listener = () => void;

export declare class CapacitorSqliteRemoteDatabase<TSchema extends Record<string, unknown> = Record<string, never>> extends SqliteRemoteDatabase<TSchema> {
  onAvailiable: (callback: Listener) => void;
  isAvailiable: boolean;
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

export const drizzleCapacitor = <TSchema extends Record<string, unknown>>(db: string, migrations?: Record<string, string>, config?: DrizzleConfig<TSchema>) => {
  const driver = new CapacitorSqliteDriver(db);

  const migration: MigrationManager = new MigrationManager(driver, migrations);

  let transaction: boolean = true;

  const instance:SqliteRemoteDatabase<TSchema> = baseDrizzle<TSchema>(capacitorSqliteDriver(driver, transaction), undefined, config);

  let readyListener: Listener = () => {};

  (instance as CapacitorSqliteRemoteDatabase<TSchema>).onAvailiable = () => {
    readyListener();
  };

  driver.init().then(async () => {
    await migration.applyMigrations();
    (instance as CapacitorSqliteRemoteDatabase<TSchema>).isAvailiable = true;
    readyListener();
  });

  (instance as CapacitorSqliteRemoteDatabase<TSchema>).onAvailiable = (callback: Listener) => {
    readyListener = callback;
  };

  return instance as CapacitorSqliteRemoteDatabase<TSchema>;

}

