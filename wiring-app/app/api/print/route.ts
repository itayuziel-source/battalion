import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { jsonOk } from "@/lib/api-helpers";

/**
 * נתונים לפתקי חיווט: גידים מסוננים לפי פרויקט / ארון / כבל / גידים ספציפיים.
 */
export async function GET(req: NextRequest) {
  const db = getDb();
  const sp = req.nextUrl.searchParams;
  const cabinetId = sp.get("cabinetId");
  const cableId = sp.get("cableId");
  const wireIds = sp.get("wireIds"); // מזהים מופרדים בפסיק

  let sql = `
    SELECT w.id, w.wire_no, w.source_cabinet, w.source_terminal, w.dest_cabinet, w.dest_terminal, w.description,
           c.cable_no, c.cable_type, cab.cabinet_no, cab.id AS cabinet_id, c.id AS cable_id
    FROM wires w
    JOIN cables c ON c.id = w.cable_id
    JOIN cabinets cab ON cab.id = c.cabinet_id
    WHERE 1=1`;
  const params: (string | number)[] = [];

  if (cabinetId) {
    sql += " AND cab.id = ?";
    params.push(Number(cabinetId));
  }
  if (cableId) {
    sql += " AND c.id = ?";
    params.push(Number(cableId));
  }
  if (wireIds) {
    const ids = wireIds.split(",").map(Number).filter(Number.isInteger);
    if (ids.length) {
      sql += ` AND w.id IN (${ids.map(() => "?").join(",")})`;
      params.push(...ids);
    }
  }
  sql += " ORDER BY cab.cabinet_no, c.cable_no, CAST(w.wire_no AS INTEGER)";

  const labels = db.prepare(sql).all(...params);
  return jsonOk(labels);
}
