// src/drizzle-capacitor-sqlite/prepared-query.ts
import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import {entityKind, Logger, Query} from 'drizzle-orm';
import { SQLitePreparedQuery, type PreparedQueryConfig } from 'drizzle-orm/sqlite-core';
import type { SelectedFieldsOrdered } from 'drizzle-orm/sqlite-core';
import {ExecuteResult} from "drizzle-orm/sqlite-core/session";

export type SQLiteExecuteMethod = 'run' | 'get' | 'all' | 'values';

export class CapacitorSQLitePreparedQuery<T extends PreparedQueryConfig> extends SQLitePreparedQuery<T> {
  static override readonly [entityKind]: string = 'CapacitorSQLitePreparedQuery';

  constructor(
    private client: SQLiteDBConnection,
    private override query: Query,
    private logger: Logger,
    private fields: SelectedFieldsOrdered | undefined,
    private override executeMethod: SQLiteExecuteMethod,
    private _isResponseInArrayMode: boolean,
    private customResultMapper?: (rows: unknown[][]) => T['execute'],
  ) {
    super();
  }

  override execute(placeholderValues?: Record<string, unknown>) {
    const params = fillPlaceholders(this.query.params, placeholderValues ?? {});
    this.logger.logQuery(this.query.sql, params);

    const { sql } = this.query;

    try {
      switch (this.executeMethod) {
        case 'run': {
          const result = await this.client.run(sql, params);
          return {
            changes: result.changes?.changes ?? 0,
            lastInsertRowid: result.changes?.lastId ?? 0,
          } as T['execute'];
        }

        case 'get': {
          const result = await this.client.query(sql, params);
          const rows = result.values ?? [];
          return rows.length > 0 ? this.mapResult(rows[0]) : undefined as T['execute'];
        }

        case 'all':
        case 'values': {
          const result = await this.client.query(sql, params);
          const rows = result.values ?? [];
          return this.mapResults(rows) as T['execute'];
        }

        default:
          throw new Error(`Unknown execute method: ${this.executeMethod}`);
      }
    } catch (err: any) {
      this.logger.logQuery(sql, params);
      throw err;
    }
  }

  private override mapResult(row: any[]): any {
    if (!this.fields) {
      return row;
    }

    const result: Record<string, any> = {};
    for (let i = 0; i < this.fields.length; i++) {
      const field = this.fields[i]!;
      result[field.path.join('.')] = row[i];
    }
    return result;
  }

  private mapResults(rows: any[][]) {
    if (this.customResultMapper) {
      return this.customResultMapper(rows);
    }

    return rows.map((row) => this.mapResult(row));
  }
}

function fillPlaceholders(params: unknown[], values: Record<string, unknown>): unknown[] {
  return params.map((param) => {
    if (param && typeof param === 'object' && 'name' in param) {
      return values[(param as any).name];
    }
    return param;
  });
}
