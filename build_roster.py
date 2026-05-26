#!/usr/bin/env python3
"""מחולל שבצק יציאות - קו הגנה סוריה (יוני-ספטמבר 2026).

תכונות:
- כותרות תאריכים צבועות: שבת/ערב שבת צהוב, חגים כתום.
- סטטוס יומי לכל חייל מרשימה נפתחת, עם צביעה אוטומטית:
  בסיס / בית / חופשה / גימלים / קורס / ת״ש.
- שורות יומיות: סה"כ בבסיס + כיסוי נשקייה + כיסוי אפסנאות,
  שנצבעות אדום אוטומטית כשיורדים מתחת לסף (תאי הגדרות נפרדים).
- מוני הוגנות לכל חייל: ימי בסיס/בית, סופ"שים בבית, חגים בבית
  (סולם צבעים על סופ"שים בבית כדי לאתר חוסר איזון).
- גיליון מקרא.

הארכת תקופה: שנה START_DATE / END_DATE.
הוספת חגים: ערוך את HOLIDAYS.
"""

from datetime import date, timedelta

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.formatting.rule import CellIsRule, ColorScaleRule
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

# ---------------------------------------------------------------- נתונים
START_DATE = date(2026, 6, 24)
END_DATE = date(2026, 9, 30)

# חגים (כתום) - ערב חג + החג עצמו. צומות וחוה"מ מושארים נייטרליים בכוונה.
HOLIDAYS: set[date] = {
    date(2026, 9, 11), date(2026, 9, 12), date(2026, 9, 13),  # ראש השנה
    date(2026, 9, 20), date(2026, 9, 21),                     # יום כיפור
    date(2026, 9, 25), date(2026, 9, 26),                     # סוכות
}

SOLDIERS = [
    ("איתי עוזיאל", "קלג"), ("אורי עוזיאל", "סמל נשקייה"),
    ("ינון איזון", "נשקייה"), ("שי ארנלדס", "נשקייה"),
    ("איתי שמש", "נשקייה"), ("אביעד כהן", "נשקייה"),
    ("אזוגי נתנאל", "אפסנאות"), ("ניב סורוקר", "אפסנאות"),
    ("צבי לונדין", "אפסנאות"), ("יוסף חגואל", "נשקייה"),
    ("אדם ממן", "סמל אפסנאות"), ("גבריאל יעקוביאן", "נשקייה"),
    ("יקיר אלימלך", "אפסנאות"), ("יוסי כהן", "נשקייה-רחפנים"),
    ("רון בן שושן", ""), ("דוד שמחי", ""),
    ("לב גינזבורג", "נשקייה"), ("יעקב גרמאי", "אפסנאות"),
    ("עידן אשטון", "אפסנאות"), ("עומר נוימן", ""),
    ("דוד עבאדה", "אפסנאות"),
]

# ספי מצבה (ברירת מחדל - ניתן לעריכה בתאי ההגדרות בקובץ)
MIN_BASE = 12       # מינימום אנשים בבסיס ביום
MIN_NESHEK = 2      # מינימום נשקאים בבסיס
MIN_AFSANA = 2      # מינימום אפסנאים בבסיס

# סטטוסים (ת״ש משתמש בגרשיים עבריים U+05F4 כדי לא לשבור נוסחאות)
STATUSES = [
    ("בסיס", "BDD7EE"),
    ("בית", "C6EFCE"),
    ("חופשה", "A9D08E"),
    ("גימלים", "FFC7CE"),
    ("קורס", "B4A7D6"),
    ("ת״ש", "F8CBAD"),
]

HEB_DOW = {6: "א", 0: "ב", 1: "ג", 2: "ד", 3: "ה", 4: "ו", 5: "ש"}
HEB_MONTH = {6: "יוני", 7: "יולי", 8: "אוגוסט", 9: "ספטמבר"}

# ---------------------------------------------------------------- צבעים/סגנון
NAVY = "1F4E78"; HEADER_GRAY = "D9E1F2"; YELLOW = "FFFF00"; ORANGE = "FFC000"
ALERT_RED = "FF5050"

