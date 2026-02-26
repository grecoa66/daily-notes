import { createDb } from "@daily-notes/db";

import { env } from "./env.js";

let dbInstance: ReturnType<typeof createDb> | null = null;

export function getDb() {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  if (!dbInstance) {
    dbInstance = createDb(env.DATABASE_URL);
  }

  return dbInstance;
}
