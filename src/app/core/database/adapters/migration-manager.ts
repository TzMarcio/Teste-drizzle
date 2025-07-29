import {CapacitorSqliteDriver} from "./capacitor-sqlite-driver";

export class MigrationManager {
  private readonly driver: CapacitorSqliteDriver;
  private readonly migrations: Record<string, string> | undefined;

  constructor(driver: CapacitorSqliteDriver, migrations?: Record<string, string>) {
    this.driver = driver;
    this.migrations = migrations;
  }

  async applyMigrations(): Promise<void> {
    try {
      console.log('🔧 Starting migration application...');

      if(!this.migrations){
        throw new Error('🔧 Nenhuma migration encontrada');
      }

      // const migrations = await this.loadMigrationList();
      await this.ensureMigrationsTable();

      const applied = await this.getAppliedMigrations();
      console.log('[Applied Migrations]', applied);

      for (const migration of Object.keys(this.migrations)) {
        if (applied.includes(migration)) {
          console.log(`✔️ Migration ${migration} already applied`);
          continue;
        }

        console.log(`🔄 Applying migration ${migration}...`);
        const query = this.migrations[migration];

        // Apply migration in transaction
        await this.driver.run('BEGIN', []);
        try {
          await this.driver.execute(query, 'migration');
          await this.markMigrationAsApplied(migration);
          await this.driver.run('COMMIT', []);
          console.log(`✅ Migration ${migration} applied successfully`);
        } catch (error) {
          await this.driver.run('ROLLBACK', []);
          throw error;
        }
      }

      console.log('✅ All migrations processed successfully');
    } catch (error) {
      console.error('❌ Error applying migrations:', error);
      throw error;
    }
  }

  private async ensureMigrationsTable(): Promise<void> {
    await this.driver.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
                                               id TEXT PRIMARY KEY,
                                               applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `, 'ensureMigrationsTable');
  }

  private async getAppliedMigrations(): Promise<string[]> {
    const result = await this.driver.query('SELECT id FROM _migrations ORDER BY applied_at');
    return result?.map((row: any) => row.id) || [];
  }

  private async markMigrationAsApplied(name: string): Promise<void> {
    await this.driver.run(
      'INSERT INTO _migrations (id) VALUES (?)',
      [name]
    );
  }

}
