# -*- coding: utf-8 -*-
"""תצוגה מקדימה (PNG) של הדשבורד והטבלה הראשית."""
import openpyxl, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Rectangle
from matplotlib import font_manager as fm
from bidi.algorithm import get_display

FONT = "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"
FONTB = "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
fm.fontManager.addfont(FONT); fm.fontManager.addfont(FONTB)
plt.rcParams["font.family"] = "Liberation Sans"

def H(s):
    return get_display(str(s))

NAVY="#1F3864"; BLUE="#2E5496"; STEEL="#8EAADB"; RED="#C00000"; REDBG="#FFC7CE"
AMBER="#BF8F00"; AMBERBG="#FFEB9C"; GREEN="#375623"; GREENBG="#C6EFCE"
GREY="#808080"; GREYBG="#E7E6E6"; ZEBRA="#F2F5FA"

# ---- recompute data (תואם build_otzma) ----
from build_otzma import records, by_cat, order, short, surp, ok, nodata, tot_short, UNIT_COLS  # noqa

# ============ דשבורד ============
fig, ax = plt.subplots(figsize=(13, 8.5)); ax.axis("off")
ax.set_xlim(0,100); ax.set_ylim(0,100); ax.invert_yaxis()
ax.add_patch(Rectangle((0,0),100,8, color=NAVY))
ax.text(50,4, H("עוצמה גדודית — לוח בקרה"), color="white", fontsize=22, fontweight="bold", ha="center", va="center")
ax.text(50,10.5, H("צבעים: אדום=חוסר · כתום=עודף · ירוק=תקין · אפור=חסר נתון מצאי"), color="#555", fontsize=10, ha="center")

cards=[("סך פריטים",len(records),STEEL),("חוסרים",len(short),RED),("עודפים",len(surp),AMBER),
       ("תקין",len(ok),GREEN),("ללא מצאי",len(nodata),GREY),("יח' חסרות",int(tot_short),RED)]
w=15; gap=1; x=2
for title,val,col in cards:
    ax.add_patch(FancyBboxPatch((x,14),w,11, boxstyle="round,pad=0.2,rounding_size=0.6", color=col, ec="none"))
    ax.text(x+w/2,17, H(title), color="white", fontsize=11, fontweight="bold", ha="center", va="center")
    ax.text(x+w/2,22, str(val), color="white", fontsize=22, fontweight="bold", ha="center", va="center")
    x+=w+gap

def mini_table(ax, x0, title, rows, headcol, valcol):
    ax.add_patch(Rectangle((x0,29),46,4, color=headcol))
    ax.text(x0+45,31, H(title), color="white", fontsize=12, fontweight="bold", ha="right", va="center")
    cols=[("אמצעי",30),("סה\"כ",10),("מצאי",10),("פער",6)]
    cx=x0
    for ct,cw in cols:
        ax.add_patch(Rectangle((cx,33),cw,3.4, color=NAVY))
        ax.text(cx+cw/2 if ct!="אמצעי" else cx+cw-1,34.7, H(ct), color="white", fontsize=9, fontweight="bold",
                ha="center" if ct!="אמצעי" else "right", va="center")
        cx+=cw
    y=36.4
    for rec in rows[:11]:
        cx=x0; vals=[(rec["name"],30,"r"),(rec["סהכ"],10,"c"),(rec["מצאי"],10,"c"),(rec["פער"],6,"c")]
        for v,cw,al in vals:
            bg="white"
            if al=="c" and cw==6:
                bg=valcol
            ax.add_patch(Rectangle((cx,y),cw,3.0, facecolor=bg, edgecolor="#ccc", lw=0.4))
            tx=cx+cw-0.8 if al=="r" else cx+cw/2
            ax.text(tx,y+1.5, H(v), fontsize=8.3, ha="right" if al=="r" else "center", va="center",
                    fontweight="bold" if cw==6 else "normal", color=(RED if valcol==REDBG and cw==6 else AMBER if cw==6 else "#222"))
            cx+=cw
        y+=3.0

