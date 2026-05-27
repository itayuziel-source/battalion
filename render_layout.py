#!/usr/bin/env python3
"""מצייר פריסת חיתוך לכל פלטה (פריסות זהות מקובצות) - PDF + PNG.

כל חתיכה מסומנת במספר (תואם לעמודת 'מס׳ חתיכה' באקסל), וכל פריסה
מקבלת מספר 'פריסה' התואם לעמודת 'פריסה' באקסל.
"""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.patches import Rectangle
from bidi.algorithm import get_display

from build_cut_plan import compute_plan, annotate_layouts, ptype

all_plates, assignment, mix, total_area, waste = compute_plan()
uniques = annotate_layouts(all_plates)


def he(s):
    return get_display(str(s))


ptypes = sorted({ptype(lbl) for p in all_plates for (lbl, *_) in p["pieces"]})
cmap = plt.get_cmap("tab20")
colors = {pt: cmap(i % 20) for i, pt in enumerate(ptypes)}


def draw(ax, plate, numbered):
    (W, H) = plate
    ax.set_xlim(-W * 0.04, W * 1.04)
    ax.set_ylim(-H * 0.04, H * 1.04)
    ax.set_aspect("equal")
    ax.invert_yaxis()
    ax.add_patch(Rectangle((0, 0), W, H, fill=False, lw=2.5, edgecolor="black"))
    for (num, lbl, x, y, w, h) in numbered:
        ax.add_patch(Rectangle((x, y), w, h, facecolor=colors[ptype(lbl)],
                               edgecolor="black", lw=1, alpha=0.85))
        cx, cy = x + w / 2, y + h / 2
        ax.text(cx, cy, str(num), ha="center", va="center",
                fontsize=max(8, min(16, int(min(w, h) / 70))), fontweight="bold")
        fs = max(5, min(8, int(min(w, h) / 110)))
        ax.text(cx, cy + max(w, h) * 0.045, he(f"{ptype(lbl)}\n{w}×{h}"),
                ha="center", va="top", fontsize=fs)
    ax.set_xticks([]); ax.set_yticks([])


def render():
    saved = []
    with PdfPages("cut_layout.pdf") as pdf:
        for u in uniques:
            W, H = u["plate"]
            util = sum(w * h for (_, _, _, _, w, h) in u["pieces"]) / (W * H)
            fig, ax = plt.subplots(figsize=(W / 300 + 1.2, H / 300 + 1.4))
            draw(ax, (W, H), u["pieces"])
            ax.set_title(he(f"פריסה {u['id']}  |  פלטה {W}×{H} מ״מ  |  "
                            f"{u['count']} פלטות  |  ניצול {util*100:.0f}%"),
                         fontsize=11, fontweight="bold")
            plt.tight_layout()
            pdf.savefig(fig)
            if u["id"] <= 6:
                fn = f"layout_{u['id']:02d}.png"
                fig.savefig(fn, dpi=130, bbox_inches="tight")
                saved.append(fn)
            plt.close(fig)
    print(f"נשמר: cut_layout.pdf | פריסות ייחודיות: {len(uniques)} | "
          f"סה״כ פלטות: {len(all_plates)}")
    return saved


if __name__ == "__main__":
    render()
