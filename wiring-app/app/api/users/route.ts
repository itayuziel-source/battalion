import { getDb } from "@/lib/db";
import { jsonOk } from "@/lib/api-helpers";

export async function GET() {
  const db = getDb();
  const users = db.prepare("SELECT * FROM users ORDER BY role DESC, name").all();
  return jsonOk(users);
}
