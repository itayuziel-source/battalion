#!/usr/bin/env python3
"""תצוגה מקדימה של 'תמצית למפקד' בדוח הספירות."""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch
from bidi.algorithm import get_display

from build_count_report import (DATA, COMPANIES, REPORT_DATE, cat_sums, comp_sums,
                                TOT, REC, STK)

NAVY = "#1F4E78"
BLUE2 = "#2E75B6"


def he(s):
    return get_display(str(s))


fig = plt.figure(figsize=(11, 8.2))
fig.patch.set_facecolor("white")
ax = fig.add_axes([0, 0, 1, 1]); ax.set_xlim(0, 11); ax.set_ylim(0, 8.2); ax.axis("off")

ax.add_patch(Rectangle((0, 7.6), 11, 0.6, facecolor=NAVY))
ax.text(5.5, 7.9, he(f"דוח ספירות ומלאי – נשקייה | {REPORT_DATE}"), ha="center",
        va="center", fontsize=15, fontweight="bold", color="white")

cards = [("סה\"כ אמצעים", f"{TOT:,}", "#D9E1F2"),
         ("חתום בקבלות", f"{REC:,}", "#C6EFCE"),
         ("במלאי (לא חתום)", f"{STK:,}", "#FFF2CC"),
         ("אחוז חתום", f"{REC/TOT:.0%}", "#D9E1F2")]
for i, (lab, val, color) in enumerate(cards):
    x = 10.7 - (i + 1) * 2.6
    ax.add_patch(FancyBboxPatch((x, 6.4), 2.4, 0.95, boxstyle="round,pad=0.03",
                                facecolor=color, edgecolor="#9AA7BD"))
    ax.text(x + 1.2, 7.12, he(lab), ha="center", fontsize=10, fontweight="bold", color="#44546A")
    ax.text(x + 1.2, 6.66, val, ha="center", fontsize=17, fontweight="bold", color=NAVY)

# מבט לפי קטגוריה - פסים
ax.text(10.6, 5.9, he("מבט לפי קטגוריה – % חתום"), ha="right", fontsize=12,
        fontweight="bold", color=NAVY)
cats = cat_sums()
for i, (cat, tot, rec, stk) in enumerate(cats):
    y = 5.35 - i * 0.5
    pct = rec / tot if tot else 0
    ax.text(10.6, y + 0.12, he(f"{cat} ({rec}/{tot})"), ha="right", fontsize=9.5)
    ax.add_patch(Rectangle((4.6, y), 4.4, 0.24, facecolor="#E7ECF4"))
    ax.add_patch(Rectangle((4.6 + 4.4 * (1 - pct), y), 4.4 * pct, 0.24, facecolor=BLUE2))
    ax.text(4.45, y + 0.12, f"{pct:.0%}", ha="right", va="center", fontsize=9.5,
            fontweight="bold", color=NAVY)

# מימוש לפי פלוגה
ax.text(3.4, 5.9, he("מימוש הקצאות לפי פלוגה"), ha="right", fontsize=12,
        fontweight="bold", color=NAVY)
for i, (comp, alloc, signed, free) in enumerate(comp_sums()):
    y = 5.35 - i * 0.5
    pct = signed / alloc if alloc else 0
    color = "#C6EFCE" if pct >= 0.9 else ("#FFF2CC" if pct >= 0.75 else "#FFC7CE")
    ax.text(3.4, y + 0.12, he(comp), ha="right", fontsize=9.5)
    ax.add_patch(Rectangle((0.4, y), 1.9, 0.24, facecolor="#E7ECF4"))
    ax.add_patch(Rectangle((0.4 + 1.9 * (1 - pct), y), 1.9 * pct, 0.24, facecolor=BLUE2))
    ax.add_patch(Rectangle((2.35, y - 0.02), 0.62, 0.3, facecolor=color, edgecolor="#9AA7BD", lw=0.5))
    ax.text(2.66, y + 0.13, f"{pct:.0%}", ha="center", va="center", fontsize=9, fontweight="bold")

# דגשים
ax.add_patch(Rectangle((0.3, 0.25), 10.4, 2.45, facecolor="#FBF3F3", edgecolor="#D8B4B4"))
ax.text(10.5, 2.42, he("דגשים"), ha="right", fontsize=12, fontweight="bold", color="#9C0006")
highlights = [
    'לפלס"ם מוקצים 70 רובי M4A1 ללא הקצאת כוונות איוטק כלל',
    "M16‏: 132 מתוך 172 (76%) במלאי ולא חתומים",
    "חד עיני שחע: 26 מתוך 47 (55%) במלאי | כוונת השלכה מתקדמת: 23 מתוך 29 (79%) במלאי",
    "ציין לייזר לנגב: 14 מתוך 25 (56%) במלאי",
    "מימוש נמוך ביותר: פלוגה א – 71% (67 פריטים מוקצים וטרם נחתמו)",
    'סה"כ 232 פריטים מוקצים לפלוגות וטרם נחתמו – פירוט בגיליון "פילוח פלוגתי"',
]
for i, t in enumerate(highlights):
    ax.text(10.3, 2.08 - i * 0.32, he("⚠ " + t), ha="right", fontsize=9.5, color="#7A1F1F")

fig.savefig("count_report_preview.png", dpi=140, bbox_inches="tight")
print("נשמר: count_report_preview.png")
