/**
 * איפוס בסיס הנתונים: מוחק את קובץ ה־DB ומריץ Seed מחדש.
 * הפעלה: npm run db:reset
 */
import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { seed } from "../lib/seed";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "app.db");

for (const suffix of ["", "-wal", "-shm"]) {
  const p = DB_PATH + suffix;
  if (fs.existsSync(p)) fs.rmSync(p);
}
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(DB_PATH);
const schema = fs.readFileSync(path.join(process.cwd(), "lib", "schema.sql"), "utf-8");
db.exec(schema);
seed(db);
db.close();

console.log("✔ בסיס הנתונים אופס ונתוני הדוגמה נטענו מחדש (data/app.db)");
