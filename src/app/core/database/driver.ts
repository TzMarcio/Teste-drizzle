// src/drizzle-capacitor-sqlite/driver.ts
import {SQLiteConnection} from '@capacitor-community/sqlite';
import {DefaultLogger} from 'drizzle-orm/logger';
import type {TablesRelationalConfig} from 'drizzle-orm/relations';
import {BaseSQLiteDatabase, SQLiteAsyncDialect} from 'drizzle-orm/sqlite-core';
import type {DrizzleConfig} from 'drizzle-orm/utils';
import {CapacitorSQLiteSession} from './session.js';

export interface CapacitorSQLiteDriverOptions {
  connection: SQLiteConnection;
  database: string;
  encrypted?: boolean;
  mode?: string;
  version?: number;
  readonly?: boolean;
}

export class CapacitorSQLiteDriver {
  constructor(
    private connection: SQLiteConnection,
    private database: string,
    private options: Omit<CapacitorSQLiteDriverOptions, 'connection' | 'database'> = {}
  ) {}

  async connect(): Promise<CapacitorSQLiteSession<any, any>> {
    const dbConnection = await this.connection.createConnection(
      this.database,
      this.options.encrypted ?? false,
      this.options.mode ?? 'no-encryption',
      this.options.version ?? 1,
      this.options.readonly ?? false
    );

    await dbConnection.open();

    // Create the SQLiteAsyncDialect instance
    const dialect = new SQLiteAsyncDialect();

    return new CapacitorSQLiteSession(
      dbConnection,
      dialect,
      undefined, // schema
      {}, // options
      undefined // logger
    );
  }
}

export type CapacitorSQLiteDatabase<
  TSchema extends Record<string, unknown> = Record<string, never>,
> = BaseSQLiteDatabase<'async', void, TSchema, TablesRelationalConfig>;

export function drizzle<TSchema extends Record<string, unknown> = Record<string, never>>(
  connection: SQLiteConnection,
  database: string,
  config: DrizzleConfig<TSchema> & CapacitorSQLiteDriverOptions
): CapacitorSQLiteDatabase<TSchema> {
  const driver = new CapacitorSQLiteDriver(connection, database, config);
  const logger = config.logger ?? new DefaultLogger();
  const session = driver.connect();

  return new BaseSQLiteDatabase('async', new SQLiteAsyncDialect(), session, config.schema) as CapacitorSQLiteDatabase<TSchema>;
}
