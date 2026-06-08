# -*- coding: utf-8 -*-
"""
בונה קובץ "עוצמה גדודית" מסודר ומפולח מתוך קובץ המקור.
לשוניות: דשבורד, טבלה ראשית מקובצת לפי קטגוריות, חוסרים קריטיים,
עודפים לבדיקה, חוסר נתוני מצאי, פילוח לפי פלוגה, סיכום לפי קטגוריה.
חוסרים מסומנים באדום, עודפים בכתום, תקין בירוק.
"""
import openpyxl
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, NamedStyle
from openpyxl.utils import get_column_letter
from openpyxl.formatting.rule import CellIsRule, FormulaRule

SRC = "source_input.xlsx"
OUT = "עוצמה_גדודית_מסודר.xlsx"

# ---------- צבעים / סגנונות ----------
NAVY   = "1F3864"   # כותרת ראשית
BLUE   = "2E5496"   # כותרת קטגוריה
STEEL  = "8EAADB"   # כותרת משנה
RED    = "C00000"   # חוסר קריטי
REDBG  = "FFC7CE"
AMBER  = "BF8F00"   # עודף
AMBERBG= "FFEB9C"
GREEN  = "375623"   # תקין
GREENBG= "C6EFCE"
GREY   = "808080"
GREYBG = "E7E6E6"
WHITE  = "FFFFFF"
ZEBRA  = "F2F5FA"

thin = Side(style="thin", color="BFBFBF")
med  = Side(style="medium", color="808080")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)
BOX    = Border(left=med, right=med, top=med, bottom=med)

def fill(hexcol):
    return PatternFill("solid", fgColor=hexcol)

CEN = Alignment(horizontal="center", vertical="center", wrap_text=True)
CENV= Alignment(horizontal="center", vertical="center")
RGT = Alignment(horizontal="right", vertical="center", wrap_text=True)

# ---------- קטגוריות ----------
CATEGORIES = [
    ("נשק ומקלעים", [
        'רוס"ר M4 פלטופ', 'מטול+זאבון', 'פגיון + כוונת', 'M16', 'מפרו לייט קצר',
        'זאבון', 'מקלע נגב קל', 'נגב 7.62', 'מאג', 'מקלרון', 'רוב"צ HTR 338',
        'רוב"צ M24',
    ]),
    ("כוונות ואופטיקה", [
        "כוונת טריג'", 'eotech', 'כוונת השלכה מתקדמת', 'כוונת השלכה M5',
        'כוונת לילה לצלף MUNS', 'כוונת טרמית קליפאון', 'לאופולד',
        'PACK EOTECH', 'PACK שחור',
    ]),
    ('אמר"לים ואמצעי תצפית', [
        'ישל"ט אורלי גיל', 'אמר"ל דו עיני מיקרון', 'אמר"ל דו עיני עדי',
        'אמר"ל דו עיני עידו', 'אמר"ל שח"ע', 'אמר"ל שח"מ', 'אמר"ל אקילה 6*',
        'עמית', 'חצובה לעמית', 'עמית איכון', 'ערמון', 'ליאור', 'מכבים', 'מכבית',
        'מצפן', 'משקפת', 'מאתר', 'חצובה למאתר', 'שבשבת רוח', 'מיני תבל נשלט',
        'אמצעי זיהוי תהל',
    ]),
    ('סמנים ומציינים', [
        'סמן מפקדים LPL', 'סמן לייזר למפקד דיויד', 'ציין לנגב', 'סמן תרמי נטלי',
    ]),
    ('מט"ל ואבזור', [
        'מט"ל מ"מ', 'מטל ממ VORTEX (אזרחי)', 'חצובה זיקית (אזרחי)',
        'חצובה מעגל סגור (אזרחי)', 'חצובה לזום (אזרחי)', 'ממיר מתח לעמית',
    ]),
    ('רחפנים', [
        'רחפן EVOMAX', 'רחפן AVATA',
    ]),
    ('חשמל ואנרגיה', [
        'גנרטור כתום GPT 1800W', 'גנרטור לבן YAMAR 3800W', 'גנרטור צהוב 700W',
        '1800W ECOFLOW HYBRID', '500W ECOFLOW קטן', '1000W ECOFLOW גדול',
        'פלטות', 'גנרטור דיזל',
    ]),
]
def category_of(name):
    n = name.strip()
    for cat, items in CATEGORIES:
        for it in items:
            if it.strip() == n:
                return cat
    return "אחר"

