import {CapacitorSqliteDriver} from "./capacitor-sqlite-driver";

export class MigrationManager {
  private readonly driver: CapacitorSqliteDriver;

  constructor(driver: CapacitorSqliteDriver) {
    this.driver = driver;
  }

  async applyMigrations(): Promise<void> {
    try {
      console.log('🔧 Starting migration application...');

      const migrations = await this.loadMigrationList();
      await this.ensureMigrationsTable();
      const applied = await this.getAppliedMigrations();

      console.log('[Applied Migrations]', applied);

      for (const migration of migrations) {
        if (applied.includes(migration)) {
          console.log(`✔️ Migration ${migration} already applied`);
          continue;
        }

        console.log(`🔄 Applying migration ${migration}...`);
        const queries = await this.loadMigrationFile(migration);

        // Apply migration in transaction
        await this.driver.run('BEGIN', []);

        try {
          for (const query of queries) {
            await this.driver.execute(query);
          }

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
    `);
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

  private async loadMigrationList(): Promise<string[]> {
    // You can load this from a file or define statically
    return [
      '0000_boring_gateway.sql',
      '0001_medical_star_brand.sql'
    ];
  }

  private async loadMigrationFile(filename: string): Promise<string[]> {
    try {
      const response = await fetch(`./assets/drizzle/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to load migration file: ${filename}`);
      }

      const text = await response.text();

      // Split queries by semicolon and filter empty ones
      return text
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0);
    } catch (error) {
      console.error(`Error loading migration file ${filename}:`, error);
      throw error;
    }
  }
}