fill_navy = PatternFill("solid", fgColor=NAVY)
fill_gray = PatternFill("solid", fgColor=HEADER_GRAY)
fill_yellow = PatternFill("solid", fgColor=YELLOW)
fill_orange = PatternFill("solid", fgColor=ORANGE)
fill_alert = PatternFill("solid", fgColor=ALERT_RED)

white_bold = Font(bold=True, color="FFFFFF", size=11)
alert_font = Font(bold=True, color="FFFFFF")
bold = Font(bold=True, size=11)
normal = Font(size=11)
center = Alignment(horizontal="center", vertical="center", wrap_text=True)
right = Alignment(horizontal="right", vertical="center")
thin = Side(style="thin", color="B0B0B0")
border = Border(left=thin, right=thin, top=thin, bottom=thin)

DATES = []
_d = START_DATE
while _d <= END_DATE:
    DATES.append(_d)
    _d += timedelta(days=1)
n_dates = len(DATES)

# ---------------------------------------------------------------- פריסה
wb = Workbook()
ws = wb.active
ws.title = "שבצק יציאות"
ws.sheet_view.rightToLeft = True

FIRST_DATE_COL = 4
last_date_col = FIRST_DATE_COL + n_dates - 1
col_base_days = last_date_col + 1   # ימי בסיס
col_home_days = last_date_col + 2   # ימי בית
col_we_home = last_date_col + 3     # סופ"ש בבית
col_hag_home = last_date_col + 4    # חגים בבית
last_col = col_hag_home

TITLE_ROW, MONTH_ROW, HEAD_ROW, FIRST_SOLDIER_ROW = 1, 2, 3, 4
last_soldier_row = FIRST_SOLDIER_ROW + len(SOLDIERS) - 1
base_total_row = last_soldier_row + 1   # סה"כ בבסיס
neshek_row = last_soldier_row + 2       # נשקאים בבסיס
afsana_row = last_soldier_row + 3       # אפסנאים בבסיס
home_total_row = last_soldier_row + 4   # סה"כ בבית
shabbat_flag_row = last_soldier_row + 6  # מוסתר
holiday_flag_row = last_soldier_row + 7  # מוסתר
cfg_row = last_soldier_row + 9           # תחילת בלוק הגדרות

L = get_column_letter
first_dl, last_dl = L(FIRST_DATE_COL), L(last_date_col)
role_rng = f"$B${FIRST_SOLDIER_ROW}:$B${last_soldier_row}"

# --- כותרת ראשית
ws.cell(TITLE_ROW, 1, "שבצק יציאות - קו הגנה סוריה")
ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=last_col)
t = ws.cell(TITLE_ROW, 1)
t.fill = fill_navy; t.font = Font(bold=True, color="FFFFFF", size=14); t.alignment = center

# --- שורת חודשים
mi = 0
for i in range(n_dates + 1):
    if i == n_dates or DATES[i].month != DATES[mi].month:
        c0, c1 = FIRST_DATE_COL + mi, FIRST_DATE_COL + i - 1
        m = DATES[mi]
        cell = ws.cell(MONTH_ROW, c0, f"{HEB_MONTH[m.month]} {m.year}")
        if c1 > c0:
            ws.merge_cells(start_row=MONTH_ROW, start_column=c0, end_row=MONTH_ROW, end_column=c1)
        cell.fill = fill_navy; cell.font = white_bold; cell.alignment = center; cell.border = border
        mi = i

# --- כותרות קבועות
for col, label in ((1, "שם"), (2, "תפקיד"), (3, "הערות")):
    c = ws.cell(HEAD_ROW, col, label)
    c.fill = fill_navy; c.font = white_bold; c.alignment = center; c.border = border

