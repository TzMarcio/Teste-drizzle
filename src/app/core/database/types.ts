// src/drizzle-capacitor-sqlite/types.ts
import type { SQLiteDBConnection } from '@capacitor-community/sqlite';
import {Logger} from "drizzle-orm";

export interface CapacitorSQLiteDriverConfig {
  connection: SQLiteDBConnection;
  logger?: Logger;
}

export interface CapacitorSQLiteQueryResult {
  values?: any[][];
  changes?: {
    changes: number;
    lastId: number;
  };
}