# ---------- קריאת המקור ----------
UNIT_COLS = [
    ("פלוגה א", 2), ("פלוגה ב", 3), ("פלוגה ג", 4), ("מסייעת", 5),
    ("פתן/פלסם", 6), ("חפק", 7), ("מפקדה", 8),
]
src = openpyxl.load_workbook(SRC, data_only=True).active

def num(v):
    if v is None or (isinstance(v, str) and not v.strip()):
        return None
    try:
        return float(v) if (isinstance(v, float) and v % 1) else int(v)
    except (TypeError, ValueError):
        return v

records = []
for r in range(3, src.max_row + 1):
    name = src.cell(r, 1).value
    if name is None or not str(name).strip():
        continue
    rec = {"name": str(name).strip()}
    for label, c in UNIT_COLS:
        rec[label] = num(src.cell(r, c).value)
    rec["מלאי"]  = num(src.cell(r, 9).value)
    rec["סהכ"]   = num(src.cell(r, 10).value)
    rec["מצאי"]  = num(src.cell(r, 11).value)
    rec["הערה"]  = (src.cell(r, 12).value or "")
    rec["קטגוריה"] = category_of(rec["name"])
    # סכום מחושב = יחידות + מלאי
    units_sum = sum(v for _, c in UNIT_COLS for v in [rec[_]] if isinstance(v, (int, float)))
    melai = rec["מלאי"] if isinstance(rec["מלאי"], (int, float)) else 0
    rec["מחושב"] = units_sum + melai
    # פער מול מצאי
    if isinstance(rec["סהכ"], (int, float)) and isinstance(rec["מצאי"], (int, float)):
        rec["פער"] = rec["סהכ"] - rec["מצאי"]
    else:
        rec["פער"] = None
    records.append(rec)

# ---------- חישוב סטטוס ----------
def status_of(rec):
    if rec["פער"] is None:
        return ("אין נתון מצאי", GREY, GREYBG)
    if rec["פער"] < 0:
        return ("חוסר", RED, REDBG)
    if rec["פער"] > 0:
        return ("עודף", AMBER, AMBERBG)
    return ("תקין", GREEN, GREENBG)

# ============================================================
wb = Workbook()
wb.remove(wb.active)

def style_header(ws, row, headers, start=1, fillcol=NAVY, fontcol=WHITE, h=30):
    for i, htxt in enumerate(headers):
        c = ws.cell(row, start + i, htxt)
        c.fill = fill(fillcol); c.font = Font(bold=True, color=fontcol, size=11)
        c.alignment = CEN; c.border = BOX
    ws.row_dimensions[row].height = h

# ============================================================
# 1) טבלה ראשית — מקובצת לפי קטגוריות
# ============================================================
HEAD = ["אמצעי"] + [u for u, _ in UNIT_COLS] + ["מלאי", 'סה"כ', "מצאי", "פער", "סטטוס", "הערות"]
NCOL = len(HEAD)
ws = wb.create_sheet("טבלה ראשית")
ws.sheet_view.rightToLeft = True

# כותרת על
ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=NCOL)
t = ws.cell(1, 1, "טבלת עוצמה גדודית — גדוד 28  |  מעקב אמצעים, מלאי ומצאי")
t.font = Font(bold=True, color=WHITE, size=15); t.fill = fill(NAVY); t.alignment = CENV
ws.row_dimensions[1].height = 34
style_header(ws, 2, HEAD)
ws.freeze_panes = "B3"

row = 3
cat_index = {}
for cat, _ in CATEGORIES:
    cat_index[cat] = []
cat_index["אחר"] = []

# סדר לפי קטגוריות
order = [c for c, _ in CATEGORIES] + ["אחר"]
by_cat = {c: [] for c in order}
for rec in records:
    by_cat[rec["קטגוריה"]].append(rec)

