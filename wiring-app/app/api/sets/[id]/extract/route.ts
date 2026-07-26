import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk, requireUser } from "@/lib/api-helpers";
import { logActivity } from "@/lib/activity";
import { demoExtractionService } from "@/lib/extraction/DemoDocumentExtractionService";

/**
 * הפעלת "מיפוי סט החיווט": מפעיל את שירות החילוץ (באב־טיפוס — מנוע הדגמה
 * שמייצר נתונים מדומים) ושומר את השורות לבדיקת המשתמש.
 */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = requireUser(req);
  if ("error" in auth) return auth.error;
  const { id } = await ctx.params;
  const db = getDb();
  const set = db.prepare("SELECT * FROM wiring_sets WHERE id = ?").get(Number(id)) as { id: number; name: string; mapping_status: string } | undefined;
  if (!set) return jsonError("סט חיווט לא נמצא", 404);
  if (set.mapping_status === "approved") return jsonError("הסט כבר אושר והוזן לפרויקט");

  const files = db.prepare("SELECT file_name, file_size FROM set_files WHERE set_id = ?").all(set.id) as { file_name: string; file_size: number }[];
  if (!files.length) return jsonError("יש להעלות קובצי PDF לפני הפעלת המיפוי");

  db.prepare("UPDATE wiring_sets SET mapping_status = 'extracting' WHERE id = ?").run(set.id);

  const result = await demoExtractionService.extract(
    files.map((f) => ({ fileName: f.file_name, fileSize: f.file_size }))
  );

  db.prepare("DELETE FROM extracted_rows WHERE set_id = ?").run(set.id);
  const insertRow = db.prepare(
    `INSERT INTO extracted_rows (set_id, cabinet_no, cable_no, wire_no, cable_type, source_cabinet, source_terminal, dest_cabinet, dest_terminal, description, valid, error_msg)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertAll = db.transaction(() => {
    for (const r of result.rows) {
      insertRow.run(set.id, r.cabinetNo, r.cableNo, r.wireNo, r.cableType, r.sourceCabinet, r.sourceTerminal, r.destCabinet, r.destTerminal, r.description, r.valid ? 1 : 0, r.errorMsg);
    }
  });
  insertAll();

  db.prepare("UPDATE wiring_sets SET mapping_status = 'review' WHERE id = ?").run(set.id);
  logActivity(db, auth.user.id, "הפעלת מיפוי סט חיווט", "set", set.id, set.name, "", `${result.rows.length} שורות (${result.engineName})`);

  return jsonOk({
    rowCount: result.rows.length,
    invalidCount: result.rows.filter((r) => !r.valid).length,
    isDemo: result.isDemo,
    engineName: result.engineName,
  });
}