# --- כותרות תאריכים
for i, d in enumerate(DATES):
    col = FIRST_DATE_COL + i
    c = ws.cell(HEAD_ROW, col, f"{d.day}\n{HEB_DOW[d.weekday()]}")
    c.alignment = center; c.border = border; c.font = bold
    if d in HOLIDAYS:
        c.fill = fill_orange
    elif d.weekday() in (4, 5):
        c.fill = fill_yellow
    else:
        c.fill = fill_gray
    ws.column_dimensions[L(col)].width = 5

# --- כותרות מוני הוגנות
for col, label in ((col_base_days, "ימי בסיס"), (col_home_days, "ימי בית"),
                   (col_we_home, "סופ\"ש בבית"), (col_hag_home, "חגים בבית")):
    c = ws.cell(HEAD_ROW, col, label)
    c.fill = fill_navy; c.font = white_bold; c.alignment = center; c.border = border
    ws.column_dimensions[L(col)].width = 9

# --- שורות חיילים + מונים
for r, (name, role) in enumerate(SOLDIERS, start=FIRST_SOLDIER_ROW):
    n = ws.cell(r, 1, name); n.font = bold; n.alignment = right; n.border = border
    rl = ws.cell(r, 2, role); rl.font = normal; rl.alignment = center; rl.border = border
    ws.cell(r, 3).border = border
    for i in range(n_dates):
        ws.cell(r, FIRST_DATE_COL + i).border = border
    rng = f"{first_dl}{r}:{last_dl}{r}"
    sh = f"$D${shabbat_flag_row}:${last_dl}${shabbat_flag_row}"
    hg = f"$D${holiday_flag_row}:${last_dl}${holiday_flag_row}"
    for col, formula in (
        (col_base_days, f'=COUNTIF({rng},"בסיס")'),
        (col_home_days, f'=COUNTIF({rng},"בית")'),
        (col_we_home, f'=SUMPRODUCT({sh},--({rng}="בית"))'),
        (col_hag_home, f'=SUMPRODUCT({hg},--({rng}="בית"))'),
    ):
        c = ws.cell(r, col, formula); c.alignment = center; c.border = border

# --- שורות סיכום יומי
def day_formula_row(row, label, formula_fn, alert_ref):
    lab = ws.cell(row, 1, label)
    lab.fill = fill_navy; lab.font = white_bold; lab.alignment = center
    ws.merge_cells(start_row=row, start_column=1, end_row=row, end_column=3)
    for i in range(n_dates):
        col = FIRST_DATE_COL + i; letter = L(col)
        c = ws.cell(row, col, formula_fn(letter)); c.alignment = center; c.font = bold; c.border = border
    if alert_ref is not None:
        rng = f"{first_dl}{row}:{last_dl}{row}"
        ws.conditional_formatting.add(rng, CellIsRule(
            operator="lessThan", formula=[alert_ref], fill=fill_alert, font=alert_font))

sr, er = FIRST_SOLDIER_ROW, last_soldier_row
cfg_base = f"$B${cfg_row}"; cfg_nesh = f"$B${cfg_row+1}"; cfg_afs = f"$B${cfg_row+2}"
day_formula_row(base_total_row, 'סה"כ בבסיס',
                lambda c: f'=COUNTIF({c}{sr}:{c}{er},"בסיס")', cfg_base)
day_formula_row(neshek_row, "נשקייה בבסיס",
                lambda c: f'=COUNTIFS({role_rng},"*נשקייה*",{c}{sr}:{c}{er},"בסיס")', cfg_nesh)
day_formula_row(afsana_row, "אפסנאות בבסיס",
                lambda c: f'=COUNTIFS({role_rng},"*אפסנאות*",{c}{sr}:{c}{er},"בסיס")', cfg_afs)
day_formula_row(home_total_row, 'סה"כ בבית',
                lambda c: f'=COUNTIF({c}{sr}:{c}{er},"בית")', None)

# --- שורות דגל מוסתרות (שבת / חג) עבור מוני ההוגנות
for i, d in enumerate(DATES):
    col = FIRST_DATE_COL + i
    ws.cell(shabbat_flag_row, col, 1 if d.weekday() == 5 else 0)
    ws.cell(holiday_flag_row, col, 1 if d in HOLIDAYS else 0)
