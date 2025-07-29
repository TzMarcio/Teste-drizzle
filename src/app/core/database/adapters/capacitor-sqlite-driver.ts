import {CapacitorSQLite, SQLiteConnection, SQLiteDBConnection} from '@capacitor-community/sqlite';
import {map} from "../../util/util";

export class CapacitorSqliteDriver {
  private connection: SQLiteDBConnection | null = null;
  private readonly sqlite: SQLiteConnection;
  private readonly dbName: string;

  constructor(dbName: string) {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
    this.dbName = dbName;
  }

  async init(): Promise<void> {
    try {
      // Copy database from assets if available

      await this.sqlite.copyFromAssets().catch((err) => {
        console.warn('⚠️ copyFromAssets failed:', err.message);
      });

      // Check connection consistency
      const { result: isConsistent } = await this.sqlite.checkConnectionsConsistency();
      console.log('🔍 Checking connection consistency:', isConsistent);

      if (!isConsistent) {
        console.log('🔧 Inconsistent connection. Creating new connection...');
        await this.sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
      }

      // Retrieve and open connection
      this.connection = await this.sqlite.retrieveConnection(this.dbName, false);
      if (!this.connection) {
        throw new Error(`❌ Failed to retrieve connection: ${this.dbName}`);
      }
      console.log(this.connection)
      await this.connection.open();

      // Enable WAL mode for better performance
      await this.connection.query('PRAGMA journal_mode=WAL;');

      console.log('✅ Database connection initialized:', this.dbName);
    } catch (error) {
      console.error('❌ Error initializing database:', error, this.dbName);
      throw error;
    }
  }

  async query(query: string, params: any[] = []): Promise<any[]> {
    if (!this.connection) {
      await this.init()
      await this.query(query, params)
      // throw new Error('Database connection not initialized');
    }

    try {
      if(!this.connection){
        throw new Error('Database connection not initialized at Query');
      }
      const result = await this.connection.query(query, params);
      return result.values || [];
    } catch (error) {
      console.error('Query failed:', query, params, error);
      throw error;
    }
  }

  async execute(query: string, transaction: boolean = false): Promise<void> {
    if (!this.connection) {
      await this.init()
      await this.execute(query, transaction);
    }

    try {
      if(!this.connection) {
        throw new Error('Database connection not initialized at Execute');
      }

      await this.connection.execute(query, transaction);
    } catch (error) {
      console.error('Execute failed:', query, error);
      throw error;
    }
  }

  async run(query: string, params: any[] = [], transaction: boolean = false): Promise<any> {
    if (!this.connection) {
      throw new Error('Database connection not initialized');
    }

    try {
      const lowerCasedQuery = query.trim().toLowerCase()
      if(lowerCasedQuery.includes('begin')) {
        return await this.connection.beginTransaction()
      }else if(lowerCasedQuery.includes('commit')) {
        return await this.connection.commitTransaction()
      }else if(lowerCasedQuery.includes('rollback')) {
        return await this.connection.rollbackTransaction();
      }else {
        return await this.connection.run(query, params, transaction);
      }
    } catch (error) {
      console.error('Run failed:', query, params, error);
      throw error;
    }
  }

  async batch(queries: string[]): Promise<void> {
    if (!this.connection) {
      throw new Error('Database connection not initialized');
    }

    try {
      const formattedQueries = map(queries, (query) => ({
        statement: query,
        values: []
      }));
      await this.connection.executeSet(formattedQueries);
    } catch (error) {
      console.error('Batch failed:', queries, error);
      throw error;
    }
  }

  // Main method called by Drizzle proxy
  async call(
    sql: string,
    params: any[],
    method: "run" | "all" | "values" | "get",
    transaction: boolean = false
  ): Promise<{ rows: any[] }> {
    if (!this.connection) {
      console.error("invalid connection")
      await this.init()
      await this.call(sql, params,method, transaction);
    }

    try {


      if(!this.connection) {
        throw new Error('Database connection not initialized at call');
      }

      switch (method) {
        case "run": {
          await this.run(sql, params, transaction);
          return { rows: [] };
        }

        case "all": {
          const result = await this.query(sql, params);
          return { rows: result || [] };
        }

        case "values": {
          const result = await this.query(sql, params);
          return {
            rows: (result || []).map((row: Record<string, any>) => Object.values(row))
          };
        }

        case "get": {
          const result = await this.query(sql, params);
          const firstRow = result?.[0];
          return {
            rows: firstRow ? [firstRow] : []
          };
        }

        default:
          throw new Error(`Invalid method: ${method}`);
      }
    } catch (error) {
      console.error(`Method ${method} failed:`, sql, params, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.connection) {
      try {
        await this.connection.close();
        await this.sqlite.closeConnection(this.dbName, false);
        this.connection = null;
        console.log('🔒 Database connection closed');
      } catch (error) {
        console.error('Error closing connection:', error);
        throw error;
      }
    }
  }
}
