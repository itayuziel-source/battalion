"use client";

import { useCallback, useEffect, useMemo, useState, use } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { Card, ConfirmDialog, PrimaryButton, SecondaryButton, Spinner, showToast } from "@/components/ui";
import { api } from "@/lib/client";
import type { ExtractedRow, WiringSet } from "@/lib/types";

const FIELDS: { key: keyof ExtractedRow; label: string; width: string }[] = [
  { key: "cabinet_no", label: "ארון", width: "w-24" },
  { key: "cable_no", label: "כבל", width: "w-24" },
  { key: "wire_no", label: "גיד", width: "w-16" },
  { key: "source_cabinet", label: "ארון מקור", width: "w-24" },
  { key: "source_terminal", label: "מהדק מקור", width: "w-24" },
  { key: "dest_cabinet", label: "ארון יעד", width: "w-24" },
  { key: "dest_terminal", label: "מהדק יעד", width: "w-24" },
  { key: "cable_type", label: "סוג כבל", width: "w-28" },
  { key: "description", label: "תיאור", width: "w-40" },
];

export default function ReviewPage({ params }: { params: Promise<{ setId: string }> }) {
  const { setId } = use(params);
  const router = useRouter();
  const [set, setSet] = useState<WiringSet | null>(null);
  const [rows, setRows] = useState<ExtractedRow[] | null>(null);
  const [filter, setFilter] = useState("");
  const [onlyInvalid, setOnlyInvalid] = useState(false);
  const [commitOpen, setCommitOpen] = useState(false);
  const [committing, setCommitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<{ set: WiringSet; rows: ExtractedRow[] }>(`/api/sets/${setId}/rows`);
      setSet(data.set);
      setRows(data.rows);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה", "error");
    }
  }, [setId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows.filter((r) => {
      if (onlyInvalid && r.valid) return false;
      if (!filter.trim()) return true;
      const q = filter.trim();
      return [r.cabinet_no, r.cable_no, r.wire_no, r.source_terminal, r.dest_terminal, r.description, r.cable_type]
        .some((v) => String(v).includes(q));
    });
  }, [rows, filter, onlyInvalid]);

  const stats = useMemo(() => {
    if (!rows) return { total: 0, invalid: 0, approved: 0 };
    return {
      total: rows.length,
      invalid: rows.filter((r) => !r.valid).length,
      approved: rows.filter((r) => r.approved).length,
    };
  }, [rows]);

  async function updateField(row: ExtractedRow, key: keyof ExtractedRow, value: string) {
    const updated = { ...row, [key]: value };
    setRows((prev) => prev?.map((r) => (r.id === row.id ? updated : r)) ?? null);
    try {
      const saved = await api<ExtractedRow>(`/api/sets/${setId}/rows`, {
        method: "PUT",
        body: JSON.stringify({ action: "update_row", row: updated }),
      });
      setRows((prev) => prev?.map((r) => (r.id === row.id ? saved : r)) ?? null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה בשמירה", "error");
    }
  }

  async function approveRow(row: ExtractedRow) {
    try {
      await api(`/api/sets/${setId}/rows`, {
        method: "PUT",
        body: JSON.stringify({ action: "approve_row", rowId: row.id }),
      });
      setRows((prev) => prev?.map((r) => (r.id === row.id ? { ...r, approved: 1 } : r)) ?? null);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה", "error");
    }
  }

  async function approveAllValid() {
    try {
      const res = await api<{ approved: number }>(`/api/sets/${setId}/rows`, {
        method: "PUT",
        body: JSON.stringify({ action: "approve_all_valid" }),
      });
      showToast(`אושרו ${res.approved} שורות תקינות`);
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה", "error");
    }
  }

  async function deleteRow(row: ExtractedRow) {
    try {
      await api(`/api/sets/${setId}/rows`, {
        method: "PUT",
        body: JSON.stringify({ action: "delete_row", rowId: row.id }),
      });
      setRows((prev) => prev?.filter((r) => r.id !== row.id) ?? null);
      showToast("השורה נמחקה");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה", "error");
    }
  }

  async function commit() {
    setCommitting(true);
    try {
      const res = await api<{ wires: number; cabinetsCreated: number; cablesCreated: number }>(
        `/api/sets/${setId}/commit`,
        { method: "POST" }
      );
      showToast(`הוזנו ${res.wires} גידים, ${res.cabinetsCreated} ארונות חדשים ו־${res.cablesCreated} כבלים`);
      router.push("/cabinets");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה", "error");
      setCommitting(false);
    }
  }

  return (
    <AppShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">🔎 בדיקת נתונים שחולצו</h1>
          <p className="text-sm text-slate-500">
            {set ? `${set.name} · ${set.project_name ?? ""}` : "…"} — נתוני הדגמה שיוצרו על ידי מנוע מדומה. בדקו ותקנו לפני ההזנה.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton onClick={approveAllValid}>✔️ אישור כל התקינות</SecondaryButton>
          <PrimaryButton onClick={() => setCommitOpen(true)} disabled={stats.approved === 0 || committing}>
            {committing ? "מזין…" : `📥 הכנסת הנתונים לפרויקט (${stats.approved})`}
          </PrimaryButton>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="חיפוש וסינון…"
          className="w-64 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlyInvalid} onChange={(e) => setOnlyInvalid(e.target.checked)} className="h-4 w-4" />
          הצג רק שורות לא תקינות
        </label>
        <span className="text-sm text-slate-500">
          סה״כ {stats.total} · <span className="text-red-600">{stats.invalid} לא תקינות</span> ·{" "}
          <span className="text-green-600">{stats.approved} מאושרות</span>
        </span>
      </div>

      {!rows ? (
        <Spinner label="טוען שורות…" />
      ) : (
        <Card className="p-0">
          <div className="table-scroll">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-right text-xs text-slate-500">
                  <th className="px-2 py-2.5">מצב</th>
                  {FIELDS.map((f) => (
                    <th key={f.key} className="px-2 py-2.5">{f.label}</th>
                  ))}
                  <th className="px-2 py-2.5">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className={`border-b border-slate-100 ${!r.valid ? "bg-red-50" : r.approved ? "bg-green-50/50" : ""}`}>
                    <td className="px-2 py-1.5 text-center">
                      {!r.valid ? (
                        <span title={r.error_msg} className="cursor-help text-red-600">✖</span>
                      ) : r.approved ? (
                        <span className="text-green-600">✔</span>
                      ) : (
                        <span className="text-slate-300">○</span>
                      )}
                    </td>
                    {FIELDS.map((f) => (
                      <td key={f.key} className="px-1 py-1">
                        <input
                          className={`${f.width} rounded border border-transparent bg-transparent px-1.5 py-1 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none ${
                            !r.valid && !String(r[f.key] ?? "") ? "border-red-300 bg-red-100/50" : ""
                          }`}
                          defaultValue={String(r[f.key] ?? "")}
                          onBlur={(e) => {
                            if (e.target.value !== String(r[f.key] ?? "")) updateField(r, f.key, e.target.value);
                          }}
                        />
                      </td>
                    ))}
                    <td className="whitespace-nowrap px-2 py-1.5">
                      {!r.approved && r.valid ? (
                        <button onClick={() => approveRow(r)} className="ml-2 text-xs font-medium text-green-700 hover:underline">
                          אישור
                        </button>
                      ) : null}
                      <button onClick={() => deleteRow(r)} className="text-xs font-medium text-red-600 hover:underline">
                        מחיקה
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={FIELDS.length + 2} className="py-8 text-center text-slate-400">
                      אין שורות להצגה
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {rows && stats.invalid > 0 && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          ⚠️ {stats.invalid} שורות סומנו כלא תקינות (רקע אדום). תקנו את השדות החסרים כדי שיהיה אפשר לאשר אותן.
        </p>
      )}

      <ConfirmDialog
        open={commitOpen}
        onClose={() => setCommitOpen(false)}
        onConfirm={commit}
        title="הכנסת הנתונים לפרויקט"
        message={`יוזנו ${stats.approved} שורות מאושרות ויהפכו לארונות, כבלים וגידים ברשימות העבודה. להמשיך?`}
        confirmText="הזנה לפרויקט"
      />
    </AppShell>
  );
}
