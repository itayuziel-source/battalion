"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Card, PrimaryButton, SecondaryButton, showToast } from "@/components/ui";
import { api } from "@/lib/client";

interface Preview {
  fileName: string;
  projectName: string;
  setName: string;
  cabinets: number;
  cables: number;
  wires: number;
  payload: unknown;
}

export default function ImportPage() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [replace, setReplace] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (payload?.format !== "wiring-app-import-v1") {
        showToast("הקובץ אינו בפורמט wiring-app-import-v1", "error");
        return;
      }
      const cabinets = payload.cabinets?.length ?? 0;
      let cables = 0, wires = 0;
      for (const cab of payload.cabinets ?? []) {
        cables += cab.cables?.length ?? 0;
        for (const c of cab.cables ?? []) wires += c.wires?.length ?? 0;
      }
      setPreview({
        fileName: file.name,
        projectName: payload.project?.name ?? "—",
        setName: payload.set?.name ?? "—",
        cabinets, cables, wires, payload,
      });
    } catch {
      showToast("קובץ JSON לא תקין", "error");
    }
  }

  async function runImport() {
    if (!preview) return;
    setImporting(true);
    try {
      const res = await api<{ cabinets: number; cables: number; wires: number }>("/api/import", {
        method: "POST",
        body: JSON.stringify({ ...(preview.payload as object), replace }),
      });
      showToast(`יובאו ${res.cabinets} ארונות, ${res.cables} כבלים ו־${res.wires} גידים`);
      router.push("/cabinets");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה בייבוא", "error");
      setImporting(false);
    }
  }

  return (
    <AppShell>
      <h1 className="mb-2 text-xl font-extrabold">📥 ייבוא סט חיווט מקובץ</h1>
      <p className="mb-4 text-sm text-slate-500">
        טעינת נתוני חיווט שחולצו משרטוט (פורמט <span dir="ltr">wiring-app-import-v1</span>) לבסיס הנתונים המקומי.
        הקובץ אינו נשמר במערכת — רק הנתונים שבו נטענים, והכל נשאר מקומי במחשב זה.
      </p>

      <Card className="mb-4">
        <div
          className="cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-8 text-center text-slate-500 hover:border-blue-400 hover:bg-blue-50/40"
          onClick={() => fileInput.current?.click()}
        >
          📄 לחצו לבחירת קובץ JSON (למשל: r300-import.json)
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
      </Card>

      {preview && (
        <Card>
          <h2 className="mb-3 font-bold">תצוגה מקדימה — {preview.fileName}</h2>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-sm text-slate-500">פרויקט</div>
              <div className="font-bold">{preview.projectName}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-sm text-slate-500">סט</div>
              <div className="truncate font-bold" title={preview.setName}>{preview.setName}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-sm text-slate-500">ארונות</div>
              <div className="text-xl font-extrabold text-blue-700">{preview.cabinets}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-sm text-slate-500">כבלים</div>
              <div className="text-xl font-extrabold text-blue-700">{preview.cables}</div>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-sm text-slate-500">גידים</div>
              <div className="text-xl font-extrabold text-blue-700">{preview.wires}</div>
            </div>
          </div>

          <label className="mb-4 flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
            ניקוי נתוני הדוגמה הקיימים לפני הייבוא (מומלץ; המשתמשים נשמרים,
            <span className="text-slate-500"> ואפשר תמיד לשחזר עם npm run db:reset</span>)
          </label>

          <div className="flex gap-2">
            <PrimaryButton onClick={runImport} disabled={importing}>
              {importing ? "מייבא…" : "📥 ייבוא לבסיס הנתונים"}
            </PrimaryButton>
            <SecondaryButton onClick={() => setPreview(null)} disabled={importing}>ביטול</SecondaryButton>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
