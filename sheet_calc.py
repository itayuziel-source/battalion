#!/usr/bin/env python3
"""מחשבון לוחות פח (nesting) - כמה לוחות צריך עם הכי פחות פחת.

מודל: כל פאנל נחתך לחתיכות בגודל לוח לכל היותר (תפרים מותרים),
ואז כל החתיכות נארזות ללוחות סטנדרטיים באמצעות MaxRects (Best Short
Side Fit) עם סיבוב חופשי - כך ששאריות מנוצלות בין פאנלים.
ללא קרף/חפיפה (אפשר להוסיף לפי הצורך).
"""

import math

# (אורך, רוחב, כמות) במ"מ
PANELS = [
    (6160, 1240, 6),
    (6160, 1200, 3),
    (1240, 1200, 6),
    (9060, 800, 3),
    (9060, 940, 6),
    (940, 800, 6),
    (5330, 780, 6),
    (5330, 640, 12),
    (780, 640, 12),
]

# מידות לוח במלאי (מ"מ) - לוקובונד לבן 28021
STOCKS = [(1000, 2000), (1000, 3000), (1220, 2440), (1500, 3000)]


def split_panel(w, h, sa, sb):
    """מחלק פאנל w×h לחתיכות <= לוח, בכיוון שממזער מספר חתיכות."""
    def grid(a, b):
        nx, ny = math.ceil(w / a), math.ceil(h / b)
        pieces = []
        for ix in range(nx):
            pw = a if ix < nx - 1 else w - (nx - 1) * a
            for iy in range(ny):
                ph = b if iy < ny - 1 else h - (ny - 1) * b
                pieces.append((pw, ph))
        return pieces
    g1, g2 = grid(sa, sb), grid(sb, sa)
    return g1 if len(g1) <= len(g2) else g2


class MaxRectsBin:
    def __init__(self, W, H):
        self.W, self.H = W, H
        self.free = [(0, 0, W, H)]
        self.placed = []

    def insert(self, w, h):
        best = None  # (short_side, long_side, x, y, w, h)
        for (fx, fy, fw, fh) in self.free:
            for (rw, rh) in ((w, h), (h, w)):
                if rw <= fw and rh <= fh:
                    leftover = (abs(fw - rw), abs(fh - rh))
                    score = (min(leftover), max(leftover))
                    if best is None or score < best[0]:
                        best = (score, fx, fy, rw, rh)
        if best is None:
            return None
        _, x, y, rw, rh = best
        placed = (x, y, rw, rh)
        new_free = []
        for fr in self.free:
            new_free.extend(self._split(fr, placed))
        self.free = self._prune(new_free)
        self.placed.append(placed)
        return placed

    @staticmethod
    def _split(fr, used):
        fx, fy, fw, fh = fr
        ux, uy, uw, uh = used
        if ux >= fx + fw or ux + uw <= fx or uy >= fy + fh or uy + uh <= fy:
            return [fr]
        out = []
        if uy > fy:
            out.append((fx, fy, fw, uy - fy))
        if uy + uh < fy + fh:
            out.append((fx, uy + uh, fw, fy + fh - (uy + uh)))
        if ux > fx:
            out.append((fx, fy, ux - fx, fh))
        if ux + uw < fx + fw:
            out.append((ux + uw, fy, fx + fw - (ux + uw), fh))
        return out

    @staticmethod
    def _prune(rects):
        out = []
        for i, a in enumerate(rects):
            if a[2] <= 0 or a[3] <= 0:
                continue
            ax, ay, aw, ah = a
            contained = False
            for j, b in enumerate(rects):
                if i == j or b[2] <= 0 or b[3] <= 0:
                    continue
                bx, by, bw, bh = b
                if ax >= bx and ay >= by and ax + aw <= bx + bw and ay + ah <= by + bh:
                    if not (a == b and j < i):
                        contained = True
                        break
            if not contained:
                out.append(a)
        return out


def pack(pieces, W, H):
    pieces = sorted(pieces, key=lambda p: -(p[0] * p[1]))  # שטח יורד
    bins = []
    for (w, h) in pieces:
        if not any(b.insert(w, h) for b in bins):
            b = MaxRectsBin(W, H)
            b.insert(w, h)
            bins.append(b)
    verify(bins)
    return len(bins)


def verify(bins):
    """בדיקת תקינות: אין חפיפות ואין חריגה מגבולות הלוח."""
    for b in bins:
        for i, (x, y, w, h) in enumerate(b.placed):
            assert 0 <= x and 0 <= y and x + w <= b.W + 1e-6 and y + h <= b.H + 1e-6, "חריגה"
            for j in range(i + 1, len(b.placed)):
                x2, y2, w2, h2 = b.placed[j]
                if not (x + w <= x2 or x2 + w2 <= x or y + h <= y2 or y2 + h2 <= y):
                    raise AssertionError("חפיפה בין חתיכות")


def run():
    req_area = sum(w * h * q for w, h, q in PANELS)
    print(f"שטח נדרש כולל: {req_area/1e6:.2f} מ״ר\n")
    print(f"{'לוח (מ״מ)':<16}{'לוחות':>8}{'שטח לוחות':>12}{'פחת':>8}")
    print("-" * 46)
    results = []
    for (sw, sh) in STOCKS:
        pieces = []
        for (w, h, q) in PANELS:
            sub = split_panel(w, h, sw, sh)
            pieces.extend(sub * q)
        n = pack(pieces, sw, sh)
        sheet_area = sw * sh
        total_area = n * sheet_area
        waste = 1 - req_area / total_area
        results.append((sw, sh, n, total_area, waste))
        print(f"{sw}x{sh:<11}{n:>8}{total_area/1e6:>10.2f} מ״ר{waste*100:>6.0f}%")
    best = min(results, key=lambda r: r[4])
    print(f"\nהכי פחות פחת: {best[0]}x{best[1]} -> {best[2]} לוחות, פחת {best[4]*100:.0f}%")


if __name__ == "__main__":
    run()
