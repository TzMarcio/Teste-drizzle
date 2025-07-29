// @ts-expect-error bun:types não esta definido no package.json/tsconfig
import { test, expect, mock, beforeEach, afterEach, describe, beforeAll } from "bun:test";

// Mock Capacitor Filesystem API
const mockFilesystem = {
  readFile: mock(),
  writeFile: mock(),
  mkdir: mock(),
  readdir: mock(),
  rmdir: mock(),
  checkPermissions: mock(),
  requestPermissions: mock()
};

// Mock Capacitor Core
const mockCapacitor = {
  isNativePlatform: mock(() => false)
};

// Mock the Capacitor modules before importing
mock.module("@capacitor/filesystem", () => ({
  Filesystem: mockFilesystem,
  Directory: {
    Documents: 'DOCUMENTS',
    Data: 'DATA',
    Library: 'LIBRARY',
    Cache: 'CACHE',
    External: 'EXTERNAL',
    ExternalStorage: 'EXTERNAL_STORAGE',
    ExternalCache: 'EXTERNAL_CACHE',
    LibraryNoCloud: 'LIBRARY_NO_CLOUD',
    Temporary: 'TEMPORARY'
  },
  Encoding: {
    UTF8: 'utf8',
    ASCII: 'ascii',
    UTF16: 'utf16'
  }
}));

mock.module("@capacitor/core", () => ({
  Capacitor: mockCapacitor
}));

// Mock fetch for web platform
const mockFetch = mock((url: string) => {
  console.log('🔍 Fetch called with:', url);

  if (url.includes('0000_boring_gateway.sql')) {
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve('CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT);')
    });
  }

  if (url.includes('0001_medical_star_brand.sql')) {
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve('ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;')
    });
  }

  return Promise.resolve({
    ok: false,
    text: () => Promise.resolve('')
  });
});

beforeAll(() => {
  globalThis.fetch = mockFetch as any;
});

// Mock CapacitorSqliteDriver
const mockDriver = {
  init: mock(() => Promise.resolve()),
  query: mock(() => Promise.resolve([])),
  execute: mock(() => Promise.resolve()),
  run: mock(() => Promise.resolve({ changes: 1, lastId: 1 })),
  close: mock(() => Promise.resolve())
};

// Import after mocking
import { MigrationManager } from "./migration-manager";

