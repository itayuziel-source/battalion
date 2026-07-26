"use client";

import { useCallback, useEffect, useMemo, useState, use } from "react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Card, ConfirmDialog, Modal, PrimaryButton, ProgressBar, SecondaryButton, Spinner, StatusBadge, showToast } from "@/components/ui";
import { api, formatDateTime, getStoredUser } from "@/lib/client";
import { canApproveWiring } from "@/lib/permissions";
import type { Cable, Wire } from "@/lib/types";

interface CableData {
  cable: Cable & { cabinet_id: number; cabinet_no: string };
  wires: Wire[];
}

export default function CablePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [data, setData] = useState<CableData | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [noteWire, setNoteWire] = useState<Wire | null>(null);
  const [deviationOpen, setDeviationOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const user = getStoredUser();

  const load = useCallback(() => {
    api<CableData>(`/api/cables/${id}`).then(setData).catch((e) => showToast(e.message, "error"));
  }, [id]);

  useEffect(load, [load]);

  const progress = useMemo(() => {
    if (!data) return { done: 0, total: 0, percent: 0 };
    const done = data.wires.filter((w) => w.completed).length;
    return { done, total: data.wires.length, percent: data.wires.length ? Math.round((done / data.wires.length) * 100) : 0 };
  }, [data]);

  async function updateWires(wireIds: number[], action: "complete" | "uncomplete") {
    if (!wireIds.length) return;
    setSaving(true);
    try {
      await api("/api/wires", { method: "PATCH", body: JSON.stringify({ wireIds, action }) });
      showToast(action === "complete" ? `${wireIds.length} גידים סומנו כהושלמו ✔` : "הסימון בוטל");
      setSelected(new Set());
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה", "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleWire(w: Wire) {
    await updateWires([w.id], w.completed ? "uncomplete" : "complete");
  }

  async function verify() {
    try {
      await api(`/api/cables/${id}`, { method: "PATCH", body: JSON.stringify({ action: "verify" }) });
      showToast("הכבל אושר — סטטוס עודכן להושלם ✔");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה", "error");
    }
  }

  if (!data) {
    return (
      <AppShell>
        <Spinner label="טוען כבל…" />
      </AppShell>
    );
  }

  const { cable, wires } = data;
  const allSelected = selected.size === wires.length && wires.length > 0;
  const openWires = wires.filter((w) => !w.completed);

  return (
    <AppShell>
      <div className="mb-3 text-sm text-slate-500">
        <Link href="/cabinets" className="hover:underline">ארונות</Link>
        {" / "}
        <Link href={`/cabinets/${cable.cabinet_id}`} className="hover:underline">ארון {cable.cabinet_no}</Link>
        {" / "}
        <span className="font-bold text-slate-700">כבל {cable.cable_no}</span>
      </div>

      <Card className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold">{cable.cable_no}</h1>
              <StatusBadge status={cable.status} />
            </div>
            <p className="mt-1 text-slate-600">
              <span className="ltr">{cable.source_cabinet} → {cable.dest_cabinet}</span> · <span className="ltr">{cable.cable_type}</span> · {cable.description}
            </p>
            {cable.checked ? (
              <p className="mt-1 text-sm text-green-700">
                ✔️ נבדק ואושר ע״י {cable.checked_by_name} · {formatDateTime(cable.checked_at)}
              </p>
            ) : null}
            {cable.notes && <p className="mt-1 text-sm text-amber-700">📝 {cable.notes}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => setDeviationOpen(true)}>⚠️ דיווח חריגה</SecondaryButton>
            {user && canApproveWiring(user.role) && !cable.checked && progress.percent === 100 && (
              <PrimaryButton onClick={() => setVerifyOpen(true)}>🔍 אישור בדיקה סופית</PrimaryButton>
            )}
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-sm">
            <span>
              גידים שהושלמו: <b>{progress.done}/{progress.total}</b>
            </span>
            <span className="font-bold text-blue-700">{progress.percent}%</span>
          </div>
          <ProgressBar percent={progress.percent} />
        </div>
        {!user || !canApproveWiring(user.role) ? (
          progress.percent === 100 && !cable.checked ? (
            <p className="mt-3 rounded-lg bg-blue-50 p-2.5 text-sm text-blue-700">
              ℹ️ כל הגידים הושלמו — הכבל ממתין לאישור של בודק או מנהל.
            </p>
          ) : null
        ) : null}
      </Card>

      {/* פעולות מרובות */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={allSelected}
            onChange={() => setSelected(allSelected ? new Set() : new Set(wires.map((w) => w.id)))}
          />
          בחירת הכל
        </label>
        <PrimaryButton
          disabled={selected.size === 0 || saving}
          onClick={() => updateWires([...selected].filter((wid) => !wires.find((w) => w.id === wid)?.completed), "complete")}
        >
          ✔ סימון הנבחרים כהושלמו ({selected.size})
        </PrimaryButton>
        <SecondaryButton
          disabled={openWires.length === 0 || saving}
          onClick={() => updateWires(openWires.map((w) => w.id), "complete")}
        >
          סימון כל הגידים כהושלמו
        </SecondaryButton>
        <span className="mr-auto text-xs text-slate-400">השינויים נשמרים אוטומטית עם שם העובד והתאריך</span>
      </div>

      {/* רשימת גידים */}
      <div className="space-y-2">
        {wires.map((w) => (
          <Card key={w.id} className={`p-3 ${w.completed ? "border-green-200 bg-green-50/50" : ""}`}>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                className="h-7 w-7 shrink-0 accent-green-600"
                checked={!!w.completed}
                disabled={saving}
                onChange={() => toggleWire(w)}
                aria-label={`גיד ${w.wire_no}`}
              />
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0"
                checked={selected.has(w.id)}
                onChange={() => {
                  const next = new Set(selected);
                  if (next.has(w.id)) next.delete(w.id);
                  else next.add(w.id);
                  setSelected(next);
                }}
                aria-label={`בחירת גיד ${w.wire_no}`}
                title="בחירה לפעולה מרובה"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-extrabold">גיד {w.wire_no}</span>
                  <span className="ltr rounded bg-slate-100 px-2 py-0.5 text-sm font-medium">
                    {w.source_cabinet} {w.source_terminal} → {w.dest_cabinet} {w.dest_terminal}
                  </span>
                  {w.has_deviation ? <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">חריגה מהתוכנית</span> : null}
                </div>
                <div className="mt-0.5 text-sm text-slate-500">{w.description}</div>
                {w.completed ? (
                  <div className="mt-0.5 text-xs text-green-700">
                    ✔ חווט ע״י {w.completed_by_name ?? "—"} · {formatDateTime(w.completed_at)}
                  </div>
                ) : null}
                {w.deviation_note && <div className="mt-0.5 text-xs text-red-600">📝 {w.deviation_note}</div>}
              </div>
              <button
                onClick={() => setNoteWire(w)}
                className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs hover:bg-slate-50"
              >
                📝 הערה
              </button>
            </div>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onConfirm={verify}
        title="אישור בדיקה סופית"
        message={`אני מאשר/ת שכל ${progress.total} הגידים בכבל ${cable.cable_no} חווטו ונבדקו כנדרש.`}
        confirmText="אישור סופי"
      />

      <WireNoteModal wire={noteWire} onClose={() => setNoteWire(null)} onSaved={load} />
      <CableDeviationModal open={deviationOpen} onClose={() => setDeviationOpen(false)} cable={cable} wires={wires} onSaved={load} />
    </AppShell>
  );
}

function WireNoteModal({ wire, onClose, onSaved }: { wire: Wire | null; onClose: () => void; onSaved: () => void }) {
  const [note, setNote] = useState("");
  useEffect(() => setNote(wire?.deviation_note ?? ""), [wire]);

  async function save() {
    if (!wire) return;
    try {
      await api("/api/wires", { method: "PATCH", body: JSON.stringify({ wireIds: [wire.id], action: "note", note }) });
      showToast("ההערה נשמרה");
      onSaved();
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה", "error");
    }
  }

  return (
    <Modal open={!!wire} onClose={onClose} title={`הערת שינוי — גיד ${wire?.wire_no ?? ""}`}>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:border-blue-500 focus:outline-none"
        placeholder="לדוגמה: חובר למהדק אחר מהמתוכנן…"
      />
      <p className="mt-1 text-xs text-slate-400">הערה שאינה ריקה תסמן את הגיד כחריגה מהתוכנית.</p>
      <div className="mt-3 flex justify-end gap-2">
        <SecondaryButton onClick={onClose}>ביטול</SecondaryButton>
        <PrimaryButton onClick={save}>שמירה</PrimaryButton>
      </div>
    </Modal>
  );
}

function CableDeviationModal({
  open,
  onClose,
  cable,
  wires,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  cable: Cable & { cabinet_id: number };
  wires: Wire[];
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ wire_id: 0, description: "", reason: "" });

  async function submit() {
    try {
      await api("/api/deviations", {
        method: "POST",
        body: JSON.stringify({
          cabinet_id: cable.cabinet_id,
          cable_id: cable.id,
          wire_id: form.wire_id || null,
          description: form.description,
          reason: form.reason,
        }),
      });
      showToast("החריגה דווחה ✔");
      onSaved();
      onClose();
      setForm({ wire_id: 0, description: "", reason: "" });
    } catch (e) {
      showToast(e instanceof Error ? e.message : "שגיאה", "error");
    }
  }

  const field = "w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none";

  return (
    <Modal open={open} onClose={onClose} title={`דיווח חריגה — כבל ${cable.cable_no}`}>
      <div className="space-y-3">
        <label className="block text-sm text-slate-500">
          גיד (אופציונלי)
          <select className={field} value={form.wire_id} onChange={(e) => setForm({ ...form, wire_id: Number(e.target.value) })}>
            <option value={0}>— כללי לכבל —</option>
            {wires.map((w) => (
              <option key={w.id} value={w.id}>גיד {w.wire_no} ({w.source_terminal} ← {w.dest_terminal})</option>
            ))}
          </select>
        </label>
        <textarea className={field} rows={3} placeholder="תיאור השינוי ביחס לתוכנית *" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <textarea className={field} rows={2} placeholder="סיבת השינוי" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <div className="flex justify-end gap-2 pt-1">
          <SecondaryButton onClick={onClose}>ביטול</SecondaryButton>
          <PrimaryButton onClick={submit} disabled={!form.description.trim()}>שליחת דיווח</PrimaryButton>
        </div>
      </div>
    </Modal>
  );
}
