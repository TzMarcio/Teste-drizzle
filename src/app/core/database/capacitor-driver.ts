// import {CapacitorSQLite, capSQLiteSet, SQLiteConnection, SQLiteDBConnection} from '@capacitor-community/sqlite';
//
// export class CapacitorSQLiteDriver {
//   private connection: SQLiteDBConnection | null = null;
//   private readonly sqlite: SQLiteConnection;
//   private readonly dbName: string;
//
//   constructor(sqlite: SQLiteConnection, dbName: string) {
//     this.sqlite = sqlite;
//     this.dbName = dbName;
//   }
//
//   async init(): Promise<void> {
//     try {
//
//       await this.sqlite.copyFromAssets().catch((err) => {
//         console.warn('⚠️ copyFromAssets falhou:', err.message);
//       });
//
//       const { result: isConsistent } = await this.sqlite.checkConnectionsConsistency();
//       console.log('🔍 Verificando consistência das conexões:', isConsistent);
//
//       if (!isConsistent) {
//         console.log('🔧 Conexão inconsistente. Criando conexão...');
//         await this.sqlite.createConnection(this.dbName, false, 'no-encryption', 1, false);
//       }
//
//       this.connection = await this.sqlite.retrieveConnection(this.dbName, false);
//
//       if (!this.connection) {
//         throw new Error(`❌ Falha ao recuperar conexão: ${this.dbName}`);
//       }
//
//       await this.connection.open();
//
//       await this.connection.query('PRAGMA journal_mode=WAL;');
//
//       console.log('✅ Conexão com o banco de dados inicializada:', this.dbName);
//     } catch (error) {
//       console.error('❌ Erro ao inicializar o banco de dados:', error);
//       throw error;
//     }
//   }
//
//   async query(query: string, params: any[] = []): Promise<any> {
//     if (!this.connection) {
//       throw new Error('Conexão com o banco de dados não inicializada');
//     }
//
//     // query = query.replace('), (', '),(').replace(') ,(', '),(');
//     //
//     // if (query.toUpperCase().startsWith("INSERT") && query.includes("),.(")) {
//     //
//     //   await this.connection.beginTransaction();
//     //
//     //   const result = await this.connection.run(
//     //     query,
//     //     params,
//     //     false,
//     //     'all'
//     //   );
//     //
//     //   await this.connection.commitTransaction();
//     //
//     //   return result.changes?.values || [];
//     //
//     // }else {
//     //
//     //   const result = await this.connection.query(query, params);
//     //   return result.values || [];
//     //
//     // }
//
//     const result = await this.connection.query(query, params);
//     return result.values || [];
//
//   }
//
//   async execute(query: string, params: boolean | undefined = false): Promise<void> {
//     if (!this.connection) {
//       throw new Error('Conexão com o banco de dados não inicializada');
//     }
//
//     void this.connection.execute(query, params);
//   }
//
//   async batch(queries: string[]): Promise<void> {
//     if (!this.connection) {
//       throw new Error('Conexão com o banco de dados não inicializada');
//     }
//
//     const formattedQueries = queries.map((query) => ({ statement: query, values: [] }));
//     void this.connection.executeSet(formattedQueries);
//   }
//
//   async run(query: string, params: any[] = [], transaction: boolean = false): Promise<void> {
//     if (!this.connection) {
//       throw new Error('Conexão com o banco de dados não inicializada');
//     }
//
//     await this.connection.run(query, params, transaction);
//
//   }
//
//   async call(sql: string, params: any[], method: "run" | "all" | "values" | "get", transaction: boolean = true) {
//     if (!this.connection) {
//       throw new Error('Conexão com o banco de dados não inicializada');
//     }
//
//     const run = async (sql: string, params: any[]) => {
//       if (!this.connection) {
//         throw new Error('Conexão com o banco de dados não inicializada');
//       }
//       console.time('RUN')
//
//       // if(sql.startsWith('begin')){
//       //   await this.connection.beginTransaction();
//       // }else if(sql.startsWith('commit')){
//       //   await this.connection.commitTransaction();
//       // }else {
//       //
//       //   await this.run(sql, params);
//       //
//       // }
//
//       await this.run(sql, params, transaction);
//
//       console.timeLog('RUN', sql)
//       console.timeEnd('RUN')
//
//
//       return { rows: [] };
//     }
//
//     const values = async (sql: string, params: any[]) => {
//       if (!this.connection) {
//         throw new Error('Conexão com o banco de dados não inicializada');
//       }
//       const result = await this.query(sql, params);
//       return { rows: (result || []).map((row: Record<string, any>) => Object.values(row)) };
//     }
//
//     const get = async (sql: string, params: any[]) => {
//       if (!this.connection) {
//         throw new Error('Conexão com o banco de dados não inicializada');
//       }
//       const result = await this.query(sql, params);
//       return { rows: result.values?.[0]
//           ? [Object.values(result.values[0])]
//           : [] };
//     }
//
//     switch (method) {
//       case "run":
//         return await run(sql, params);
//
//       case "all":
//       case "values":
//         return await values(sql, params);
//
//       case "get":
//         return await get(sql, params);
//
//       default:
//         throw new Error(`Método inválido: ${method}`);
//     }
//   }
//
// }
