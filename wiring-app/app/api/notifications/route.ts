import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonOk } from "@/lib/api-helpers";

export async function GET() {
  const db = getDb();
  const notifications = db.prepare(
    "SELECT * FROM notifications ORDER BY created_at DESC, id DESC LIMIT 30"
  ).all();
  const unread = (db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE read = 0").get() as { n: number }).n;
  return jsonOk({ notifications, unread });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  if (body.action === "mark_all_read") {
    db.prepare("UPDATE notifications SET read = 1").run();
  } else if (body.action === "mark_read" && body.id) {
    db.prepare("UPDATE notifications SET read = 1 WHERE id = ?").run(Number(body.id));
  }
  return jsonOk({ ok: true });
}