ZEBRA_F = fill(ZEBRA)
for cat in order:
    items = by_cat[cat]
    if not items:
        continue
    # שורת קטגוריה
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=NCOL)
    cc = ws.cell(row, 1, f"▼  {cat}  ({len(items)} פריטים)")
    cc.fill = fill(BLUE); cc.font = Font(bold=True, color=WHITE, size=12)
    cc.alignment = Alignment(horizontal="right", vertical="center", indent=1)
    ws.row_dimensions[row].height = 24
    row += 1
    for k, rec in enumerate(items):
        st, fcol, bcol = status_of(rec)
        vals = [rec["name"]] + [rec[u] for u, _ in UNIT_COLS] + \
               [rec["מלאי"], rec["סהכ"], rec["מצאי"], rec["פער"], st, rec["הערה"]]
        for i, v in enumerate(vals):
            c = ws.cell(row, 1 + i, v)
            c.border = BORDER
            if i == 0:
                c.alignment = RGT; c.font = Font(bold=True, size=11)
            elif i == NCOL - 1:
                c.alignment = RGT
            else:
                c.alignment = CENV
            if k % 2 == 1 and i not in (NCOL - 2,):
                c.fill = ZEBRA_F
        # צביעת עמודת פער + סטטוס לפי המצב
        pcell = ws.cell(row, NCOL - 2)   # פער
        scell = ws.cell(row, NCOL - 1)   # סטטוס
        scell.fill = fill(bcol); scell.font = Font(bold=True, color=fcol)
        if rec["פער"] is not None and rec["פער"] != 0:
            pcell.fill = fill(bcol); pcell.font = Font(bold=True, color=fcol)
        row += 1

last = row - 1
# רוחב עמודות
widths = [26] + [9]*len(UNIT_COLS) + [8, 8, 8, 8, 14, 22]
for i, w in enumerate(widths):
    ws.column_dimensions[get_column_letter(i + 1)].width = w
ws.auto_filter.ref = f"A2:{get_column_letter(NCOL)}2"

# הקפאה ויזואלית בעמודת פער (הדגשה כפולה גם דרך CF על כל הטווח)
pcol = get_column_letter(NCOL - 2)
rng = f"{pcol}3:{pcol}{last}"
ws.conditional_formatting.add(rng, CellIsRule(operator="lessThan", formula=["0"],
    fill=fill(REDBG), font=Font(bold=True, color=RED)))
ws.conditional_formatting.add(rng, CellIsRule(operator="greaterThan", formula=["0"],
    fill=fill(AMBERBG), font=Font(bold=True, color=AMBER)))

# ============================================================
# 2) דשבורד / סיכום
# ============================================================
short = [r for r in records if r["פער"] is not None and r["פער"] < 0]
surp  = [r for r in records if r["פער"] is not None and r["פער"] > 0]
ok    = [r for r in records if r["פער"] == 0]
nodata= [r for r in records if r["פער"] is None]
tot_short = -sum(r["פער"] for r in short)
tot_surp  = sum(r["פער"] for r in surp)

dash = wb.create_sheet("דשבורד", 0)
dash.sheet_view.rightToLeft = True
dash.sheet_view.showGridLines = False
dash.merge_cells("A1:F1")
h = dash.cell(1, 1, "עוצמה גדודית — לוח בקרה")
h.font = Font(bold=True, size=20, color=WHITE); h.fill = fill(NAVY); h.alignment = CENV
dash.row_dimensions[1].height = 42
dash.merge_cells("A2:F2")
sub = dash.cell(2, 1, "עודכן לאחרונה: 06/2026  •  צבעים: אדום=חוסר, כתום=עודף, ירוק=תקין, אפור=חסר נתון מצאי")
sub.font = Font(size=10, italic=True, color="595959"); sub.alignment = CENV
dash.row_dimensions[2].height = 20

# כרטיסי KPI
cards = [
    ("סך פריטים", len(records), STEEL, WHITE),
    ("חוסרים (פריטים)", len(short), RED, WHITE),
    ("עודפים (פריטים)", len(surp), AMBER, WHITE),
    ("תקין", len(ok), GREEN, WHITE),
    ("ללא מצאי", len(nodata), GREY, WHITE),
    ("סה\"כ יחידות חסרות", int(tot_short), RED, WHITE),
]
col = 1
for title, val, bg, fg in cards:
    dash.merge_cells(start_row=4, start_column=col, end_row=4, end_column=col)
    dash.merge_cells(start_row=5, start_column=col, end_row=6, end_column=col)
    tc = dash.cell(4, col, title); tc.fill = fill(bg); tc.font = Font(bold=True, color=fg, size=10); tc.alignment = CEN; tc.border = BOX
    vc = dash.cell(5, col, val); vc.fill = fill("F2F2F2"); vc.font = Font(bold=True, size=24, color=bg); vc.alignment = CENV; vc.border = BOX
    dash.column_dimensions[get_column_letter(col)].width = 16
    col += 1
