import type Database from "better-sqlite3";
import { recalcAll } from "./recalc";

/**
 * נתוני Seed מדומים לחלוטין — לצורכי הדגמה בלבד.
 * אין כאן מידע אמיתי של אף חברה או תחנה.
 */

interface WireSpec {
  no: string;
  srcTerm: string;
  dstTerm: string;
  desc: string;
  completed?: boolean;
  completedBy?: number;
  daysAgo?: number;
  deviationNote?: string;
}

interface CableSpec {
  no: string;
  dst: string;
  type: string;
  desc: string;
  wires: WireSpec[];
  checked?: boolean;
  checkedBy?: number;
  completedBy?: number;
  notes?: string;
}

function w(no: number, srcTerm: string, dstTerm: string, desc: string, completed = false, completedBy?: number, daysAgo?: number): WireSpec {
  return { no: String(no), srcTerm, dstTerm, desc, completed, completedBy, daysAgo };
}

export function seedIfEmpty(db: Database.Database): void {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (count.n > 0) return;
  seed(db);
}

export function seed(db: Database.Database): void {
  const insertUser = db.prepare(
    "INSERT INTO users (name, employee_no, job_title, role) VALUES (?, ?, ?, ?)"
  );
  const yossi = insertUser.run("יוסי לוי", "1001", "חשמלאי חיווט", "worker").lastInsertRowid as number;
  const david = insertUser.run("דוד כהן", "1002", "חשמלאי חיווט", "worker").lastInsertRowid as number;
  const moshe = insertUser.run("משה פרץ", "1003", "טכנאי פיקוד", "worker").lastInsertRowid as number;
  const ronit = insertUser.run("רונית אברהם", "2001", "בודקת חיווט", "inspector").lastInsertRowid as number;
  const avi = insertUser.run("אבי מזרחי", "3001", "מנהל עבודה", "manager").lastInsertRowid as number;

  const projectId = db
    .prepare(
      `INSERT INTO projects (name, station_name, work_number, manager_name, start_date, status)
       VALUES (?, ?, ?, ?, ?, 'in_progress')`
    )
    .run("תחמ״ש לדוגמה", "תחנת משנה — אתר הדגמה", "W-2026-0142", "אבי מזרחי", "2026-06-01")
    .lastInsertRowid as number;

  const setId = db
    .prepare(
      `INSERT INTO wiring_sets (project_id, name, version, received_date, mapping_status, approved_by, approved_at)
       VALUES (?, ?, ?, ?, 'approved', ?, datetime('now', '-20 days'))`
    )
    .run(projectId, "סט חיווט 01", "A", "2026-06-15", avi)
    .lastInsertRowid as number;

  const insertFile = db.prepare(
    "INSERT INTO set_files (set_id, file_name, file_size, uploaded_at) VALUES (?, ?, ?, datetime('now', '-21 days'))"
  );
  insertFile.run(setId, "demo_wiring_plan_A1.pdf", 2411520);
  insertFile.run(setId, "demo_wiring_plan_A2_A3.pdf", 3145728);
  insertFile.run(setId, "demo_terminal_list.pdf", 1048576);

  const insertCabinet = db.prepare(
    `INSERT INTO cabinets (project_id, set_id, cabinet_no, name, location, assignee_id, started_at, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const cab1 = insertCabinet.run(projectId, setId, "+A1", "ארון פיקוד ראשי", "חדר פיקוד — קומה 0", yossi, "2026-06-20", "ארון צפוף — לשים לב לתיעול הגידים").lastInsertRowid as number;
  const cab2 = insertCabinet.run(projectId, setId, "+A2", "ארון הגנות קו 1", "אולם מסדרים — צד מזרחי", david, "2026-06-25", "").lastInsertRowid as number;
  const cab3 = insertCabinet.run(projectId, setId, "+A3", "ארון מדידה", "אולם מסדרים — צד מערבי", moshe, "2026-07-01", "הוחלף פס מהדקים X2 — ראו חריגה").lastInsertRowid as number;
  const cab4 = insertCabinet.run(projectId, setId, "+A4", "ארון תקשורת ובקרה", "חדר תקשורת — קומה 1", null, null, "").lastInsertRowid as number;

  const insertCable = db.prepare(
    `INSERT INTO cables (cabinet_id, cable_no, source_cabinet, dest_cabinet, cable_type, wire_count, description, notes, checked, checked_by, checked_at, completed_by, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertWire = db.prepare(
    `INSERT INTO wires (cable_id, wire_no, source_cabinet, source_terminal, dest_cabinet, dest_terminal, description, completed, completed_by, completed_at, has_deviation, deviation_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  function addCable(cabinetId: number, src: string, spec: CableSpec): number {
    const allDone = spec.wires.length > 0 && spec.wires.every((x) => x.completed);
    const cableId = insertCable.run(
      cabinetId,
      spec.no,
      src,
      spec.dst,
      spec.type,
      spec.wires.length,
      spec.desc,
      spec.notes ?? "",
      spec.checked ? 1 : 0,
      spec.checked ? spec.checkedBy ?? ronit : null,
      spec.checked ? "2026-07-18 10:30:00" : null,
      allDone ? spec.completedBy ?? null : null,
      allDone ? "2026-07-15 14:00:00" : null
    ).lastInsertRowid as number;

    for (const wire of spec.wires) {
      insertWire.run(
        cableId,
        wire.no,
        src,
        wire.srcTerm,
        spec.dst,
        wire.dstTerm,
        wire.desc,
        wire.completed ? 1 : 0,
        wire.completed ? wire.completedBy ?? spec.completedBy ?? yossi : null,
        wire.completed ? `2026-07-${String(10 + (wire.daysAgo ?? 0)).padStart(2, "0")} 11:00:00` : null,
        wire.deviationNote ? 1 : 0,
        wire.deviationNote ?? ""
      );
    }
    return cableId;
  }

  // ---- ארון +A1: רובו הושלם ונבדק ----
  addCable(cab1, "+A1", {
    no: "C-101", dst: "+A2", type: "NYY 7x1.5", desc: "מעגל פיקוד ראשי", checked: true, completedBy: yossi,
    wires: [
      w(1, "X1:1", "X1:1", "הזנת פיקוד +", true, yossi, 1),
      w(2, "X1:2", "X1:2", "הזנת פיקוד -", true, yossi, 1),
      w(3, "X1:3", "X1:3", "אות תקלה", true, yossi, 2),
      w(4, "X1:4", "X1:4", "אות מצב מפסק", true, yossi, 2),
      w(5, "X1:5", "X1:5", "רזרבה", true, yossi, 2),
    ],
  });
  addCable(cab1, "+A1", {
    no: "C-102", dst: "+A3", type: "LIYCY 4x0.75", desc: "אותות מדידה", checked: true, completedBy: yossi,
    wires: [
      w(1, "X2:1", "X1:1", "מדידת זרם L1", true, yossi, 3),
      w(2, "X2:2", "X1:2", "מדידת זרם L2", true, yossi, 3),
      w(3, "X2:3", "X1:3", "מדידת זרם L3", true, yossi, 3),
      w(4, "X2:4", "X1:4", "נקודת אפס", true, yossi, 3),
    ],
  });
  addCable(cab1, "+A1", {
    no: "C-103", dst: "+A4", type: "LIYCY 12x0.75", desc: "אותות בקרה למרחוק", checked: true, completedBy: david,
    wires: [
      w(1, "X3:1", "X5:1", "אות פתיחה", true, david, 4),
      w(2, "X3:2", "X5:2", "אות סגירה", true, david, 4),
      w(3, "X3:3", "X5:3", "משוב מצב", true, david, 4),
      w(4, "X3:4", "X5:4", "התראת לחץ נמוך", true, david, 5),
      w(5, "X3:5", "X5:5", "התראת טמפרטורה", true, david, 5),
      w(6, "X3:6", "X5:6", "רזרבה", true, david, 5),
    ],
  });
  addCable(cab1, "+A1", {
    no: "C-104", dst: "+A2", type: "NYY 4x1.5", desc: "הזנת מתח עזר 110VDC", completedBy: yossi,
    // הושלם אך טרם נבדק — ממתין לבדיקה
    wires: [
      w(1, "X4:1", "X2:1", "110VDC +", true, yossi, 6),
      w(2, "X4:2", "X2:2", "110VDC -", true, yossi, 6),
      w(3, "X4:3", "X2:3", "הארקה", true, yossi, 6),
    ],
  });
  addCable(cab1, "+A1", {
    no: "C-105", dst: "+A3", type: "NYY 4x1.5", desc: "מעגל תאורת ארון וחימום",
    wires: [
      w(1, "X5:1", "X3:1", "הזנת תאורה", true, moshe, 7),
      w(2, "X5:2", "X3:2", "הזנת חימום", true, moshe, 7),
      w(3, "X5:3", "X3:3", "אפס משותף", false),
    ],
  });

  // ---- ארון +A2: בביצוע ----
  addCable(cab2, "+A2", {
    no: "C-201", dst: "+A1", type: "NYY 7x1.5", desc: "מעגלי הגנה ראשיים", completedBy: david,
    wires: [
      w(1, "X1:1", "X6:1", "הפעלת הגנה 1", true, david, 8),
      w(2, "X1:2", "X6:2", "הפעלת הגנה 2", true, david, 8),
      w(3, "X1:3", "X6:3", "אות חיווי", true, david, 9),
      w(4, "X1:4", "X6:4", "רזרבה", true, david, 9),
      w(5, "X1:5", "X6:5", "רזרבה", true, david, 9),
      w(6, "X1:6", "X6:6", "הארקת סיכוך", true, david, 9),
    ],
  });
  addCable(cab2, "+A2", {
    no: "C-202", dst: "+A3", type: "LIYCY 7x0.75", desc: "אותות מדידה להגנות",
    wires: [
      w(1, "X2:1", "X2:1", "זרם הגנה L1", true, david, 10),
      w(2, "X2:2", "X2:2", "זרם הגנה L2", true, david, 10),
      w(3, "X2:3", "X2:3", "זרם הגנה L3", false),
      w(4, "X2:4", "X2:4", "מתח ייחוס", false),
      w(5, "X2:5", "X2:5", "רזרבה", false),
    ],
  });
  addCable(cab2, "+A2", {
    no: "C-203", dst: "+A4", type: "LIYCY 4x0.75", desc: "חיווי מרחוק",
    wires: [
      w(1, "X3:1", "X1:1", "אות תקין", true, moshe, 10),
      w(2, "X3:2", "X1:2", "אות תקלה", false),
      w(3, "X3:3", "X1:3", "רזרבה", false),
    ],
  });
  const cable204 = addCable(cab2, "+A2", {
    no: "C-204", dst: "+A1", type: "NYY 4x1.5", desc: "מעגל השהיה", notes: "בוצע שינוי מסלול — ראו חריגה",
    wires: [
      { no: "1", srcTerm: "X4:1", dstTerm: "X7:1", desc: "הזנה", completed: true, completedBy: david, daysAgo: 11, deviationNote: "חובר למהדק X7:4 במקום X7:1 — אין מקום בפס" },
      w(2, "X4:2", "X7:2", "חזרה", false),
      w(3, "X4:3", "X7:3", "הארקה", false),
    ],
  });
  addCable(cab2, "+A2", {
    no: "C-205", dst: "+A3", type: "NYY 4x1.5", desc: "הזנת שקעי שירות",
    wires: [
      w(1, "X5:1", "X4:1", "פאזה", false),
      w(2, "X5:2", "X4:2", "אפס", false),
      w(3, "X5:3", "X4:3", "הארקה", false),
    ],
  });

  // ---- ארון +A3: בביצוע, עם חריגה ----
  addCable(cab3, "+A3", {
    no: "C-301", dst: "+A1", type: "LIYCY 4x0.75", desc: "מדידת מתח ראשית", completedBy: moshe,
    wires: [
      w(1, "X1:1", "X8:1", "מתח L1", true, moshe, 12),
      w(2, "X1:2", "X8:2", "מתח L2", true, moshe, 12),
      w(3, "X1:3", "X8:3", "מתח L3", true, moshe, 12),
      w(4, "X1:4", "X8:4", "אפס", true, moshe, 12),
    ],
  });
  const cable302 = addCable(cab3, "+A3", {
    no: "C-302", dst: "+A2", type: "LIYCY 7x0.75", desc: "מונה אנרגיה",
    wires: [
      w(1, "X2:1", "X5:1", "זרם מונה L1", true, moshe, 13),
      w(2, "X2:2", "X5:2", "זרם מונה L2", true, moshe, 13),
      w(3, "X2:3", "X5:3", "זרם מונה L3", false),
      w(4, "X2:4", "X5:4", "מתח מונה", false),
      w(5, "X2:5", "X5:5", "רזרבה", false),
    ],
  });
  addCable(cab3, "+A3", {
    no: "C-303", dst: "+A4", type: "LIYCY 4x0.75", desc: "שידור נתוני מדידה",
    wires: [
      w(1, "X3:1", "X2:1", "RS485 A", false),
      w(2, "X3:2", "X2:2", "RS485 B", false),
      w(3, "X3:3", "X2:3", "סיכוך", false),
    ],
  });
  addCable(cab3, "+A3", {
    no: "C-304", dst: "+A1", type: "NYY 4x1.5", desc: "הזנת מתח עזר למדידה",
    wires: [
      w(1, "X4:1", "X9:1", "230VAC פאזה", false),
      w(2, "X4:2", "X9:2", "230VAC אפס", false),
      w(3, "X4:3", "X9:3", "הארקה", false),
    ],
  });
  addCable(cab3, "+A3", {
    no: "C-305", dst: "+A2", type: "NYY 4x1.5", desc: "מעגל סנכרון",
    wires: [
      w(1, "X5:1", "X6:1", "אות סנכרון +", false),
      w(2, "X5:2", "X6:2", "אות סנכרון -", false),
      w(3, "X5:3", "X6:3", "רזרבה", false),
      w(4, "X5:4", "X6:4", "רזרבה", false),
    ],
  });

  // ---- ארון +A4: טרם התחיל ----
  addCable(cab4, "+A4", {
    no: "C-401", dst: "+A1", type: "LIYCY 12x0.75", desc: "ריכוז התראות",
    wires: [
      w(1, "X1:1", "X10:1", "התראה כללית", false),
      w(2, "X1:2", "X10:2", "התראת מתח", false),
      w(3, "X1:3", "X10:3", "התראת תקשורת", false),
      w(4, "X1:4", "X10:4", "רזרבה", false),
      w(5, "X1:5", "X10:5", "רזרבה", false),
      w(6, "X1:6", "X10:6", "רזרבה", false),
      w(7, "X1:7", "X10:7", "הארקת סיכוך", false),
    ],
  });
  addCable(cab4, "+A4", {
    no: "C-402", dst: "+A2", type: "LIYCY 4x0.75", desc: "תקשורת להגנות",
    wires: [
      w(1, "X2:1", "X7:1", "TX+", false),
      w(2, "X2:2", "X7:2", "TX-", false),
      w(3, "X2:3", "X7:3", "סיכוך", false),
    ],
  });
  addCable(cab4, "+A4", {
    no: "C-403", dst: "+A3", type: "LIYCY 4x0.75", desc: "תקשורת למדידה",
    wires: [
      w(1, "X3:1", "X6:1", "RS485 A", false),
      w(2, "X3:2", "X6:2", "RS485 B", false),
      w(3, "X3:3", "X6:3", "סיכוך", false),
      w(4, "X3:4", "X6:4", "רזרבה", false),
    ],
  });
  addCable(cab4, "+A4", {
    no: "C-404", dst: "+A1", type: "NYY 4x1.5", desc: "הזנת ציוד תקשורת",
    wires: [
      w(1, "X4:1", "X11:1", "230VAC פאזה", false),
      w(2, "X4:2", "X11:2", "230VAC אפס", false),
      w(3, "X4:3", "X11:3", "הארקה", false),
    ],
  });
  addCable(cab4, "+A4", {
    no: "C-405", dst: "+A2", type: "NYY 4x1.5", desc: "מעגל גיבוי",
    wires: [
      w(1, "X5:1", "X8:1", "גיבוי +", false),
      w(2, "X5:2", "X8:2", "גיבוי -", false),
      w(3, "X5:3", "X8:3", "הארקה", false),
      w(4, "X5:4", "X8:4", "רזרבה", false),
      w(5, "X5:5", "X8:5", "רזרבה", false),
    ],
  });

  // ---- חריגות ----
  const insertDeviation = db.prepare(
    `INSERT INTO deviations (project_id, cabinet_id, cable_id, wire_id, description, reason, reported_by, reported_at, status, manager_response, approved_by, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const wire204 = db.prepare("SELECT id FROM wires WHERE cable_id = ? AND wire_no = '1'").get(cable204) as { id: number };
  insertDeviation.run(
    projectId, cab2, cable204, wire204.id,
    "גיד 1 של כבל C-204 חובר למהדק X7:4 במקום X7:1",
    "פס המהדקים X7 מלא — אין מקום פנוי במהדק המתוכנן",
    david, "2026-07-20 09:15:00", "open", "", null, null
  );
  insertDeviation.run(
    projectId, cab3, cable302, null,
    "הוחלף פס מהדקים X2 בארון +A3 לפס רחב יותר",
    "הפס המקורי לא התאים לחתך הגידים של המונה",
    moshe, "2026-07-18 13:40:00", "approved",
    "מאושר. לעדכן בתוכנית As-Made בסיום העבודה.",
    avi, "2026-07-19 08:00:00"
  );

  // ---- היסטוריית פעולות לדוגמה ----
  const insertLog = db.prepare(
    `INSERT INTO activity_log (user_id, action, entity_type, entity_id, entity_label, old_value, new_value, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  insertLog.run(avi, "יצירת פרויקט", "project", projectId, "תחמ״ש לדוגמה", "", "", "2026-06-01 08:00:00");
  insertLog.run(avi, "יצירת סט חיווט", "set", setId, "סט חיווט 01", "", "", "2026-06-15 09:00:00");
  insertLog.run(avi, "אישור נתוני מיפוי", "set", setId, "סט חיווט 01", "review", "approved", "2026-06-16 10:00:00");
  insertLog.run(yossi, "סימון גיד כהושלם", "cable", 1, "C-101 גיד 1", "פתוח", "הושלם", "2026-07-11 11:00:00");
  insertLog.run(yossi, "סימון כבל כהושלם", "cable", 1, "C-101", "in_progress", "pending_check", "2026-07-12 11:30:00");
  insertLog.run(ronit, "אישור בדיקת כבל", "cable", 1, "C-101", "pending_check", "done", "2026-07-18 10:30:00");
  insertLog.run(ronit, "אישור בדיקת כבל", "cable", 2, "C-102", "pending_check", "done", "2026-07-18 10:45:00");
  insertLog.run(ronit, "אישור בדיקת כבל", "cable", 3, "C-103", "pending_check", "done", "2026-07-18 11:00:00");
  insertLog.run(david, "דיווח חריגה", "deviation", 1, "C-204 גיד 1", "", "open", "2026-07-20 09:15:00");
  insertLog.run(moshe, "דיווח חריגה", "deviation", 2, "פס מהדקים X2 בארון +A3", "", "open", "2026-07-18 13:40:00");
  insertLog.run(avi, "אישור חריגה", "deviation", 2, "פס מהדקים X2 בארון +A3", "open", "approved", "2026-07-19 08:00:00");
  insertLog.run(david, "סימון גיד כהושלם", "cable", 6, "C-201 גיד 6", "פתוח", "הושלם", "2026-07-19 14:20:00");
  insertLog.run(moshe, "הוספת הערה לארון", "cabinet", cab3, "+A3", "", "הוחלף פס מהדקים X2", "2026-07-18 13:45:00");

  // ---- התראות לדוגמה ----
  const insertNotif = db.prepare(
    "INSERT INTO notifications (type, message, entity_type, entity_id, created_at, read) VALUES (?, ?, ?, ?, ?, ?)"
  );
  insertNotif.run("cable_pending", "כבל C-104 ממתין לבדיקה", "cable", 4, "2026-07-16 14:05:00", 0);
  insertNotif.run("deviation_new", "נפתחה חריגה חדשה בארון +A2 (כבל C-204)", "deviation", 1, "2026-07-20 09:15:00", 0);
  insertNotif.run("deviation_approved", "החריגה בארון +A3 אושרה על ידי המנהל", "deviation", 2, "2026-07-19 08:01:00", 1);
  insertNotif.run("set_approved", "סט חיווט 01 אושר והוזן לפרויקט", "set", setId, "2026-06-16 10:01:00", 1);
  insertNotif.run("stale_cabinet", "ארון +A4 לא עודכן מעל 7 ימים", "cabinet", cab4, "2026-07-24 07:00:00", 0);

  // חישוב סטטוסים והתקדמות לכל השרשרת
  recalcAll(db);
}