mini_table(ax, 2, "🔴 חוסרים קריטיים מובילים", sorted(short,key=lambda r:r["פער"]), RED, REDBG)
mini_table(ax, 52, "🟠 עודפים מובילים", sorted(surp,key=lambda r:-r["פער"]), AMBER, AMBERBG)
plt.tight_layout(); plt.savefig("preview_otzma_dashboard.png", dpi=130, bbox_inches="tight"); plt.close()

# ============ טבלה ראשית (קטעי) ============
unit_names=[u for u,_ in UNIT_COLS]
HEAD=["אמצעי"]+unit_names+["מלאי","סה\"כ","מצאי","פער","סטטוס"]
def st_of(rec):
    if rec["פער"] is None: return ("אין מצאי",GREY,GREYBG)
    if rec["פער"]<0: return ("חוסר",RED,REDBG)
    if rec["פער"]>0: return ("עודף",AMBER,AMBERBG)
    return ("תקין",GREEN,GREENBG)

# בנה רשימת שורות: כותרת קטגוריה + פריטים
disp=[]
for cat in order:
    items=by_cat[cat]
    if not items: continue
    disp.append(("CAT",cat,len(items)))
    for rec in items:
        disp.append(("ROW",rec))
nrows=len(disp)+1
colw=[3.4]+[1.0]*len(unit_names)+[1.0,1.0,1.0,1.0,1.6]
totw=sum(colw)
rowh=0.42
fig,ax=plt.subplots(figsize=(totw*1.05, (nrows*rowh)+1.2)); ax.axis("off")
ax.set_xlim(0,totw); ax.set_ylim(0,nrows*rowh+1); ax.invert_yaxis()
# כותרת על
ax.add_patch(Rectangle((0,0),totw,0.6, color=NAVY))
ax.text(totw/2,0.3, H("טבלת עוצמה גדודית — גדוד 28"), color="white", fontsize=13, fontweight="bold", ha="center", va="center")
y=0.6
# header
cx=0
for h,cw in zip(HEAD,colw):
    ax.add_patch(Rectangle((cx,y),cw,rowh, color=NAVY))
    ax.text(cx+cw/2 if h!="אמצעי" else cx+cw-0.1,y+rowh/2, H(h), color="white", fontsize=8.5, fontweight="bold",
            ha="center" if h!="אמצעי" else "right", va="center")
    cx+=cw
y+=rowh
for item in disp:
    if item[0]=="CAT":
        ax.add_patch(Rectangle((0,y),totw,rowh, color=BLUE))
        ax.text(totw-0.1,y+rowh/2, H(f"▼  {item[1]}  ({item[2]})"), color="white", fontsize=9, fontweight="bold", ha="right", va="center")
        y+=rowh; continue
    rec=item[1]; sttxt,fcol,bcol=st_of(rec)
    vals=[rec["name"]]+[rec[u] for u in unit_names]+[rec["מלאי"],rec["סהכ"],rec["מצאי"],rec["פער"],sttxt]
    cx=0
    for i,(v,cw) in enumerate(zip(vals,colw)):
        bg="white"
        if i==len(HEAD)-1: bg=bcol
        elif i==len(HEAD)-2 and rec["פער"] not in (None,0): bg=bcol
        ax.add_patch(Rectangle((cx,y),cw,rowh, facecolor=bg, edgecolor="#d9d9d9", lw=0.3))
        txt="" if v in (None,"") else v
        isname=(i==0)
        col=fcol if (i>=len(HEAD)-2 and rec["פער"] not in (None,0)) else ("#222")
        ax.text(cx+cw-0.08 if isname else cx+cw/2, y+rowh/2, H(txt), fontsize=7.6,
                ha="right" if isname else "center", va="center",
                fontweight="bold" if (isname or i>=len(HEAD)-2) else "normal", color=col)
        cx+=cw
    y+=rowh
plt.tight_layout(); plt.savefig("preview_otzma_main.png", dpi=120, bbox_inches="tight"); plt.close()
print("saved previews")