dash.row_dimensions[4].height = 26
dash.row_dimensions[5].height = 30
dash.row_dimensions[6].height = 18

# טבלת חוסרים מובילים
r0 = 8
dash.merge_cells(start_row=r0, start_column=1, end_row=r0, end_column=4)
hc = dash.cell(r0, 1, "🔴 חוסרים קריטיים מובילים (פער שלילי)")
hc.fill = fill(RED); hc.font = Font(bold=True, color=WHITE, size=12); hc.alignment = Alignment(horizontal="right", vertical="center", indent=1)
dash.row_dimensions[r0].height = 24
style_header(dash, r0 + 1, ["אמצעי", "סה\"כ", "מצאי", "חוסר"], h=22)
top_short = sorted(short, key=lambda r: r["פער"])[:12]
rr = r0 + 2
for rec in top_short:
    dash.cell(rr, 1, rec["name"]).alignment = RGT
    dash.cell(rr, 2, rec["סהכ"]).alignment = CENV
    dash.cell(rr, 3, rec["מצאי"]).alignment = CENV
    gc = dash.cell(rr, 4, rec["פער"]); gc.alignment = CENV
    gc.font = Font(bold=True, color=RED); gc.fill = fill(REDBG)
    for cc in range(1, 5):
        dash.cell(rr, cc).border = BORDER
    rr += 1

# טבלת עודפים מובילים (לצד ימין)
dash.merge_cells(start_row=r0, start_column=5, end_row=r0, end_column=8)
hc2 = dash.cell(r0, 5, "🟠 עודפים מובילים (פער חיובי)")
hc2.fill = fill(AMBER); hc2.font = Font(bold=True, color=WHITE, size=12); hc2.alignment = Alignment(horizontal="right", vertical="center", indent=1)
style_header(dash, r0 + 1, ["אמצעי", "סה\"כ", "מצאי", "עודף"], start=5, h=22)
top_surp = sorted(surp, key=lambda r: -r["פער"])[:12]
rr = r0 + 2
for rec in top_surp:
    dash.cell(rr, 5, rec["name"]).alignment = RGT
    dash.cell(rr, 6, rec["סהכ"]).alignment = CENV
    dash.cell(rr, 7, rec["מצאי"]).alignment = CENV
    gc = dash.cell(rr, 8, rec["פער"]); gc.alignment = CENV
    gc.font = Font(bold=True, color=AMBER); gc.fill = fill(AMBERBG)
    for cc in range(5, 9):
        dash.cell(rr, cc).border = BORDER
    rr += 1
for c in range(5, 9):
    dash.column_dimensions[get_column_letter(c)].width = 15

# ============================================================
# 3) חוסרים קריטיים
# ============================================================
def make_filtered_sheet(title, rows, head_fill, val_key="פער", note=""):
    s = wb.create_sheet(title)
    s.sheet_view.rightToLeft = True
    cols = ["אמצעי", "קטגוריה"] + [u for u, _ in UNIT_COLS] + ["מלאי", 'סה"כ', "מצאי", "פער", "הערות"]
    s.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(cols))
    tt = s.cell(1, 1, f"{title}  ({len(rows)} פריטים){('  •  ' + note) if note else ''}")
    tt.fill = fill(head_fill); tt.font = Font(bold=True, color=WHITE, size=13); tt.alignment = CENV
    s.row_dimensions[1].height = 30
    style_header(s, 2, cols, fillcol=NAVY)
    rr = 3
    for rec in rows:
        vals = [rec["name"], rec["קטגוריה"]] + [rec[u] for u, _ in UNIT_COLS] + \
               [rec["מלאי"], rec["סהכ"], rec["מצאי"], rec["פער"], rec["הערה"]]
        for i, v in enumerate(vals):
            c = s.cell(rr, 1 + i, v); c.border = BORDER
            c.alignment = RGT if i in (0, 1, len(cols) - 1) else CENV
            if i == 0:
                c.font = Font(bold=True)
        gcell = s.cell(rr, len(cols) - 1)
        if rec["פער"] is not None and rec["פער"] < 0:
            gcell.fill = fill(REDBG); gcell.font = Font(bold=True, color=RED)
        elif rec["פער"] is not None and rec["פער"] > 0:
            gcell.fill = fill(AMBERBG); gcell.font = Font(bold=True, color=AMBER)
        rr += 1
    s.freeze_panes = "A3"
    s.auto_filter.ref = f"A2:{get_column_letter(len(cols))}2"
    ws_w = [24, 18] + [8]*len(UNIT_COLS) + [8, 8, 8, 8, 22]
    for i, w in enumerate(ws_w):
        s.column_dimensions[get_column_letter(i + 1)].width = w
    return s

