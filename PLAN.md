# תוכנית עבודה — אב־טיפוס "ניהול חיווטים וארונות"

## מטרה
אב־טיפוס עובד ומלא, מקומי בלבד, לניהול עבודות חיווט בארונות חשמל בתחמ״ש.
**נתונים מדומים בלבד — אין שימוש במידע אמיתי של חברת החשמל.**

## ארכיטקטורה
- **Next.js 15 (App Router) + TypeScript** — אפליקציה אחת שמכילה גם את ה־UI וגם את ה־API.
- **Tailwind CSS 4** — עיצוב מלא בעברית ו־RTL (`dir="rtl"` גלובלי).
- **SQLite באמצעות better-sqlite3** — בסיס נתונים מקומי בקובץ `data/app.db`,
  ללא שרת חיצוני. סכמה ב־SQL + שכבת גישה ב־TypeScript (פתרון מקומי פשוט, מקביל ל־Prisma).
- **Seed אוטומטי** — בהפעלה ראשונה נטענים נתוני דוגמה; איפוס ע"י `npm run db:reset`.
- **התחברות מדומה** — בחירת משתמש מרשימה, נשמר ב־localStorage ונשלח כ־header לכל בקשה.
- **QR** — חבילת `qrcode` מייצרת קוד לכל ארון, מצביע לנתיב `/cabinets/[id]`.
- **חילוץ PDF** — ממשק `DocumentExtractionService` + מימוש `DemoDocumentExtractionService`
  שמחזיר נתוני דוגמה דטרמיניסטיים לפי שם הקובץ. מסומן בבירור כ"הדגמה".
- **בדיקות** — Vitest לפונקציות חישוב התקדמות והרשאות.

## מבנה
```
wiring-app/
  lib/            db.ts, schema.sql, seed.ts, progress.ts, permissions.ts,
                  extraction/ (interface + demo impl), activity.ts, notifications.ts
  app/api/        projects, sets, cabinets, cables, wires, deviations,
                  users, dashboard, admin, notifications, search, qr, export
  app/            login, / (dashboard), projects, review/[setId], cabinets,
                  cabinets/[id], cables/[id], deviations, print, admin
  components/     ניווט, כרטיסים, טבלאות, סטטוסים, התראות
  tests/          progress.test.ts, permissions.test.ts
```

## שלבי ביצוע
1. הקמת פרויקט Next.js + Tailwind + better-sqlite3 + qrcode + vitest.
2. סכמת DB מלאה (פרויקט, סט חיווט, קבצים, ארון, כבל, גיד, חריגה, משתמש, היסטוריה, התראות) + Seed.
3. לוגיקה: חישובי התקדמות, כללי סטטוס (כבל גמור ⇐ כל הגידים; ארון גמור ⇐ כל הכבלים), הרשאות אישור.
4. שכבת API מלאה כולל רישום היסטוריה והתראות אוטומטיות.
5. מסכים: כניסה, לוח בקרה, פרויקטים/סטים+העלאת PDF, בדיקת נתונים, ארונות, ארון, כבל,
   חריגות, הדפסת פתקים (תצוגה מקדימה/הדפסה/CSV), ניהול, התראות, QR.
6. בדיקות + tsc + lint + build, תיקון שגיאות.
7. README בעברית + הרצה ואימות ידני של כל המסכים.
