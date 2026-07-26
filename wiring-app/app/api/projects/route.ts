import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk, requireUser } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const db = getDb();
  const projects = db.prepare("SELECT * FROM projects ORDER BY id").all();
  return jsonOk(projects);
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if ("error" in auth) return auth.error;
  const body = await req.json();
  const { name, station_name, work_number, manager_name, start_date } = body ?? {};
  if (!name || !station_name) return jsonError("שם פרויקט ושם תחנה הם שדות חובה");
  const db = getDb();
  const id = db.prepare(
    `INSERT INTO projects (name, station_name, work_number, manager_name, start_date)
     VALUES (?, ?, ?, ?, ?)`
  ).run(name, station_name, work_number ?? "", manager_name ?? auth.user.name, start_date ?? new Date().toISOString().slice(0, 10)).lastInsertRowid as number;
  logActivity(db, auth.user.id, "יצירת פרויקט", "project", id, name);
  return jsonOk(db.prepare("SELECT * FROM projects WHERE id = ?").get(id), 201);
}