make_filtered_sheet("חוסרים קריטיים", sorted(short, key=lambda r: r["פער"]), RED,
                    note="ממוין מהחמור לקל — לטיפול מיידי")
make_filtered_sheet("עודפים לבדיקה", sorted(surp, key=lambda r: -r["פער"]), AMBER,
                    note="כמות בפועל גדולה מהרשום — לאימות מול ספרים")
make_filtered_sheet("חוסר נתוני מצאי", nodata, GREY,
                    note="אין ערך מצאי במקור — להשלמת נתון")

# ============================================================
# 4) פילוח לפי פלוגה
# ============================================================
pf = wb.create_sheet("פילוח לפי פלוגה")
pf.sheet_view.rightToLeft = True
unit_names = [u for u, _ in UNIT_COLS]
cols = ["אמצעי", "קטגוריה"] + unit_names + ["מלאי"]
pf.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(cols))
tt = pf.cell(1, 1, "פילוח אחזקה לפי פלוגה / גורם")
tt.fill = fill(NAVY); tt.font = Font(bold=True, color=WHITE, size=13); tt.alignment = CENV
pf.row_dimensions[1].height = 30
style_header(pf, 2, cols, fillcol=BLUE)
pf.freeze_panes = "C3"
rr = 3
unit_totals = {u: 0 for u in unit_names}; melai_total = 0
for rec in records:
    vals = [rec["name"], rec["קטגוריה"]] + [rec[u] for u in unit_names] + [rec["מלאי"]]
    for i, v in enumerate(vals):
        c = pf.cell(rr, 1 + i, v); c.border = BORDER
        c.alignment = RGT if i in (0, 1) else CENV
        if i == 0:
            c.font = Font(bold=True)
        if isinstance(v, (int, float)) and i >= 2:
            if i - 2 < len(unit_names):
                unit_totals[unit_names[i - 2]] += v
            else:
                melai_total += v
    rr += 1
# שורת סיכום
pf.cell(rr, 1, "סה\"כ").font = Font(bold=True, color=WHITE)
pf.cell(rr, 1).fill = fill(NAVY); pf.cell(rr, 1).alignment = RGT
pf.cell(rr, 2).fill = fill(NAVY)
for i, u in enumerate(unit_names):
    c = pf.cell(rr, 3 + i, unit_totals[u]); c.font = Font(bold=True, color=WHITE); c.fill = fill(NAVY); c.alignment = CENV
c = pf.cell(rr, 3 + len(unit_names), melai_total); c.font = Font(bold=True, color=WHITE); c.fill = fill(NAVY); c.alignment = CENV
pf.row_dimensions[rr].height = 22
pf.auto_filter.ref = f"A2:{get_column_letter(len(cols))}2"
for i, w in enumerate([24, 18] + [10]*len(unit_names) + [10]):
    pf.column_dimensions[get_column_letter(i + 1)].width = w

# ============================================================
# 5) סיכום לפי קטגוריה
# ============================================================
cs = wb.create_sheet("סיכום לפי קטגוריה")
cs.sheet_view.rightToLeft = True
cols = ["קטגוריה", "פריטים", "סה\"כ יחידות", "סך מצאי", "סך פער", "חוסרים", "עודפים"]
cs.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(cols))
tt = cs.cell(1, 1, "סיכום לפי קטגוריה"); tt.fill = fill(NAVY); tt.font = Font(bold=True, color=WHITE, size=13); tt.alignment = CENV
cs.row_dimensions[1].height = 28
style_header(cs, 2, cols, fillcol=BLUE)
rr = 3
for cat in order:
    items = by_cat[cat]
    if not items:
        continue
    n = len(items)
    tot = sum(r["סהכ"] for r in items if isinstance(r["סהכ"], (int, float)))
    metz = sum(r["מצאי"] for r in items if isinstance(r["מצאי"], (int, float)))
    gap = sum(r["פער"] for r in items if isinstance(r["פער"], (int, float)))
    nsh = sum(1 for r in items if r["פער"] is not None and r["פער"] < 0)
    nsu = sum(1 for r in items if r["פער"] is not None and r["פער"] > 0)
    vals = [cat, n, tot, metz, gap, nsh, nsu]
    for i, v in enumerate(vals):
        c = cs.cell(rr, 1 + i, v); c.border = BORDER
        c.alignment = RGT if i == 0 else CENV
        if i == 0:
            c.font = Font(bold=True)
    if gap < 0:
        cs.cell(rr, 5).fill = fill(REDBG); cs.cell(rr, 5).font = Font(bold=True, color=RED)
    elif gap > 0:
        cs.cell(rr, 5).fill = fill(AMBERBG); cs.cell(rr, 5).font = Font(bold=True, color=AMBER)
    rr += 1
