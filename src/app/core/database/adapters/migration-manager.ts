import { CapacitorSqliteDriver } from "./capacitor-sqlite-driver";
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';

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
    try {
      // Try to read migration list from app's data directory first
      const migrationList = await this.readMigrationListFile();
      if (migrationList.length > 0) {
        return migrationList;
      }
    } catch (error) {
      console.warn('Could not load migration list from filesystem, using embedded list');
    }

    // Fallback to embedded list
    return this.getEmbeddedMigrationList();
  }

  private async readMigrationListFile(): Promise<string[]> {
    try {
      const { data } = await Filesystem.readFile({
        path: 'drizzle/migration-list.json',
        directory: Directory.Data, // Use Data directory instead of Bundle
        encoding: Encoding.UTF8
      });

      const migrationData = JSON.parse(data as string);
      return migrationData.migrations || [];
    } catch (error) {
      console.warn('Migration list not found in Data directory');
      return [];
    }
  }

  private getEmbeddedMigrationList(): string[] {
    // Embedded migration list as fallback
    return [
      '0000_boring_gateway.sql',
      '0001_medical_star_brand.sql'
    ];
  }

  private async loadMigrationFile(filename: string): Promise<string[]> {
    try {
      console.log(`📁 Loading migration file: ${filename}`);

      let fileContent: string;

      if (Capacitor.isNativePlatform()) {
        // On native platforms, try to read from Data directory first
        fileContent = await this.readFileFromNative(filename);
      } else {
        // On web platform, use fetch to read from assets
        fileContent = await this.readFileFromWeb(filename);
      }

      return this.parseMigrationContent(fileContent);
    } catch (error) {
      console.error(`Error loading migration file ${filename}:`, error);

      // Fallback to embedded migrations
      return this.getEmbeddedMigration(filename);
    }
  }

  private async readFileFromNative(filename: string): Promise<string> {
    // Try Data directory first (app-specific storage)
    try {
      const { data } = await Filesystem.readFile({
        path: `drizzle/${filename}`,
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });
      console.log(`📄 Loaded ${filename} from Data directory`);
      return data as string;
    } catch (error) {
      console.log(`📄 ${filename} not found in Data directory`);
    }

    // Try Documents directory as fallback
    try {
      const { data } = await Filesystem.readFile({
        path: `drizzle/${filename}`,
        directory: Directory.Documents,
        encoding: Encoding.UTF8
      });
      console.log(`📄 Loaded ${filename} from Documents directory`);
      return data as string;
    } catch (error) {
      throw new Error(`Migration file ${filename} not found in any directory`);
    }
  }

  private async readFileFromWeb(filename: string): Promise<string> {
    // On web, use fetch to read from assets
    const possiblePaths = [
      `./assets/drizzle/${filename}`,
      `./public/assets/drizzle/${filename}`,
      `/assets/drizzle/${filename}`,
      `/public/assets/drizzle/${filename}`,
      `assets/drizzle/${filename}` // Ionic often uses this path
    ];

    for (const path of possiblePaths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          console.log(`📄 Loaded ${filename} from web path: ${path}`);
          return await response.text();
        }
      } catch (error) {
        console.log(`Failed to load from ${path}`);
      }
    }

    throw new Error(`Could not load migration file from any web path`);
  }

  private getEmbeddedMigration(filename: string): string[] {
    // Embedded migrations as ultimate fallback
    const embeddedMigrations: { [key: string]: string } = {
      '0000_boring_gateway.sql': `
        CREATE TABLE users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE
        );
        CREATE INDEX idx_users_email ON users(email);
      `,
      '0001_medical_star_brand.sql': `
        ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
        CREATE TABLE posts (
          id INTEGER PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          title TEXT NOT NULL,
          content TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `
    };

    const content = embeddedMigrations[filename];
    if (!content) {
      throw new Error(`Unknown embedded migration: ${filename}`);
    }

    console.log(`📦 Using embedded migration: ${filename}`);
    return this.parseMigrationContent(content);
  }

  private parseMigrationContent(content: string): string[] {
    return content
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0);
  }

  // Utility method to copy migration files to device storage
  async copyMigrationsToDevice(migrations: { [filename: string]: string }): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Not on native platform, skipping migration copy');
      return;
    }

    try {
      // Ensure drizzle directory exists in Data directory
      await Filesystem.mkdir({
        path: 'drizzle',
        directory: Directory.Data,
        recursive: true
      });

      // Copy each migration file
      for (const [filename, content] of Object.entries(migrations)) {
        await Filesystem.writeFile({
          path: `drizzle/${filename}`,
          data: content,
          directory: Directory.Data,
          encoding: Encoding.UTF8
        });
        console.log(`📝 Copied ${filename} to device Data directory`);
      }

      // Create migration list
      const migrationList = {
        migrations: Object.keys(migrations),
        updatedAt: new Date().toISOString()
      };

      await Filesystem.writeFile({
        path: 'drizzle/migration-list.json',
        data: JSON.stringify(migrationList, null, 2),
        directory: Directory.Data,
        encoding: Encoding.UTF8
      });

      console.log('✅ All migrations copied to device Data directory');
    } catch (error) {
      console.error('❌ Error copying migrations to device:', error);
      throw error;
    }
  }

  // Method to check available migrations in filesystem
  async listAvailableMigrations(): Promise<string[]> {
    try {
      const { files } = await Filesystem.readdir({
        path: 'drizzle',
        directory: Directory.Data
      });

      return files
        .filter(file => file.name.endsWith('.sql'))
        .map(file => file.name)
        .sort();
    } catch (error) {
      console.warn('Could not list migrations from Data directory');
      return [];
    }
  }

  // Method to clear all migrations from device storage
  async clearMigrationsFromDevice(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await Filesystem.rmdir({
        path: 'drizzle',
        directory: Directory.Data,
        recursive: true
      });
      console.log('🗑️ Cleared all migrations from device storage');
    } catch (error) {
      console.warn('Could not clear migrations from device storage:', error);
    }
  }
}
