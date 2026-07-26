"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, getStoredUser, storeUser, formatDateTime } from "@/lib/client";
import { ROLE_LABELS, type AppNotification, type User } from "@/lib/types";
import { ToastHost } from "./ui";

const NAV_ITEMS: { href: string; label: string; icon: string; roles?: string[] }[] = [
  { href: "/", label: "לוח בקרה", icon: "📊" },
  { href: "/cabinets", label: "ארונות", icon: "🗄️" },
  { href: "/projects", label: "פרויקטים וסטים", icon: "📁" },
  { href: "/deviations", label: "חריגות ושינויים", icon: "⚠️" },
  { href: "/print", label: "פתקי חיווט", icon: "🏷️" },
  { href: "/admin", label: "ניהול", icon: "📈", roles: ["manager", "inspector"] },
];

interface SearchResults {
  cabinets: { id: number; cabinet_no: string; name: string }[];
  cables: { id: number; cable_no: string; cabinet_no: string }[];
  wires: { id: number; wire_no: string; cable_id: number; cable_no: string; source_terminal: string; dest_terminal: string }[];
}

export default function AppShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
    setReady(true);
  }, [router]);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api<{ notifications: AppNotification[]; unread: number }>("/api/notifications");
      setNotifications(data.notifications);
      setUnread(data.unread);
    } catch {
      /* התעלמות שקטה */
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [ready, loadNotifications]);

  useEffect(() => {
    setMenuOpen(false);
    setNotifOpen(false);
    setSearch("");
    setResults(null);
  }, [pathname]);

  function onSearchChange(value: string) {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!value.trim()) {
      setResults(null);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      try {
        const data = await api<SearchResults>(`/api/search?q=${encodeURIComponent(value.trim())}`);
        setResults(data);
      } catch {
        /* שקט */
      }
    }, 250);
  }

  async function markAllRead() {
    await api("/api/notifications", { method: "POST", body: JSON.stringify({ action: "mark_all_read" }) });
    loadNotifications();
  }

  if (!ready || !user) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">טוען…</div>;
  }

  const navItems = NAV_ITEMS.filter((n) => !n.roles || n.roles.includes(user.role));

  return (
    <div className="min-h-screen">
      {/* פס הדגמה */}
      <div className="no-print bg-amber-400 py-1 text-center text-xs font-bold text-amber-950">
        סביבת הדגמה — כל הנתונים מדומים ואינם קשורים לאף מערכת אמיתית
      </div>

      {/* סרגל עליון */}
      <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
          <button className="rounded-lg p-2 text-xl hover:bg-slate-100 lg:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="תפריט">
            ☰
          </button>
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-blue-700">
            <span className="text-xl">⚡</span>
            <span className="hidden sm:inline">ניהול חיווטים וארונות</span>
            <span className="sm:hidden">חיווטים</span>
          </Link>

          {/* חיפוש */}
          <div className="relative mx-auto w-full max-w-md">
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="חיפוש ארון, כבל או גיד…"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
            />
            {results && search.trim() && (
              <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                {results.cabinets.length === 0 && results.cables.length === 0 && results.wires.length === 0 && (
                  <div className="p-3 text-sm text-slate-400">לא נמצאו תוצאות</div>
                )}
                {results.cabinets.map((c) => (
                  <Link key={`cab-${c.id}`} href={`/cabinets/${c.id}`} className="block border-b border-slate-100 px-3 py-2 text-sm hover:bg-blue-50">
                    🗄️ ארון {c.cabinet_no} — {c.name}
                  </Link>
                ))}
                {results.cables.map((c) => (
                  <Link key={`cbl-${c.id}`} href={`/cables/${c.id}`} className="block border-b border-slate-100 px-3 py-2 text-sm hover:bg-blue-50">
                    🔌 כבל {c.cable_no} (ארון {c.cabinet_no})
                  </Link>
                ))}
                {results.wires.map((w) => (
                  <Link key={`wr-${w.id}`} href={`/cables/${w.cable_id}`} className="block border-b border-slate-100 px-3 py-2 text-sm hover:bg-blue-50">
                    〰️ גיד {w.wire_no} בכבל {w.cable_no} ({w.source_terminal} ← {w.dest_terminal})
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* פעמון התראות */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="relative rounded-lg p-2 text-xl hover:bg-slate-100"
              aria-label="התראות"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -top-0.5 -left-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-80 max-w-[90vw] rounded-lg border border-slate-200 bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
                  <span className="text-sm font-bold">התראות</span>
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                    סמן הכל כנקרא
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 && <div className="p-4 text-sm text-slate-400">אין התראות</div>}
                  {notifications.map((n) => (
                    <div key={n.id} className={`border-b border-slate-50 px-3 py-2 text-sm ${n.read ? "text-slate-500" : "bg-blue-50/50 font-medium"}`}>
                      <div>{n.message}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{formatDateTime(n.created_at)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* משתמש */}
          <div className="flex items-center gap-2">
            <div className="hidden text-left text-xs sm:block">
              <div className="font-bold">{user.name}</div>
              <div className="text-slate-500">{ROLE_LABELS[user.role]}</div>
            </div>
            <button
              onClick={() => {
                storeUser(null);
                router.push("/login");
              }}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              החלפת משתמש
            </button>
          </div>
        </div>

        {/* ניווט */}
        <nav className={`border-t border-slate-100 bg-white ${menuOpen ? "block" : "hidden"} lg:block`}>
          <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-2 lg:flex-row lg:items-center lg:py-0">
            {navItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition lg:rounded-none lg:border-b-2 lg:py-3 ${
                    active
                      ? "bg-blue-50 text-blue-700 lg:border-blue-600 lg:bg-transparent"
                      : "text-slate-600 hover:bg-slate-50 lg:border-transparent"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
      <ToastHost />
    </div>
  );
}
