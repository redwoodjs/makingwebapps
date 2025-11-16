import { type Migrations } from "rwsdk/db";

export const migrations = {
  "001_initial_schema": {
    async up(db) {
      return [
        await db.schema
          .createTable("emails")
          .addColumn("id", "text", (col) => col.primaryKey())
          .addColumn("from", "text", (col) => col.notNull())
          .addColumn("to", "text", (col) => col.notNull())
          .addColumn("subject", "text", (col) => col.notNull())
          .addColumn("message", "text", (col) => col.notNull())
          .addColumn("raw", "text", (col) => col.notNull())
          .execute(),
      ];
    },

    async down(db) {
      return [await db.schema.dropTable("emails").ifExists().execute()];
    },
  },
} satisfies Migrations;
