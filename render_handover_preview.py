#!/usr/bin/env python3
"""תצוגה מקדימה של גיליון 'רשימת ציוד' בטופס העברת הגזרה."""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from bidi.algorithm import get_display

from build_handover import DEMO, COND_FILL

NAVY = "#1F4E78"


def he(s):
    return get_display(str(s))


cols = [("מס׳", 0.5), ("בית / מוצב", 1.1), ("קטגוריה", 1.6), ("שם הפריט", 2.2),
        ("פריט צ׳?", 0.9), ("מספר צ׳", 1.0), ("מקור", 1.0), ("כמות נמסרת", 1.0),
        ("מצב", 1.1), ("נבדק (קולט)", 1.1), ("פער", 0.6), ("הערות", 2.0)]
table_w = sum(w for _, w in cols)
rh = 0.5
# הדגמת בדיקת הקולט: כמות שנבדקה ופער
CHECKED = {0: 2, 1: 3, 2: 12}
nrows = len(DEMO) + 1
fig, ax = plt.subplots(figsize=(table_w + 0.4, rh * nrows + 1.6))
ax.set_xlim(0, table_w)
ax.set_ylim(0, rh * nrows + 1.0)
ax.axis("off")

xs, x = [], table_w
for _, w in cols:
    x -= w
    xs.append(x)


def cell(x, y, w, text, bg, fg="#000000", bold=False, size=8):
    ax.add_patch(Rectangle((x, y), w, rh, facecolor=bg, edgecolor="#9AA7BD", lw=0.6))
    if text not in ("", None):
        ax.text(x + w / 2, y + rh / 2, he(text), ha="center", va="center",
                fontsize=size, color=fg, fontweight="bold" if bold else "normal")


top = rh * nrows
y = top - rh
for (lab, w), xx in zip(cols, xs):
    cell(xx, y, w, lab, NAVY, "#FFFFFF", True, 8)
for i, (house, cat, item, tz, tznum, src, qty, cond) in enumerate(DEMO):
    y = top - rh * (i + 2)
    checked = CHECKED.get(i, "")
    gap = (qty - checked) if checked != "" else ""
    gap_bg = "#FFFFFF" if gap == "" else ("#C6EFCE" if gap == 0 else "#FFC7CE")
    tz_bg = "#FFF2CC" if tz == "כן" else "#FFFFFF"
    cond_bg = "#" + COND_FILL[cond]
    vals = [str(i + 1), house, cat, item, tz, tznum, src, str(qty), cond,
            str(checked), str(gap), ""]
    bgs = ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#F4F7FC", tz_bg, "#FFFFFF",
           "#FFFFFF", "#FFFFFF", cond_bg, "#FFFFFF", gap_bg, "#FFFFFF"]
    for (lab, w), xx, v, bg in zip(cols, xs, vals, bgs):
        cell(xx, y, w, v, bg, bold=(lab in ("פער", "מצב")))

kpi = "הגדוד המוסר ממלא עמודות בית→מצב  |  הגדוד הקולט ממלא 'נבדק'  |  הפער מחושב לבד"
ax.text(table_w / 2, top + 0.5, he(kpi), ha="center", va="center",
        fontsize=10, fontweight="bold", color=NAVY)
ax.set_title(he("טופס העברת גזרה – גיליון 'רשימת ציוד' (דוגמה)"),
             fontsize=13, fontweight="bold", color=NAVY, pad=12)
plt.tight_layout()
fig.savefig("handover_preview.png", dpi=140, bbox_inches="tight")
print("נשמר: handover_preview.png")
