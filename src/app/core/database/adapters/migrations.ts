export const migrations = {
  "0000_boring_gateway.sql": "CREATE TABLE `user` (   `id` text PRIMARY KEY NOT NULL,   `name` text NOT NULL,   `email` text NOT NULL,   `image` text,   `knowledge` text,   `objective` text  );  --> statement-breakpoint  CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);",
  "0001_medical_star_brand.sql": "CREATE INDEX `teste_id` ON `user` (`id`);"
};