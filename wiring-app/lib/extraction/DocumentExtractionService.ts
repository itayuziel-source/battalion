/**
 * ממשק שירות חילוץ נתונים מקובצי תוכניות (PDF).
 *
 * באב־הטיפוס קיים מימוש הדגמה בלבד (DemoDocumentExtractionService) שמחזיר
 * נתוני דוגמה. בעתיד ניתן להחליף את המימוש בחיבור מאושר לשירות OCR / AI
 * ארגוני — מבלי לשנות את שאר הקוד, שתלוי רק בממשק הזה.
 */

export interface ExtractionInputFile {
  fileName: string;
  fileSize: number;
}

export interface ExtractedWireRow {
  cabinetNo: string;
  cableNo: string;
  wireNo: string;
  cableType: string;
  sourceCabinet: string;
  sourceTerminal: string;
  destCabinet: string;
  destTerminal: string;
  description: string;
  /** האם השורה עברה ולידציה בסיסית */
  valid: boolean;
  /** הודעת שגיאה כאשר השורה אינה תקינה */
  errorMsg: string;
}

export interface ExtractionResult {
  rows: ExtractedWireRow[];
  /** true כאשר מדובר בנתוני הדגמה ולא בזיהוי אמיתי */
  isDemo: boolean;
  engineName: string;
}

export interface DocumentExtractionService {
  /** מחלץ שורות חיווט מרשימת קבצים שהועלו לסט. */
  extract(files: ExtractionInputFile[]): Promise<ExtractionResult>;
}
