import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { seedIfEmpty } from "./seed";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

declare global {
  var __wiringDb: Database.Database | undefined;
}

function createDb(): Database.Database {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new Database(DB_PATH);
  const schema = fs.readFileSync(path.join(process.cwd(), "lib", "schema.sql"), "utf-8");
  db.exec(schema);
  seedIfEmpty(db);
  return db;
}

export function getDb(): Database.Database {
  if (!globalThis.__wiringDb) {
    globalThis.__wiringDb = createDb();
  }
  return globalThis.__wiringDb;
}
