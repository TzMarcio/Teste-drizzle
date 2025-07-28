// src/drizzle-capacitor-sqlite/session.ts
import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import {Logger, NoopLogger, Query} from 'drizzle-orm';
import {
  PreparedQueryConfig, SelectedFieldsOrdered,
  SQLiteAsyncDialect,
  SQLiteTransaction,
  type SQLiteTransactionConfig,
} from 'drizzle-orm/sqlite-core';
import {RelationalSchemaConfig, TablesRelationalConfig} from "drizzle-orm/relations";
import {DrizzleConfig} from "drizzle-orm/utils";

export class CapacitorSQLiteSession<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
> {
  private logger: Logger;

  constructor(
    private client: SQLiteDBConnection,
    private dialect: SQLiteAsyncDialect,
    private schema: RelationalSchemaConfig<TSchema> | undefined,
    private options: DrizzleConfig<TSchema> = {},
    logger?: Logger,
  ) {
    this.logger = logger ?? new NoopLogger();
  }

  async prepareQuery<T extends PreparedQueryConfig>(
    query: Query,
    fields: SelectedFieldsOrdered | undefined,
    executeMethod: SQLiteExecuteMethod,
    isResponseInArrayMode: boolean,
    customResultMapper?: (rows: unknown[][]) => T['execute'],
  ): Promise<PreparedQuery<T>> {
    return new CapacitorSQLitePreparedQuery(
      this.client,
      query,
      this.logger,
      fields,
      executeMethod,
      isResponseInArrayMode,
      customResultMapper,
    );
  }

  async transaction<T>(
    transaction: (tx: CapacitorSQLiteTransaction<TFullSchema, TSchema>) => T | Promise<T>,
    config?: SQLiteTransactionConfig,
  ): Promise<T> {
    // Begin transaction
    await this.client.beginTransaction();

    try {
      const tx = new CapacitorSQLiteTransaction(this.dialect, this, this.schema);
      const result = await transaction(tx);

      // Commit transaction
      await this.client.commitTransaction();
      return result;
    } catch (error) {
      // Rollback transaction on error
      try {
        await this.client.rollbackTransaction();
      } catch (rollbackError) {
        this.logger.logQuery('Failed to rollback transaction', []);
        // Log rollback error but throw original error
      }
      throw error;
    }
  }
}

export class CapacitorSQLiteTransaction<
  TFullSchema extends Record<string, unknown>,
  TSchema extends TablesRelationalConfig,
> extends SQLiteTransaction<'async', void, TFullSchema, TSchema> {
  static readonly [entityKind]: string = 'CapacitorSQLiteTransaction';

  constructor(
    dialect: SQLiteAsyncDialect,
    session: CapacitorSQLiteSession<TFullSchema, TSchema>,
    schema: RelationalSchemaConfig<TSchema> | undefined,
  ) {
    super('async', dialect, session, schema);
  }

  // Override rollback method to use Capacitor's API
  async rollback(): Promise<never> {
    const session = this.session as CapacitorSQLiteSession<TFullSchema, TSchema>;
    await (session as any).client.rollbackTransaction();
    throw new TransactionRollbackError();
  }
}

// src/drizzle-capacitor-sqlite/errors.ts
export class TransactionRollbackError extends Error {
  constructor() {
    super('Transaction was rolled back');
    this.name = 'TransactionRollbackError';
  }
}
