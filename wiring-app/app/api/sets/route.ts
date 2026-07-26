import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk, requireUser } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";

export async function GET() {
  const db = getDb();
  const sets = db.prepare(
    `SELECT s.*, u.name AS approver_name, p.name AS project_name
     FROM wiring_sets s
     LEFT JOIN users u ON u.id = s.approved_by
     JOIN projects p ON p.id = s.project_id
     ORDER BY s.id DESC`
  ).all() as Record<string, unknown>[];
  const files = getDb().prepare("SELECT * FROM set_files").all() as { set_id: number }[];
  for (const s of sets) {
    s.files = files.filter((f) => f.set_id === s.id);
    s.row_count = (db.prepare("SELECT COUNT(*) AS n FROM extracted_rows WHERE set_id = ?").get(s.id) as { n: number }).n;
  }
  return jsonOk(sets);
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if ("error" in auth) return auth.error;
  const body = await req.json();
  const { project_id, name, version, files } = body ?? {};
  if (!project_id || !name) return jsonError("נדרשים שם סט ושיוך לפרויקט");
  const db = getDb();
  const project = db.prepare("SELECT id FROM projects WHERE id = ?").get(project_id);
  if (!project) return jsonError("פרויקט לא נמצא", 404);

  const setId = db.prepare(
    `INSERT INTO wiring_sets (project_id, name, version, received_date, mapping_status)
     VALUES (?, ?, ?, date('now'), ?)`
  ).run(project_id, name, version ?? "1", Array.isArray(files) && files.length > 0 ? "uploaded" : "new").lastInsertRowid as number;

  if (Array.isArray(files)) {
    const insertFile = db.prepare("INSERT INTO set_files (set_id, file_name, file_size) VALUES (?, ?, ?)");
    for (const f of files) {
      if (f?.name) insertFile.run(setId, String(f.name), Number(f.size) || 0);
    }
  }
  logActivity(db, auth.user.id, "יצירת סט חיווט", "set", setId, String(name));
  return jsonOk(db.prepare("SELECT * FROM wiring_sets WHERE id = ?").get(setId), 201);
}
