import {index, sqliteTable, text} from "drizzle-orm/sqlite-core";

export const user = sqliteTable("user", {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  image: text('image'),
  knowledge: text('knowledge'),
  objective: text('objective'),
}, (t) => [
  index('teste_id').on(t.id)
]);
