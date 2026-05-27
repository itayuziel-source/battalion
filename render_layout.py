#!/usr/bin/env python3
"""מצייר פריסת חיתוך לכל פלטה (פריסות זהות מקובצות) - PDF + PNG."""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.patches import Rectangle
from bidi.algorithm import get_display

from build_cut_plan import compute_plan

all_plates, assignment, mix, total_area, waste = compute_plan()


def he(s):
    return get_display(str(s))


def ptype(label):
    return label.split(" #")[0]


def signature(p):
    pieces = tuple(sorted((x, y, w, h, ptype(lbl)) for (lbl, x, y, w, h) in p["pieces"]))
    return (p["plate"], pieces)


groups = {}
for p in all_plates:
    groups.setdefault(signature(p), []).append(p)
unique = sorted(groups.items(), key=lambda kv: (-kv[0][0][0] * kv[0][0][1], -len(kv[1])))

ptypes = sorted({ptype(lbl) for p in all_plates for (lbl, *_) in p["pieces"]})
cmap = plt.get_cmap("tab20")
colors = {pt: cmap(i % 20) for i, pt in enumerate(ptypes)}


def draw(ax, plate, pieces):
    (W, H) = plate
    ax.set_xlim(-W * 0.04, W * 1.04)
    ax.set_ylim(-H * 0.04, H * 1.04)
    ax.set_aspect("equal")
    ax.invert_yaxis()
    ax.add_patch(Rectangle((0, 0), W, H, fill=False, lw=2.5, edgecolor="black"))
    for (lbl, x, y, w, h) in pieces:
        pt = ptype(lbl)
        ax.add_patch(Rectangle((x, y), w, h, facecolor=colors[pt],
                               edgecolor="black", lw=1, alpha=0.85))
        fs = max(5, min(9, int(min(w, h) / 90)))
        ax.text(x + w / 2, y + h / 2, he(f"{pt}\n{w}×{h}"),
                ha="center", va="center", fontsize=fs)
    ax.set_xticks([]); ax.set_yticks([])


def render():
    saved = []
    with PdfPages("cut_layout.pdf") as pdf:
        for i, (sig, plates) in enumerate(unique, start=1):
            (W, H), _ = sig
            rep = plates[0]
            util = sum(w * h for (_, _, _, w, h) in rep["pieces"]) / (W * H)
            fig, ax = plt.subplots(figsize=(W / 300 + 1.2, H / 300 + 1.4))
            draw(ax, (W, H), rep["pieces"])
            ax.set_title(he(f"פלטה {W}×{H} מ״מ  |  {len(plates)} פלטות זהות  |  "
                            f"ניצול {util*100:.0f}%"),
                         fontsize=11, fontweight="bold")
            plt.tight_layout()
            pdf.savefig(fig)
            if i <= 6:
                fn = f"layout_{i:02d}.png"
                fig.savefig(fn, dpi=130, bbox_inches="tight")
                saved.append(fn)
            plt.close(fig)
    print(f"נשמר: cut_layout.pdf | פריסות ייחודיות: {len(unique)} | "
          f"סה״כ פלטות: {len(all_plates)}")
    return saved


if __name__ == "__main__":
    render()
