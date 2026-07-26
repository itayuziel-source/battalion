import type {
  DocumentExtractionService,
  ExtractionInputFile,
  ExtractionResult,
  ExtractedWireRow,
} from "./DocumentExtractionService";

/**
 * מימוש הדגמה: מייצר נתוני חיווט מדומים ודטרמיניסטיים לפי שם הקובץ.
 * אינו קורא את תוכן ה־PDF בפועל — מיועד להדגמת זרימת העבודה בלבד.
 */

const CABLE_TYPES = ["NYY 4x1.5", "NYY 7x1.5", "NYY 12x1.5", "LIYCY 4x0.75", "N2XY 5x2.5"];
const DESCRIPTIONS = [
  "מעגל פיקוד",
  "הזנת מתח עזר",
  "מעגל מדידה",
  "אות התראה",
  "מעגל הגנה",
  "תקשורת פנימית",
  "מעגל סימון",
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

export class DemoDocumentExtractionService implements DocumentExtractionService {
  async extract(files: ExtractionInputFile[]): Promise<ExtractionResult> {
    const rows: ExtractedWireRow[] = [];

    files.forEach((file, fileIdx) => {
      const seed = hashString(file.fileName);
      // לכל קובץ: 2 ארונות, 2-3 כבלים לארון, 3-8 גידים לכבל
      const cabinetsInFile = 2;
      for (let ci = 0; ci < cabinetsInFile; ci++) {
        const cabinetNum = 10 + fileIdx * 2 + ci + ((seed >> 3) % 3);
        const cabinetNo = `+A${cabinetNum}`;
        const cablesCount = 2 + ((seed + ci) % 2);
        for (let cbi = 0; cbi < cablesCount; cbi++) {
          const cableNo = `C-${cabinetNum}${cbi + 1}`;
          const destCabinet = `+A${cabinetNum + 1 + ((seed + cbi) % 4)}`;
          const cableType = CABLE_TYPES[(seed + ci + cbi) % CABLE_TYPES.length];
          const wires = 3 + ((seed + ci * 7 + cbi * 3) % 6);
          for (let wi = 1; wi <= wires; wi++) {
            // כ־8% מהשורות מיוצרות כלא־תקינות כדי להדגים את מסך הבדיקה
            const broken = (seed + ci * 13 + cbi * 5 + wi) % 13 === 0;
            const row: ExtractedWireRow = {
              cabinetNo,
              cableNo,
              wireNo: String(wi),
              cableType,
              sourceCabinet: cabinetNo,
              sourceTerminal: `X${cbi + 1}:${wi}`,
              destCabinet,
              destTerminal: broken ? "" : `X${((seed + wi) % 4) + 1}:${wi + ((seed + cbi) % 3)}`,
              description: DESCRIPTIONS[(seed + wi + cbi) % DESCRIPTIONS.length],
              valid: !broken,
              errorMsg: broken ? "מהדק יעד חסר בזיהוי — נדרשת השלמה ידנית" : "",
            };
            rows.push(row);
          }
        }
      }
    });

    // השהיה קצרה להדמיית עיבוד
    await new Promise((r) => setTimeout(r, 400));

    return {
      rows,
      isDemo: true,
      engineName: "מנוע הדגמה (נתונים מדומים — ללא קריאת PDF אמיתית)",
    };
  }
}

export const demoExtractionService = new DemoDocumentExtractionService();