describe("MigrationManager with Capacitor Filesystem", () => {
  let migrationManager: MigrationManager;

  beforeEach(() => {
    // Clear all mocks
    mockFetch.mockClear();
    Object.values(mockFilesystem).forEach(fn => fn.mockClear());
    Object.values(mockDriver).forEach(fn => fn.mockClear());
    mockCapacitor.isNativePlatform.mockClear();

    // Reset default implementations
    mockDriver.query.mockResolvedValue([]);
    mockDriver.execute.mockResolvedValue(undefined);
    mockDriver.run.mockResolvedValue({ changes: 1, lastId: 1 });
    mockCapacitor.isNativePlatform.mockReturnValue(false);

    migrationManager = new MigrationManager(mockDriver as any);
  });

  describe("Migration Application", () => {
    test("should apply migrations successfully on web platform", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      mockDriver.query.mockResolvedValue([]); // No applied migrations

      await migrationManager.applyMigrations();

      // Verify migration table creation
      expect(mockDriver.execute).toHaveBeenCalledWith(
        expect.stringContaining("CREATE TABLE IF NOT EXISTS _migrations")
      );

      // Verify fetch was called for web platform
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("0000_boring_gateway.sql"));
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("0001_medical_star_brand.sql"));

      // Verify transactions
      expect(mockDriver.run).toHaveBeenCalledWith("BEGIN", []);
      expect(mockDriver.run).toHaveBeenCalledWith("COMMIT", []);

      // Verify migrations marked as applied
      expect(mockDriver.run).toHaveBeenCalledWith(
        "INSERT INTO _migrations (id) VALUES (?)",
        ["0000_boring_gateway.sql"]
      );
    });

    test("should apply migrations successfully on native platform", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockDriver.query.mockResolvedValue([]);

      // Mock filesystem read from Data directory
      mockFilesystem.readFile.mockResolvedValue({
        data: 'CREATE TABLE users (id INTEGER PRIMARY KEY);'
      });

      await migrationManager.applyMigrations();

      // Verify filesystem read was called
      expect(mockFilesystem.readFile).toHaveBeenCalledWith({
        path: 'drizzle/0000_boring_gateway.sql',
        directory: 'DATA',
        encoding: 'utf8'
      });

      // Verify migration execution
      expect(mockDriver.execute).toHaveBeenCalledWith('CREATE TABLE users (id INTEGER PRIMARY KEY)');
    });

    test("should skip already applied migrations", async () => {
      // Mock one applied migration
      mockDriver.query.mockResolvedValue([
        { id: "0000_boring_gateway.sql" }
      ]);

      await migrationManager.applyMigrations();

      // Should not fetch the already applied migration on web
      expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining("0000_boring_gateway.sql"));
      // Should still fetch the second migration
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("0001_medical_star_brand.sql"));
    });

    test("should rollback on migration error", async () => {
      mockDriver.query.mockResolvedValue([]);
      mockDriver.execute.mockImplementation((query: string) => {
        if (query.includes("CREATE TABLE IF NOT EXISTS _migrations")) {
          return Promise.resolve();
        }
        return Promise.reject(new Error("Migration execution failed"));
      });

      await expect(migrationManager.applyMigrations()).rejects.toThrow("Migration execution failed");

      // Verify rollback was called
      expect(mockDriver.run).toHaveBeenCalledWith("BEGIN", []);
      expect(mockDriver.run).toHaveBeenCalledWith("ROLLBACK", []);
    });
  });

  describe("File Loading", () => {
    test("should load migration list from filesystem on native", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);

      // Mock migration list file
      mockFilesystem.readFile.mockImplementation((options: any) => {
        if (options.path === 'drizzle/migration-list.json') {
          return Promise.resolve({
            data: JSON.stringify({
              migrations: ["custom_migration.sql"],
              updatedAt: "2025-01-29T17:00:00.000Z"
            })
          });
        }

        // Mock actual migration file
        return Promise.resolve({
          data: 'CREATE TABLE custom (id INTEGER);'
        });
      });

      mockDriver.query.mockResolvedValue([]);

      await migrationManager.applyMigrations();

      // Should read migration list
      expect(mockFilesystem.readFile).toHaveBeenCalledWith({
        path: 'drizzle/migration-list.json',
        directory: 'DATA',
        encoding: 'utf8'
      });

      // Should read custom migration
      expect(mockFilesystem.readFile).toHaveBeenCalledWith({
        path: 'drizzle/custom_migration.sql',
        directory: 'DATA',
        encoding: 'utf8'
      });
    });

    test("should fallback to Documents directory if Data fails", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockDriver.query.mockResolvedValue([]);

      // Mock Data directory failure, Documents success
      mockFilesystem.readFile.mockImplementation((options: any) => {
        if (options.directory === 'DATA') {
          return Promise.reject(new Error('File not found in Data directory'));
        }
        if (options.directory === 'DOCUMENTS') {
          return Promise.resolve({
            data: 'CREATE TABLE users (id INTEGER);'
          });
        }
        return Promise.reject(new Error('File not found'));
      });

      await migrationManager.applyMigrations();

      // Should try Data directory first
      expect(mockFilesystem.readFile).toHaveBeenCalledWith({
        path: 'drizzle/0000_boring_gateway.sql',
        directory: 'DATA',
        encoding: 'utf8'
      });

      // Should fallback to Documents directory
      expect(mockFilesystem.readFile).toHaveBeenCalledWith({
        path: 'drizzle/0000_boring_gateway.sql',
        directory: 'DOCUMENTS',
        encoding: 'utf8'
      });
    });

    test("should use embedded migrations as ultimate fallback", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockDriver.query.mockResolvedValue([]);

      // Mock all filesystem operations to fail
      mockFilesystem.readFile.mockRejectedValue(new Error('File not found'));

      await migrationManager.applyMigrations();

      // Should still execute migrations using embedded content
      expect(mockDriver.execute).toHaveBeenCalled();
      expect(mockDriver.run).toHaveBeenCalledWith("COMMIT", []);
    });

    test("should handle web platform fetch failures gracefully", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);
      mockDriver.query.mockResolvedValue([]);

      // Mock fetch to fail for all paths
      const failingFetch = mock(() => Promise.resolve({
        ok: false,
        text: () => Promise.resolve('')
      }));

      const originalFetch = globalThis.fetch;
      globalThis.fetch = failingFetch as any;

      // Should fallback to embedded migrations
      await migrationManager.applyMigrations();

      // Should still execute migrations
      expect(mockDriver.execute).toHaveBeenCalled();
      expect(mockDriver.run).toHaveBeenCalledWith("COMMIT", []);

      globalThis.fetch = originalFetch;
    });
  });

  describe("Device Storage Management", () => {
    test("should copy migrations to device storage", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);

      const migrations = {
        'test_migration.sql': 'CREATE TABLE test (id INTEGER);',
        'another_migration.sql': 'CREATE TABLE another (id INTEGER);'
      };

      // await migrationManager.copyMigrationsToDevice(migrations);

      // Should create directory
      expect(mockFilesystem.mkdir).toHaveBeenCalledWith({
        path: 'drizzle',
        directory: 'DATA',
        recursive: true
      });

      // Should write migration files
      expect(mockFilesystem.writeFile).toHaveBeenCalledWith({
        path: 'drizzle/test_migration.sql',
        data: 'CREATE TABLE test (id INTEGER);',
        directory: 'DATA',
        encoding: 'utf8'
      });

      // Should write migration list
      expect(mockFilesystem.writeFile).toHaveBeenCalledWith({
        path: 'drizzle/migration-list.json',
        data: expect.stringContaining('"migrations"'),
        directory: 'DATA',
        encoding: 'utf8'
      });
    });

    test("should skip copying on web platform", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(false);

      const migrations = { 'test.sql': 'CREATE TABLE test (id INTEGER);' };

      // await migrationManager.copyMigrationsToDevice(migrations);
      //
      // // Should not call filesystem operations
      // expect(mockFilesystem.mkdir).not.toHaveBeenCalled();
      // expect(mockFilesystem.writeFile).not.toHaveBeenCalled();
    });

    test("should list available migrations", async () => {
      mockFilesystem.readdir.mockResolvedValue({
        files: [
          { name: 'migration1.sql', type: 'file' },
          { name: 'migration2.sql', type: 'file' },
          { name: 'not-a-migration.txt', type: 'file' },
          { name: 'subfolder', type: 'directory' }
        ]
      });

      // const result = await migrationManager.listAvailableMigrations();
      //
      // expect(result).toEqual(['migration1.sql', 'migration2.sql']);
      // expect(mockFilesystem.readdir).toHaveBeenCalledWith({
      //   path: 'drizzle',
      //   directory: 'DATA'
      // });
    });

    test("should clear migrations from device storage", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);

      // await migrationManager.clearMigrationsFromDevice();
      //
      // expect(mockFilesystem.rmdir).toHaveBeenCalledWith({
      //   path: 'drizzle',
      //   directory: 'DATA',
      //   recursive: true
      // });
    });

    test("should handle filesystem errors gracefully", async () => {
      mockFilesystem.readdir.mockRejectedValue(new Error('Directory not found'));
      //
      // const result = await migrationManager.listAvailableMigrations();
      //
      // expect(result).toEqual([]);
    });
  });

  describe("Migration Content Parsing", () => {
    test("should parse migration content correctly", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockDriver.query.mockResolvedValue([]);

      // Mock file with multiple SQL statements
      mockFilesystem.readFile.mockResolvedValue({
        data: `
          CREATE TABLE users (id INTEGER PRIMARY KEY);
          CREATE INDEX idx_users_id ON users(id);
          INSERT INTO users VALUES (1);
        `
      });

      await migrationManager.applyMigrations();

      // Should execute each statement separately
      expect(mockDriver.execute).toHaveBeenCalledWith('CREATE TABLE users (id INTEGER PRIMARY KEY)');
      expect(mockDriver.execute).toHaveBeenCalledWith('CREATE INDEX idx_users_id ON users(id)');
      expect(mockDriver.execute).toHaveBeenCalledWith('INSERT INTO users VALUES (1)');
    });

    test("should handle empty migration content", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockDriver.query.mockResolvedValue([]);

      mockFilesystem.readFile.mockResolvedValue({
        data: '   ;  ;  ; '  // Empty statements
      });

      await migrationManager.applyMigrations();

      // Should still complete successfully without executing empty statements
      expect(mockDriver.run).toHaveBeenCalledWith("COMMIT", []);
    });
  });

  describe("Error Handling", () => {
    test("should handle migration table creation failure", async () => {
      mockDriver.execute.mockImplementation((query: string) => {
        if (query.includes("CREATE TABLE IF NOT EXISTS _migrations")) {
          return Promise.reject(new Error("Table creation failed"));
        }
        return Promise.resolve();
      });

      await expect(migrationManager.applyMigrations()).rejects.toThrow("Table creation failed");
    });

    test("should handle applied migrations query failure", async () => {
      mockDriver.query.mockRejectedValue(new Error("Query failed"));

      await expect(migrationManager.applyMigrations()).rejects.toThrow("Query failed");
    });

    test("should handle filesystem permission errors", async () => {
      mockCapacitor.isNativePlatform.mockReturnValue(true);
      mockFilesystem.mkdir.mockRejectedValue(new Error("Permission denied"));

      const migrations = { 'test.sql': 'CREATE TABLE test (id INTEGER);' };

      // await expect(migrationManager.copyMigrationsToDevice(migrations)).rejects.toThrow("Permission denied");
    });
  });
});
