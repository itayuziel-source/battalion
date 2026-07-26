import { getDb } from "@/lib/db";
import { jsonOk } from "@/lib/api-helpers";

export async function GET() {
  const db = getDb();
  const cabinets = db.prepare(
    `SELECT c.*, u.name AS assignee_name,
       (SELECT COUNT(*) FROM deviations d WHERE d.cabinet_id = c.id AND d.status IN ('open','in_review')) AS open_deviations
     FROM cabinets c
     LEFT JOIN users u ON u.id = c.assignee_id
     ORDER BY c.cabinet_no`
  ).all();
  return jsonOk(cabinets);
}
