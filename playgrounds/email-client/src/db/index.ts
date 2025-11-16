import { env } from "cloudflare:workers";
import { type Database, createDb } from "rwsdk/db";
import { migrations } from "@/db/migrations";

export type DB = Database<typeof migrations>;

export const db = createDb<DB>(env.DATABASE, "emails");
