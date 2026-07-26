"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { Card, PrimaryButton, SecondaryButton, Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import type { Cabinet, Cable, Project } from "@/lib/types";

interface LabelRow {
  id: number;
  wire_no: string;
  source_cabinet: string;
  source_terminal: string;
  dest_cabinet: string;
  dest_terminal: string;
  description: string;
  cable_no: string;
  cable_type: string;
  cabinet_no: string;
  cabinet_id: number;
  cable_id: number;
}

type LabelSize = "small" | "medium" | "large";

const SIZE_STYLES: Record<LabelSize, { card: string; cols: string; text: string }> = {
  small: { card: "p-1.5", cols: "grid-cols-4", text: "text-[10px]" },
  medium: { card: "p-2.5", cols: "grid-cols-3", text: "text-xs" },
  large: { card: "p-4", cols: "grid-cols-2", text: "text-sm" },
};

export default function PrintPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [cables, setCables] = useState<Cable[]>([]);
  const [cabinetId, setCabinetId] = useState<number>(0);
  const [cableId, setCableId] = useState<number>(0);
  const [labels, setLabels] = useState<LabelRow[] | null>(null);
  const [selectedWires, setSelectedWires] = useState<Set<number>>(new Set());
  const [copies, setCopies] = useState(1);
  const [size, setSize] = useState<LabelSize>("medium");

  useEffect(() => {
    api<Project[]>("/api/projects").then(setProjects).catch(() => {});
    api<Cabinet[]>("/api/cabinets").then(setCabinets).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cabinetId) {
      setCables([]);
      setCableId(0);
      return;
    }
    api<{ cables: Cable[] }>(`/api/cabinets/${cabinetId}`).then((d) => setCables(d.cables)).catch(() => {});
    setCableId(0);
  }, [cabinetId]);

  const loadLabels = useCallback(() => {
    const params = new URLSearchParams();
    if (cabinetId) params.set("cabinetId", String(cabinetId));
    if (cableId) params.set("cableId", String(cableId));
    api<LabelRow[]>(`/api/print?${params}`).then((rows) => {
      setLabels(rows);
      setSelectedWires(new Set(rows.map((r) => r.id)));
    }).catch(() => {});
  }, [cabinetId, cableId]);

  useEffect(loadLabels, [loadLabels]);

  const visibleLabels = useMemo(() => {
    if (!labels) return [];
    const base = labels.filter((l) => selectedWires.has(l.id));
    const result: LabelRow[] = [];
    for (let i = 0; i < copies; i++) result.push(...base);
    return result;
  }, [labels, selectedWires, copies]);

  function exportCsv() {
    const params = new URLSearchParams();
    if (cabinetId) params.set("cabinetId", String(cabinetId));
    if (cableId) params.set("cableId", String(cableId));
    window.open(`/api/export/csv?${params}`, "_blank");
  }

  const field = "rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
  const style = SIZE_STYLES[size];

  return (
    <AppShell>
      <div className="no-print">
        <h1 className="mb-4 text-xl font-extrabold">🏷️ הדפסת פתקי חיווט</h1>

        <Card className="mb-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block text-sm text-slate-500">
              פרויקט
              <select className={`${field} w-full`} defaultValue={projects[0]?.id}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-500">
              ארון
              <select className={`${field} w-full`} value={cabinetId} onChange={(e) => setCabinetId(Number(e.target.value))}>
                <option value={0}>— כל הארונות —</option>
                {cabinets.map((c) => (
                  <option key={c.id} value={c.id}>{c.cabinet_no} · {c.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-500">
              כבל
              <select className={`${field} w-full`} value={cableId} onChange={(e) => setCableId(Number(e.target.value))} disabled={!cabinetId}>
                <option value={0}>— כל הכבלים —</option>
                {cables.map((c) => (
                  <option key={c.id} value={c.id}>{c.cable_no}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-slate-500">
              כמות עותקים
              <input
                type="number"
                min={1}
                max={10}
                className={`${field} w-full`}
                value={copies}
                onChange={(e) => setCopies(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
              />
            </label>
            <label className="block text-sm text-slate-500">
              גודל פתק
              <select className={`${field} w-full`} value={size} onChange={(e) => setSize(e.target.value as LabelSize)}>
                <option value="small">קטן (4 בשורה)</option>
                <option value="medium">בינוני (3 בשורה)</option>
                <option value="large">גדול (2 בשורה)</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <PrimaryButton onClick={() => window.print()} disabled={visibleLabels.length === 0}>
              🖨️ הדפסה / שמירה כ־PDF
            </PrimaryButton>
            <SecondaryButton onClick={exportCsv}>📄 ייצוא CSV</SecondaryButton>
            <span className="text-sm text-slate-500">
              {selectedWires.size} גידים נבחרו · {visibleLabels.length} פתקים יודפסו
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            טיפ: בחלון ההדפסה של הדפדפן בחרו &quot;שמירה כ־PDF&quot; כדי לקבל קובץ PDF להדפסה מאוחרת.
          </p>
        </Card>

        {/* בחירת גידים */}
        {labels && labels.length > 0 && (
          <Card className="mb-4 max-h-56 overflow-y-auto">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-bold">בחירת גידים ({labels.length})</h3>
              <button
                className="text-xs text-blue-600 hover:underline"
                onClick={() =>
                  setSelectedWires(selectedWires.size === labels.length ? new Set() : new Set(labels.map((l) => l.id)))
                }
              >
                {selectedWires.size === labels.length ? "ניקוי הכל" : "בחירת הכל"}
              </button>
            </div>
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {labels.map((l) => (
                <label key={l.id} className="flex items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={selectedWires.has(l.id)}
                    onChange={() => {
                      const next = new Set(selectedWires);
                      if (next.has(l.id)) next.delete(l.id);
                      else next.add(l.id);
                      setSelectedWires(next);
                    }}
                  />
                  {l.cable_no} / גיד {l.wire_no} ({l.source_terminal} ← {l.dest_terminal})
                </label>
              ))}
            </div>
          </Card>
        )}

        <h2 className="mb-2 font-bold">תצוגה מקדימה</h2>
      </div>

      {!labels ? (
        <Spinner label="טוען פתקים…" />
      ) : (
        <div className={`print-area grid gap-2 ${style.cols}`}>
          {visibleLabels.map((l, i) => (
            <div key={`${l.id}-${i}`} className={`label-card rounded border-2 border-slate-800 bg-white ${style.card}`}>
              <div className={`flex items-center justify-between border-b border-slate-300 pb-1 font-extrabold ${style.text}`}>
                <span>כבל {l.cable_no}</span>
                <span>גיד {l.wire_no}</span>
              </div>
              <div className={`mt-1 grid grid-cols-2 gap-x-2 ${style.text}`}>
                <div>
                  <div className="text-slate-500">מקור</div>
                  <div className="ltr font-bold">{l.source_cabinet}</div>
                  <div className="ltr font-mono font-bold">{l.source_terminal}</div>
                </div>
                <div>
                  <div className="text-slate-500">יעד</div>
                  <div className="ltr font-bold">{l.dest_cabinet}</div>
                  <div className="ltr font-mono font-bold">{l.dest_terminal}</div>
                </div>
              </div>
            </div>
          ))}
          {visibleLabels.length === 0 && (
            <p className="no-print col-span-full py-8 text-center text-slate-400">בחרו ארון, כבל או גידים להדפסה</p>
          )}
        </div>
      )}
    </AppShell>
  );
}
