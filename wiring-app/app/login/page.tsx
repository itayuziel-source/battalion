"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, storeUser } from "@/lib/client";
import { ROLE_LABELS, type User } from "@/lib/types";
import { Spinner } from "@/components/ui";

const ROLE_ICONS: Record<string, string> = {
  worker: "🔧",
  inspector: "🔍",
  manager: "📋",
};

export default function LoginPage() {
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    api<User[]>("/api/users")
      .then(setUsers)
      .catch(() => setError("שגיאה בטעינת רשימת המשתמשים"));
  }, []);

  function login(user: User) {
    storeUser(user);
    router.push("/");
  }

  const grouped = (role: string) => (users ?? []).filter((u) => u.role === role);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-slate-100 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-6 text-center">
          <div className="text-5xl">⚡</div>
          <h1 className="mt-2 text-2xl font-extrabold text-blue-800">ניהול חיווטים וארונות</h1>
          <p className="mt-1 text-slate-500">מערכת ניהול עבודות חיווט בארונות חשמל — תחמ״ש</p>
        </div>

        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-center text-sm font-medium text-amber-800">
          התחברות לצורכי הדגמה בלבד — בחרו משתמש מרשימת עובדי הדוגמה.
          <br />
          כל הנתונים במערכת מדומים.
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          {error && <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {!users && !error && <Spinner label="טוען משתמשים…" />}
          {users &&
            (["manager", "inspector", "worker"] as const).map((role) =>
              grouped(role).length ? (
                <div key={role} className="mb-4 last:mb-0">
                  <h2 className="mb-2 text-sm font-bold text-slate-500">
                    {ROLE_ICONS[role]} {ROLE_LABELS[role]}
                  </h2>
                  <div className="grid gap-2">
                    {grouped(role).map((u) => (
                      <button
                        key={u.id}
                        onClick={() => login(u)}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 text-right transition hover:border-blue-400 hover:bg-blue-50"
                      >
                        <span>
                          <span className="block font-bold">{u.name}</span>
                          <span className="block text-xs text-slate-500">
                            {u.job_title} · מס׳ עובד {u.employee_no}
                          </span>
                        </span>
                        <span className="text-blue-600">כניסה ←</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null
            )}
        </div>
      </div>
    </div>
  );
}
