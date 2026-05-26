#!/usr/bin/env python3
"""מפיק תצוגות מקדימות (PNG) של השבצק - תמונה לכל חודש, עם הצבעים."""

from datetime import date, timedelta

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from bidi.algorithm import get_display

# --- נתונים (תואם build_roster.py)
START_DATE = date(2026, 6, 24)
END_DATE = date(2026, 9, 30)
HOLIDAYS = {
    date(2026, 9, 11), date(2026, 9, 12), date(2026, 9, 13),
    date(2026, 9, 20), date(2026, 9, 21),
    date(2026, 9, 25), date(2026, 9, 26),
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
HEB_DOW = {6: "א", 0: "ב", 1: "ג", 2: "ד", 3: "ה", 4: "ו", 5: "ש"}
HEB_MONTH = {6: "יוני", 7: "יולי", 8: "אוגוסט", 9: "ספטמבר"}

NAVY = "#1F4E78"; GRAY = "#D9E1F2"; YELLOW = "#FFFF00"
ORANGE = "#FFC000"; WHITE = "#FFFFFF"; ALERT = "#FF5050"
STATUS_COLORS = {
    "בסיס": "#BDD7EE", "בית": "#C6EFCE", "חופשה": "#A9D08E",
    "גימלים": "#FFC7CE", "קורס": "#B4A7D6", "ת״ש": "#F8CBAD",
}
MIN_BASE, MIN_NESHEK, MIN_AFSANA = 12, 2, 2


def demo_status(i, d):
    if d in HOLIDAYS:
        return "בית" if i % 3 != 0 else "בסיס"
    if d.weekday() == 5:
        return "בית" if i % 2 == 0 else "בסיס"
    if i == 6:
        return "חופשה"
    if i == 10:
        return "גימלים"
    if i == 13:
        return "קורס"
    if i == 18 and d.day % 2 == 0:
        return "ת״ש"
    return "בסיס"


def he(s):
    return get_display(str(s))


def day_color(d):
    if d in HOLIDAYS:
        return ORANGE
    if d.weekday() in (4, 5):
        return YELLOW
    return GRAY


def month_dates(m):
    out, d = [], START_DATE
    while d <= END_DATE:
        if d.month == m:
            out.append(d)
        d += timedelta(days=1)
    return out


def render_month(m, fname):
    days = month_dates(m)
    nrows = len(SOLDIERS) + 1            # כותרת + חיילים
    ncols = 2 + len(days)                # שם, תפקיד, ימים
    cw_name, cw_role, cw_day = 2.6, 1.7, 0.5
    table_w = cw_name + cw_role + cw_day * len(days)
    rh = 0.34
    fig_w = table_w + 0.3
    fig_h = rh * nrows + 0.8
    fig, ax = plt.subplots(figsize=(fig_w, fig_h))
    ax.set_xlim(0, table_w); ax.set_ylim(0, rh * nrows)
    ax.axis("off")
    # RTL: שם בצד ימין -> נצייר x מימין לשמאל
    x_name = table_w - cw_name
    x_role = x_name - cw_role

    def cell(x, y, w, h, text, bg, fg="#000000", bold=False, size=8):
        ax.add_patch(Rectangle((x, y), w, h, facecolor=bg,
                               edgecolor="#9AA7BD", linewidth=0.5))
        if text != "":
            ax.text(x + w / 2, y + h / 2, he(text), ha="center", va="center",
                    fontsize=size, color=fg,
                    fontweight="bold" if bold else "normal")

    top = rh * nrows
    # כותרת
    y = top - rh
    cell(x_name, y, cw_name, rh, "שם", NAVY, WHITE, True, 9)
    cell(x_role, y, cw_role, rh, "תפקיד", NAVY, WHITE, True, 9)
    for i, d in enumerate(days):
        x = x_role - (i + 1) * cw_day
        cell(x, y, cw_day, rh, f"{d.day}\n{HEB_DOW[d.weekday()]}",
             day_color(d), "#000000", True, 7)
    # חיילים
    for r, (name, role) in enumerate(SOLDIERS, start=1):
        y = top - rh * (r + 1)
        cell(x_name, y, cw_name, rh, name, "#FFFFFF", "#000000", True, 8)
        cell(x_role, y, cw_role, rh, role, "#F4F7FC", "#000000", False, 7)
        for i in range(len(days)):
            x = x_role - (i + 1) * cw_day
            cell(x, y, cw_day, rh, "", "#FFFFFF")

    ax.set_title(he(f"שבצק יציאות - קו הגנה סוריה  |  {HEB_MONTH[m]} 2026"),
                 fontsize=12, fontweight="bold", color=NAVY, pad=8)
    plt.tight_layout()
    fig.savefig(fname, dpi=140, bbox_inches="tight")
    plt.close(fig)
    print("נשמר:", fname)


def render_demo(fname):
    days = [date(2026, 9, d) for d in range(7, 22)]  # 7-21.9 (כולל חגים)
    roles = [r for _, r in SOLDIERS]
    total_rows = 3
    nrows = len(SOLDIERS) + 1 + total_rows
    cw_name, cw_role, cw_day = 2.6, 1.7, 0.62
    table_w = cw_name + cw_role + cw_day * len(days)
    rh = 0.34
    fig, ax = plt.subplots(figsize=(table_w + 0.3, rh * nrows + 0.9))
    ax.set_xlim(0, table_w); ax.set_ylim(0, rh * nrows); ax.axis("off")
    x_name = table_w - cw_name; x_role = x_name - cw_role
    top = rh * nrows

    def cell(x, y, w, text, bg, fg="#000000", bold=False, size=8):
        ax.add_patch(Rectangle((x, y), w, rh, facecolor=bg,
                               edgecolor="#9AA7BD", linewidth=0.5))
        if text != "":
            ax.text(x + w / 2, y + rh / 2, he(text), ha="center", va="center",
                    fontsize=size, color=fg, fontweight="bold" if bold else "normal")

    # כותרת
    y = top - rh
    cell(x_name, y, cw_name, "שם", NAVY, WHITE, True, 9)
    cell(x_role, y, cw_role, "תפקיד", NAVY, WHITE, True, 9)
    for i, d in enumerate(days):
        x = x_role - (i + 1) * cw_day
        cell(x, y, cw_day, f"{d.day}\n{HEB_DOW[d.weekday()]}", day_color(d), "#000000", True, 7)
    # חיילים
    for r, (name, role) in enumerate(SOLDIERS, start=1):
        y = top - rh * (r + 1)
        cell(x_name, y, cw_name, name, "#FFFFFF", "#000000", True, 8)
        cell(x_role, y, cw_role, role, "#F4F7FC", "#000000", False, 7)
        for i, d in enumerate(days):
            s = demo_status(r - 1, d)
            x = x_role - (i + 1) * cw_day
            cell(x, y, cw_day, s, STATUS_COLORS[s], "#000000", False, 6)
    # שורות מצבה
    labels = ['סה"כ בבסיס', "נשקייה בבסיס", "אפסנאות בבסיס"]
    mins = [MIN_BASE, MIN_NESHEK, MIN_AFSANA]
    for k, (label, mn) in enumerate(zip(labels, mins)):
        y = top - rh * (len(SOLDIERS) + 2 + k)
        cell(x_role, y, cw_role + cw_name, label, NAVY, WHITE, True, 8)
        for i, d in enumerate(days):
            if k == 0:
                cnt = sum(demo_status(j, d) == "בסיס" for j in range(len(SOLDIERS)))
            elif k == 1:
                cnt = sum(demo_status(j, d) == "בסיס" and "נשקייה" in roles[j] for j in range(len(SOLDIERS)))
            else:
                cnt = sum(demo_status(j, d) == "בסיס" and "אפסנאות" in roles[j] for j in range(len(SOLDIERS)))
            bg, fg = ("#FFFFFF", "#000000")
            if cnt < mn:
                bg, fg = ALERT, "#FFFFFF"
            x = x_role - (i + 1) * cw_day
            cell(x, y, cw_day, str(cnt), bg, fg, True, 8)

    ax.set_title(he("דוגמה להמחשה - שבצק יציאות ספטמבר 2026 (אדום = מתחת לסף מצבה)"),
                 fontsize=12, fontweight="bold", color=NAVY, pad=8)
    plt.tight_layout()
    fig.savefig(fname, dpi=140, bbox_inches="tight")
    plt.close(fig)
    print("נשמר:", fname)


if __name__ == "__main__":
    for m in (6, 7, 8, 9):
        render_month(m, f"preview_{m:02d}_2026.png")
    render_demo("preview_demo_2026.png")
