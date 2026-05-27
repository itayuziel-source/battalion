#!/usr/bin/env python3
"""תמחור פאנלים: עלות לוחות לפי הפלטה הזולה ביותר + 30% רווח."""

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter as L

from sheet_calc import PANELS, PRICES
from build_cut_plan import best_plate, plates_for, compute_plan

MARKUP = 1.30

# תמחור עצמאי לכל סוג פאנל
rows = []
total_cost = 0
total_sell = 0
for (w, h, q) in PANELS:
    plate = best_plate(w, h, q)
    n = plates_for(w, h, q, plate)
    cost = n * PRICES[plate]
    unit_cost = cost / q
    unit_sell = round(unit_cost * MARKUP)
    line = unit_sell * q
    total_cost += cost
    total_sell += line
    rows.append((f"{w}x{h}", q, f"{plate[0]}x{plate[1]}", n,
                 cost, round(unit_cost, 1), unit_sell, line))

# עלות חומר בפועל (אריזה משותפת)
_, _, mix, _, _ = compute_plan()
opt_cost = sum(c * PRICES[s] for s, c in mix.items())

print("תמחור פאנלים (+30% רווח):")
for r in rows:
    print(f"  {r[0]:<12} x{r[1]:<3} {r[2]:<10} {r[3]:>3} לוחות  "
          f"עלות {r[4]:>5}  יח׳ {r[6]:>5}₪  סה״כ {r[7]:>6}₪")
print(f"\nעלות חומר (תמחור עצמאי): {total_cost:,} ₪")
print(f"עלות חומר בפועל (אריזה משותפת): {opt_cost:,} ₪")
print(f"סה״כ הצעת מחיר: {total_sell:,} ₪")
print(f"רווח מעל עלות בפועל: {total_sell - opt_cost:,} ₪ "
      f"({(total_sell/opt_cost-1)*100:.0f}%)")

# ---------------------------------------------------------------- אקסל
navy = PatternFill("solid", fgColor="1F4E78")
gray = PatternFill("solid", fgColor="D9E1F2")
green = PatternFill("solid", fgColor="C6EFCE")
yellow = PatternFill("solid", fgColor="FFF2CC")
wb_font = Font(bold=True, color="FFFFFF", size=11)
bold = Font(bold=True)
center = Alignment(horizontal="center", vertical="center", wrap_text=True)
right = Alignment(horizontal="right", vertical="center")
border = Border(*[Side(style="thin", color="B0B0B0")] * 4)
NIS = '#,##0" ₪"'

wb = Workbook()
ws = wb.active
ws.title = "תמחור"
ws.sheet_view.rightToLeft = True

heads = ["פאנל (מ״מ)", "כמות", "פלטה", "לוחות", "עלות חומר",
         "עלות ליחידה", "מחיר מכירה ליחידה", "סה״כ מכירה"]
widths = [16, 8, 12, 8, 12, 12, 16, 14]
ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=len(heads))
t = ws.cell(1, 1, "הצעת מחיר - פאנלים (כולל 30% רווח)")
t.fill = navy; t.font = Font(bold=True, color="FFFFFF", size=14); t.alignment = center
for c, (lab, w) in enumerate(zip(heads, widths), start=1):
    cell = ws.cell(2, c, lab)
    cell.fill = navy; cell.font = wb_font; cell.alignment = center; cell.border = border
    ws.column_dimensions[L(c)].width = w

r = 3
for (name, q, plate, n, cost, uc, us, line) in rows:
    vals = [name, q, plate, n, cost, uc, us, line]
    for c, v in enumerate(vals, start=1):
        cell = ws.cell(r, c, v); cell.alignment = center; cell.border = border
        if c in (5, 6):
            cell.number_format = NIS
        if c == 7:
            cell.number_format = NIS; cell.font = bold; cell.fill = yellow
        if c == 8:
            cell.number_format = NIS; cell.font = bold
    r += 1

# שורת סה"כ
ws.cell(r, 1, "סה״כ").font = bold
ws.merge_cells(start_row=r, start_column=1, end_row=r, end_column=4)
ws.cell(r, 1).alignment = center; ws.cell(r, 1).fill = gray
tc = ws.cell(r, 5, total_cost); tc.number_format = NIS; tc.font = bold; tc.fill = gray; tc.alignment = center
ws.cell(r, 6).fill = gray; ws.cell(r, 7).fill = gray
ts = ws.cell(r, 8, total_sell); ts.number_format = NIS; ts.font = bold; ts.fill = green; ts.alignment = center

# סיכום
r += 2
summary = [
    ("עלות חומר (תמחור עצמאי):", total_cost, None),
    ("עלות חומר בפועל (אריזה משותפת):", opt_cost, None),
    ("סה״כ הצעת מחיר (כולל 30%):", total_sell, green),
    ("רווח גולמי מעל עלות בפועל:", total_sell - opt_cost, yellow),
]
for k, (lab, val, fill) in enumerate(summary):
    lc = ws.cell(r + k, 1, lab); lc.font = bold; lc.alignment = right
    ws.merge_cells(start_row=r + k, start_column=1, end_row=r + k, end_column=4)
    vc = ws.cell(r + k, 5, val); vc.number_format = NIS; vc.font = bold; vc.alignment = center
    if fill:
        vc.fill = fill

OUT = "pricing.xlsx"
wb.save(OUT)
print(f"\nנשמר: {OUT}")
