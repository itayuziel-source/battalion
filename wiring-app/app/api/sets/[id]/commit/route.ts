import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk, requireUser } from "@/lib/api-helpers";
import { logActivity, notify } from "@/lib/activity";
import { canCommitSet } from "@/lib/permissions";
import { recalcAll } from "@/lib/recalc";

/**
 * "הכנסת הנתונים לפרויקט": הופך שורות מאושרות לארונות, כבלים וגידים.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if ("error" in auth) return auth.error;
  if (!canCommitSet(auth.user.role)) return jsonError("אין הרשאה לאשר נתוני מיפוי", 403);

  const { id } = await ctx.params;
  const db = getDb();
  const set = db.prepare("SELECT * FROM wiring_sets WHERE id = ?").get(Number(id)) as
    | { id: number; name: string; project_id: number; mapping_status: string }
    | undefined;
  if (!set) return jsonError("סט חיווט לא נמצא", 404);
  if (set.mapping_status === "approved") return jsonError("הסט כבר אושר והוזן לפרויקט");

  const rows = db.prepare("SELECT * FROM extracted_rows WHERE set_id = ? AND approved = 1 AND valid = 1").all(set.id) as {
    cabinet_no: string; cable_no: string; wire_no: string; cable_type: string;
    source_cabinet: string; source_terminal: string; dest_cabinet: string; dest_terminal: string; description: string;
  }[];
  if (!rows.length) return jsonError("אין שורות מאושרות להזנה — אשרו שורות במסך הבדיקה");

  let cabinetsCreated = 0;
  let cablesCreated = 0;

  const commit = db.transaction(() => {
    const cabinetIds = new Map<string, number>();
    const cableIds = new Map<string, number>();

    for (const r of rows) {
      let cabinetId = cabinetIds.get(r.cabinet_no);
      if (!cabinetId) {
        const existing = db.prepare("SELECT id FROM cabinets WHERE project_id = ? AND cabinet_no = ?").get(set.project_id, r.cabinet_no) as { id: number } | undefined;
        if (existing) {
          cabinetId = existing.id;
        } else {
          cabinetId = db.prepare(
            "INSERT INTO cabinets (project_id, set_id, cabinet_no, name) VALUES (?, ?, ?, ?)"
          ).run(set.project_id, set.id, r.cabinet_no, `ארון ${r.cabinet_no}`).lastInsertRowid as number;
          cabinetsCreated++;
        }
        cabinetIds.set(r.cabinet_no, cabinetId);
      }

      const cableKey = `${r.cabinet_no}|${r.cable_no}`;
      let cableId = cableIds.get(cableKey);
      if (!cableId) {
        const existing = db.prepare("SELECT id FROM cables WHERE cabinet_id = ? AND cable_no = ?").get(cabinetId, r.cable_no) as { id: number } | undefined;
        if (existing) {
          cableId = existing.id;
        } else {
          cableId = db.prepare(
            `INSERT INTO cables (cabinet_id, cable_no, source_cabinet, dest_cabinet, cable_type, description)
             VALUES (?, ?, ?, ?, ?, ?)`
          ).run(cabinetId, r.cable_no, r.source_cabinet || r.cabinet_no, r.dest_cabinet, r.cable_type, r.description).lastInsertRowid as number;
          cablesCreated++;
        }
        cableIds.set(cableKey, cableId);
      }

      db.prepare(
        `INSERT INTO wires (cable_id, wire_no, source_cabinet, source_terminal, dest_cabinet, dest_terminal, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(cableId, r.wire_no, r.source_cabinet || r.cabinet_no, r.source_terminal, r.dest_cabinet, r.dest_terminal, r.description);
    }

    db.prepare(
      "UPDATE wiring_sets SET mapping_status = 'approved', approved_by = ?, approved_at = datetime('now') WHERE id = ?"
    ).run(auth.user.id, set.id);
  });
  commit();

  recalcAll(db);
  logActivity(db, auth.user.id, "אישור נתוני מיפוי והזנה לפרויקט", "set", set.id, set.name, "review", "approved");
  notify(db, "set_approved", `סט "${set.name}" אושר והוזן לפרויקט (${rows.length} גידים)`, "set", set.id);

  return jsonOk({ wires: rows.length, cabinetsCreated, cablesCreated });
}
