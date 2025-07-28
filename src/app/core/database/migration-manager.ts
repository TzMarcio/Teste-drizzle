import {drizzle} from 'drizzle-orm/sqlite-proxy';
import {CapacitorSQLiteDriver} from './capacitor-driver';
import {user} from "./schemas/user.schema";
import {Directory, Filesystem} from "@capacitor/filesystem";

export class MigrationManager {
  private readonly driver: CapacitorSQLiteDriver;
  private readonly db: ReturnType<typeof drizzle>;

  constructor(driver: CapacitorSQLiteDriver, drizzleDB:ReturnType<typeof drizzle>) {
    this.driver = driver;
    this.db = drizzleDB;
  }

  async applyMigrations(): Promise<void> {
    try {
      console.log('🔧 Iniciando aplicação de migrações...');
      //
      // this.driver.

      const migrations = await this.loadMigrationList();

      await this.ensureMigrationsTable();

      const applied = await this.getAppliedMigrations();

      console.log('[Applied Migrations]', applied);

      for (let x = 0; x < migrations.length; x++) {
        const migration = migrations[x];
        if (applied.includes(migration)) {
          console.log(`✔️ Migração ${migration} já aplicada`);
          continue;
        }

        const queries = await this.loadMigrationFile(migration);
        for (let y = 0; y < queries.length; y++) {
          const query = queries[y];
          await this.driver.execute(query);
        }

        await this.markMigrationAsApplied(migration);
        console.log(`✅ Migração ${migration} aplicada`);
      }

      console.log('✅ Todas as migrações foram processadas');
    } catch (error) {
      console.error('❌ Erro ao aplicar migrações:', error);
      throw error;
    }
  }

  private async ensureMigrationsTable(): Promise<void> {
    await this.driver.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id TEXT PRIMARY KEY
      );
    `);
  }

  private async getAppliedMigrations(): Promise<string[]> {
    const result = await this.driver.query('SELECT id FROM _migrations');
    const values = Array.isArray(result) ? result : result?.values;
    return values?.map((row: any) => row.id) || [];
  }

  private async markMigrationAsApplied(name: string): Promise<void> {
    await this.driver.run('INSERT INTO _migrations (id) VALUES (?)', [name]);
  }

  private async loadMigrationList(): Promise<string[]> {

    return [
      '0000_boring_gateway.sql',
      '0001_medical_star_brand.sql'
    ];
  }

  private async loadMigrationFile(filename: string): Promise<string[]> {
    const response = await fetch(`./assets/drizzle/${filename}`);
    const text = await response.text();

    // Divide as queries por ';' e remove espaços vazios
    return text
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);
  }

}
