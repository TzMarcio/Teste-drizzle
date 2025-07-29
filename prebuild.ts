import { Glob } from "bun";
import path from "path";

async function generateEmbbeddedMigration() {
  let baseObj = {};
  const files = new Glob("src/assets/drizzle/*.sql").scanSync();

  for (const file of files) {
    const sql = Bun.file(file);
    const sqlText = await sql.text();
    const cleanedSqlText = sqlText.replace(/[\r\n\t]/g, " ");

    // Extract just the file name from the full path
    const fileName = path.basename(file);

    baseObj = {
      ...baseObj,
      [fileName]: cleanedSqlText,
    };
  }

  await Bun.write(
    "migration/migrations.ts",
    `export const migrations = ${JSON.stringify(baseObj, null, 2)};`
  );

  console.log("baseObj", baseObj);
}

generateEmbbeddedMigration();
