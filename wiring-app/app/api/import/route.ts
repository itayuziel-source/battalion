import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonError, jsonOk, requireUser } from "@/lib/api-helpers";
import { logActivity, notify } from "@/lib/activity";
import { recalcAll } from "@/lib/recalc";

/**
 * ייבוא סט חיווט מקובץ JSON מקומי (פורמט wiring-app-import-v1).
 * מיועד לטעינת נתונים שחולצו משרטוט אמיתי בלי לשמור אותם בקוד המערכת:
 * הקובץ נשאר אצל המשתמש, והנתונים נטענים לבסיס הנתונים המקומי בלבד.
 */

interface ImportWire {
  wire_no: string;
  source_terminal: string;
  dest_terminal: string;
  description?: string;
}

interface ImportCable {
  cable_no: string;
  cable_type?: string;
  dest_cabinet?: string;
  description?: string;
  notes?: string;
  wires: ImportWire[];
}

interface ImportCabinet {
  cabinet_no: string;
  name?: string;
  location?: string;
  notes?: string;
  cables: ImportCable[];
}

interface ImportPayload {
  format: string;
  project: {
    name: string;
    station_name?: string;
    work_number?: string;
    manager_name?: string;
    start_date?: string;
  };
  set?: { name?: string; version?: string; files?: string[] };
  cabinets: ImportCabinet[];
  replace?: boolean;
}

export async function POST(req: NextRequest) {
  const auth = requireUser(req);
  if ("error" in auth) return auth.error;

  const payload = (await req.json()) as ImportPayload;
  if (payload?.format !== "wiring-app-import-v1") {
    return jsonError("פורמט קובץ לא מוכר — נדרש wiring-app-import-v1");
  }
  if (!payload.project?.name || !Array.isArray(payload.cabinets) || payload.cabinets.length === 0) {
    return jsonError("הקובץ חייב לכלול פרויקט ולפחות ארון אחד");
  }

  const db = getDb();
  let cabinets = 0, cables = 0, wires = 0;

  const run = db.transaction(() => {
    if (payload.replace) {
      // ניקוי כל נתוני העבודה (המשתמשים נשמרים)
      // סדר המחיקה לפי תלויות המפתחות הזרים
      for (const table of [
        "deviations", "wires", "cables", "extracted_rows", "set_files",
        "cabinets", "wiring_sets", "activity_log", "notifications", "projects",
      ]) {
        db.prepare(`DELETE FROM ${table}`).run();
      }
    }

    const projectId = db.prepare(
      `INSERT INTO projects (name, station_name, work_number, manager_name, start_date)
       VALUES (?, ?, ?, ?, ?)`
    ).run(
      payload.project.name,
      payload.project.station_name ?? payload.project.name,
      payload.project.work_number ?? "",
      payload.project.manager_name ?? auth.user.name,
      payload.project.start_date ?? new Date().toISOString().slice(0, 10)
    ).lastInsertRowid as number;

    const setId = db.prepare(
      `INSERT INTO wiring_sets (project_id, name, version, received_date, mapping_status, approved_by, approved_at)
       VALUES (?, ?, ?, date('now'), 'approved', ?, datetime('now'))`
    ).run(projectId, payload.set?.name ?? "סט מיובא", payload.set?.version ?? "1", auth.user.id).lastInsertRowid as number;

    for (const fileName of payload.set?.files ?? []) {
      db.prepare("INSERT INTO set_files (set_id, file_name, file_size) VALUES (?, ?, 0)").run(setId, String(fileName));
    }

    for (const cab of payload.cabinets) {
      const cabinetId = db.prepare(
        `INSERT INTO cabinets (project_id, set_id, cabinet_no, name, location, notes)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(projectId, setId, cab.cabinet_no, cab.name ?? `ארון ${cab.cabinet_no}`, cab.location ?? "", cab.notes ?? "").lastInsertRowid as number;
      cabinets++;

      for (const cable of cab.cables ?? []) {
        const cableId = db.prepare(
          `INSERT INTO cables (cabinet_id, cable_no, source_cabinet, dest_cabinet, cable_type, description, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(cabinetId, cable.cable_no, cab.cabinet_no, cable.dest_cabinet ?? "", cable.cable_type ?? "", cable.description ?? "", cable.notes ?? "").lastInsertRowid as number;
        cables++;

        for (const wire of cable.wires ?? []) {
          db.prepare(
            `INSERT INTO wires (cable_id, wire_no, source_cabinet, source_terminal, dest_cabinet, dest_terminal, description)
             VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).run(cableId, wire.wire_no, cab.cabinet_no, wire.source_terminal, cable.dest_cabinet ?? "", wire.dest_terminal, wire.description ?? "");
          wires++;
        }
      }
    }

    return { projectId, setId };
  });

  const { setId } = run();
  recalcAll(db);
  logActivity(db, auth.user.id, "ייבוא סט חיווט מקובץ", "set", setId, payload.set?.name ?? payload.project.name, "", `${cabinets} ארונות, ${cables} כבלים, ${wires} גידים`);
  notify(db, "set_approved", `יובא סט "${payload.set?.name ?? ""}" — ${cabinets} ארונות, ${cables} כבלים, ${wires} גידים`, "set", setId);

  return jsonOk({ cabinets, cables, wires });
}
