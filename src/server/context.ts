import type { Database } from "@/db";
import { getDb } from "@/db";

export type Context = {
  db: Database;
  now: () => Date;
};

export function createContext(): Context {
  return {
    db: getDb(),
    now: () => new Date(),
  };
}
