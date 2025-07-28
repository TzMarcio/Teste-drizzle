import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  out: './src/assets/drizzle',
  schema: [
    './src/app/core/database/schemas/', // Adjust the path to your schema file
  ],
  dialect: 'sqlite',
  dbCredentials: {
    url: 'meu_banco.db',
  },
});
