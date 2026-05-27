#!/usr/bin/env python3
"""תצוגה מקדימה של גיליון 'צי הרחפנים' + רצועת מחוונים."""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from bidi.algorithm import get_display

from build_drone_mgmt import FLEET, STATUS_FILL

TZ = {"EVO": 7, "AVATA": 6}
NAVY = "#1F4E78"


def he(s):
    return get_display(str(s))


cols = [("מס׳", 0.5), ("צ׳", 1.3), ("סוג", 1.0), ("ערכה", 1.0), ("סטטוס", 1.2),
        ("מחזיק", 1.8), ("השאלה", 1.4), ("יעד", 1.4), ("מצב", 1.0),
        ("צ׳ נדרשים", 1.2), ("הערות", 2.6)]
table_w = sum(w for _, w in cols)
rh = 0.5
nrows = len(FLEET) + 1
fig, ax = plt.subplots(figsize=(table_w + 0.4, rh * nrows + 1.4))
ax.set_xlim(0, table_w)
ax.set_ylim(0, rh * nrows + 0.9)
ax.axis("off")

# מיקומי עמודות מימין לשמאל
xs, x = [], table_w
for _, w in cols:
    x -= w
    xs.append(x)


def cell(x, y, w, text, bg, fg="#000000", bold=False, size=9):
    ax.add_patch(Rectangle((x, y), w, rh, facecolor=bg, edgecolor="#9AA7BD", lw=0.6))
    if text not in ("", None):
        ax.text(x + w / 2, y + rh / 2, he(text), ha="center", va="center",
                fontsize=size, color=fg, fontweight="bold" if bold else "normal")


top = rh * nrows
# כותרת
y = top - rh
for (lab, w), xx in zip(cols, xs):
    cell(xx, y, w, lab, NAVY, "#FFFFFF", True, 9)
# שורות
for i, (serial, typ, kit, status, holder, d1, d2, cond, note) in enumerate(FLEET, start=1):
    y = top - rh * (i + 1)
    sc = "#" + STATUS_FILL[status]
    cc = "#FFC7CE" if cond == "תקול" else "#FFFFFF"
    vals = [str(i), serial, typ, kit, status, holder,
            d1[8:] + "/" + d1[5:7] if d1 else "", d2[8:] + "/" + d2[5:7] if d2 else "",
            cond, str(TZ.get(typ, "")), note]
    bgs = ["#FFFFFF", "#F4F7FC", "#FFFFFF", "#FFFFFF", sc, "#FFFFFF",
           "#FFFFFF", "#FFFFFF", cc, "#FFFFFF", "#FFFFFF"]
    for (lab, w), xx, v, bg in zip(cols, xs, vals, bgs):
        cell(xx, y, w, v, bg, size=8, bold=(lab in ("צ׳", "סטטוס")))

# רצועת מחוונים
total = len(FLEET)
evo = sum(1 for r in FLEET if r[1] == "EVO")
avata = total - evo
st = {s: sum(1 for r in FLEET if r[3] == s) for s in STATUS_FILL}
faulty = sum(1 for r in FLEET if r[7] == "תקול")
kpi = (f"סה\"כ {total}  |  EVO {evo} / AVATA {avata}  |  במחסן {st['במחסן']}  "
       f"הושאל {st['הושאל']}  בתיקון {st['בתיקון']}  מושבת {st['מושבת']}  |  "
       f"תקולים {faulty}  |  באיחור 1")
ax.text(table_w / 2, top + 0.45, he(kpi), ha="center", va="center",
        fontsize=11, fontweight="bold", color=NAVY)
ax.set_title(he("מערכת ניהול רחפנים – גיליון 'צי הרחפנים' (דוגמה)"),
             fontsize=13, fontweight="bold", color=NAVY, pad=10)
plt.tight_layout()
fig.savefig("drone_preview.png", dpi=140, bbox_inches="tight")
print("נשמר: drone_preview.png")
