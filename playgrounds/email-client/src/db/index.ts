import { env } from "cloudflare:workers";
import { type Database, createDb } from "rwsdk/db";
import { migrations } from "@/db/migrations";
import { SqliteDurableObject } from "rwsdk/db";

export type DB = Database<typeof migrations>;

export const db = createDb<DB>(env.DATABASE, "emails");

export class DatabaseDurableObject extends SqliteDurableObject {
  migrations = migrations;
}