for i, w in enumerate([22, 10, 14, 12, 12, 12, 12]):
    cs.column_dimensions[get_column_letter(i + 1)].width = w
cs.auto_filter.ref = f"A2:{get_column_letter(len(cols))}2"

# ============================================================
# 6) מקרא / הסבר
# ============================================================
lg = wb.create_sheet("מקרא והסבר")
lg.sheet_view.rightToLeft = True
lg.sheet_view.showGridLines = False
lg.merge_cells("A1:C1")
tt = lg.cell(1, 1, "מקרא, הגדרות והסבר על הקובץ"); tt.fill = fill(NAVY); tt.font = Font(bold=True, color=WHITE, size=14); tt.alignment = CENV
lg.row_dimensions[1].height = 32
legend = [
    ("מונח / צבע", "משמעות", None),
    ("מלאי", "כמות המוחזקת במחסן/עתודה (לא מחולקת ליחידות)", None),
    ('סה"כ', "סך הכמות שנספרה בפועל = סכום הפלוגות + מלאי", None),
    ("מצאי", "הכמות הרשומה בספרים/מערכת — מולה משווים", None),
    ("פער", 'סה"כ פחות מצאי. שלילי=חוסר, חיובי=עודף, אפס=תקין', None),
    ("חוסר (אדום)", "נספר פחות מהרשום — חסרים פריטים, לטיפול מיידי", REDBG),
    ("עודף (כתום)", "נספר יותר מהרשום — לאימות מול הספרים", AMBERBG),
    ("תקין (ירוק)", "התאמה מלאה בין הנספר לרשום", GREENBG),
    ("אין מצאי (אפור)", "לא קיים ערך מצאי במקור — להשלמה", GREYBG),
]
rr = 3
for a, b, col in legend:
    ca = lg.cell(rr, 1, a); ca.font = Font(bold=True); ca.alignment = RGT; ca.border = BORDER
    cb = lg.cell(rr, 2, b); cb.alignment = RGT; cb.border = BORDER
    if col:
        ca.fill = fill(col)
    if rr == 3:
        ca.fill = fill(STEEL); cb.fill = fill(STEEL); ca.font = Font(bold=True, color=WHITE); cb.font = Font(bold=True, color=WHITE)
    rr += 1
lg.column_dimensions["A"].width = 20
lg.column_dimensions["B"].width = 60
lg.merge_cells(start_row=rr+1, start_column=1, end_row=rr+1, end_column=2)
note = lg.cell(rr+1, 1, "לשוניות: דשבורד · טבלה ראשית (מקובצת לקטגוריות) · חוסרים קריטיים · עודפים לבדיקה · חוסר נתוני מצאי · פילוח לפי פלוגה · סיכום לפי קטגוריה")
note.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True); note.font = Font(italic=True, color="595959")
lg.row_dimensions[rr+1].height = 40

# סדר לשוניות
wb.move_sheet("מקרא והסבר", -(len(wb.sheetnames)-1))  # not critical
order_tabs = ["דשבורד", "טבלה ראשית", "חוסרים קריטיים", "עודפים לבדיקה",
              "חוסר נתוני מצאי", "פילוח לפי פלוגה", "סיכום לפי קטגוריה", "מקרא והסבר"]
wb._sheets.sort(key=lambda s: order_tabs.index(s.title) if s.title in order_tabs else 99)
wb.active = 0

wb.save(OUT)
print("נשמר:", OUT)
print(f"פריטים={len(records)} חוסרים={len(short)} עודפים={len(surp)} תקין={len(ok)} ללא-מצאי={len(nodata)}")
print(f"סך יחידות חסרות={int(tot_short)} סך עודף={int(tot_surp)}")