ws.cell(shabbat_flag_row, 1, "[דגל שבת]")
ws.cell(holiday_flag_row, 1, "[דגל חג]")
ws.row_dimensions[shabbat_flag_row].hidden = True
ws.row_dimensions[holiday_flag_row].hidden = True

# --- בלוק הגדרות (ספי מצבה - ניתנים לעריכה)
ws.cell(cfg_row - 1, 1, "הגדרות מצבה (ניתן לעריכה):").font = bold
for off, (lbl, val) in enumerate((
        ("מינימום בבסיס", MIN_BASE),
        ("מינימום נשקייה", MIN_NESHEK),
        ("מינימום אפסנאות", MIN_AFSANA))):
    ws.cell(cfg_row + off, 1, lbl).alignment = right
    vc = ws.cell(cfg_row + off, 2, val)
    vc.font = bold; vc.alignment = center; vc.fill = fill_yellow; vc.border = border

# --- רשימה נפתחת + עיצוב מותנה לסטטוסים
data_rng = f"{first_dl}{FIRST_SOLDIER_ROW}:{last_dl}{last_soldier_row}"
options = ",".join(s for s, _ in STATUSES)
dv = DataValidation(type="list", formula1=f'"{options}"', allow_blank=True)
ws.add_data_validation(dv); dv.add(data_rng)
for status, color in STATUSES:
    ws.conditional_formatting.add(data_rng, CellIsRule(
        operator="equal", formula=[f'"{status}"'],
        fill=PatternFill("solid", fgColor=color)))

# --- סולם צבעים על "סופ"ש בבית" (איתור חוסר איזון)
we_rng = f"{L(col_we_home)}{FIRST_SOLDIER_ROW}:{L(col_we_home)}{last_soldier_row}"
ws.conditional_formatting.add(we_rng, ColorScaleRule(
    start_type="min", start_color="C6EFCE",
    mid_type="percentile", mid_value=50, mid_color="FFEB9C",
    end_type="max", end_color="FFC7CE"))

# --- מידות וקיבוע
ws.column_dimensions["A"].width = 16
ws.column_dimensions["B"].width = 14
ws.column_dimensions["C"].width = 14
ws.row_dimensions[HEAD_ROW].height = 30
ws.freeze_panes = f"{first_dl}{FIRST_SOLDIER_ROW}"

# ---------------------------------------------------------------- מקרא
lg = wb.create_sheet("מקרא")
lg.sheet_view.rightToLeft = True
lg.column_dimensions["A"].width = 6
lg.column_dimensions["B"].width = 34
lg.cell(1, 2, "מקרא - שבצק יציאות").font = Font(bold=True, size=13)
rows = [(None, "כותרת תאריך:")]
rows += [(YELLOW, "שבת / ערב שבת"), (ORANGE, "חג")]
rows += [(None, "סטטוס תא:")]
rows += [(c, s) for s, c in STATUSES]
rows += [(None, "התראות:"), (ALERT_RED, "מתחת לסף מצבה (אדום אוטומטי)")]
r = 3
for fill, label in rows:
    if fill is None:
        lg.cell(r, 2, label).font = bold
    else:
        sw = lg.cell(r, 1); sw.fill = PatternFill("solid", fgColor=fill); sw.border = border
        lg.cell(r, 2, label).font = normal
    r += 1
lg.cell(r + 1, 2, "ספי המצבה נקבעים בגיליון השבצק בבלוק \"הגדרות מצבה\".").font = normal

OUT = "shavtzak_yetziot.xlsx"
wb.save(OUT)
print(f"נשמר: {OUT} | חיילים: {len(SOLDIERS)} | ימים: {n_dates} "
      f"({START_DATE:%d.%m.%y}-{END_DATE:%d.%m.%y}) | סטטוסים: {len(STATUSES)}")
