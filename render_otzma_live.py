# -*- coding: utf-8 -*-
"""תצוגה מקדימה (PNG) של קובץ הניהול החי — מדמה את מה ש-Excel יחשב."""
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, FancyBboxPatch
from matplotlib import font_manager as fm
from bidi.algorithm import get_display
from build_otzma_live import records, UNIT_NAMES, CAT_NAMES

for f in ["/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
          "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]:
    fm.fontManager.addfont(f)
plt.rcParams["font.family"]="Liberation Sans"
def H(s): return get_display("" if s is None else str(s))
NAVY="#1F3864"; BLUE="#2E5496"; STEEL="#8EAADB"; RED="#C00000"; REDBG="#FFC7CE"; REDLT="#FCE4E6"
AMBER="#BF8F00"; AMBERBG="#FFEB9C"; AMBERLT="#FFF6DA"; GREEN="#375623"; GREENBG="#C6EFCE"; GREENLT="#EBF4E6"
GREY="#808080"; GREYBG="#E7E6E6"; GREYLT="#F2F2F2"

# חישוב כמו הנוסחאות
def melai(r): return r["מלאי"] if isinstance(r["מלאי"],(int,float)) else 0
for r in records:
    units=sum(r[u] for u in UNIT_NAMES if isinstance(r[u],(int,float)))
    r["sahak"]=units+melai(r)
    if isinstance(r["מצאי"],(int,float)):
        r["paar"]=r["sahak"]-r["מצאי"]
        r["pct"]=r["sahak"]/r["מצאי"] if r["מצאי"] else None
        r["stat"]=("חוסר",RED,REDBG,REDLT) if r["paar"]<0 else ("עודף",AMBER,AMBERBG,AMBERLT) if r["paar"]>0 else ("תקין",GREEN,GREENBG,GREENLT)
    else:
        r["paar"]=None; r["pct"]=None; r["stat"]=("אין מצאי",GREY,GREYBG,GREYLT)

# ---------- טבלת ניהול ----------
HEAD=["קטגוריה","אמצעי"]+UNIT_NAMES+["מלאי","סה\"כ","מצאי","פער","% מימוש","סטטוס","הערות"]
colw=[1.5,3.0]+[0.85]*len(UNIT_NAMES)+[0.85,0.9,0.85,0.85,1.1,1.4,2.2]
order=CAT_NAMES+["אחר"]
recs=sorted(records,key=lambda r:(order.index(r["cat"]),r["name"]))
rows=[]; curcat=None
for r in recs:
    if r["cat"]!=curcat: curcat=r["cat"]; rows.append(("CAT",curcat))
    rows.append(("ROW",r))
totw=sum(colw); rh=0.4; n=len(rows)+2
fig,ax=plt.subplots(figsize=(totw*1.05,(n*rh)+0.6)); ax.axis("off")
ax.set_xlim(0,totw); ax.set_ylim(0,n*rh+0.6); ax.invert_yaxis()
ax.add_patch(Rectangle((0,0),totw,0.55,color=NAVY))
ax.text(totw/2,0.27,H("טבלת עוצמה גדודית — קובץ ניהול חי"),color="white",fontsize=12,fontweight="bold",ha="center",va="center")
y=0.55; cx=0
for h,w in zip(HEAD,colw):
    ax.add_patch(Rectangle((cx,y),w,rh,color=NAVY))
    ax.text(cx+w/2,y+rh/2,H(h),color="white",fontsize=7.5,fontweight="bold",ha="center",va="center"); cx+=w
y+=rh
for kind,val in rows:
    if kind=="CAT":
        ax.add_patch(Rectangle((0,y),totw,rh,color=BLUE))
        ax.text(totw-0.1,y+rh/2,H("▼ "+val),color="white",fontsize=8,fontweight="bold",ha="right",va="center"); y+=rh; continue
    r=val; sttxt,fg,bg,lt=r["stat"]
    pct = "" if r["pct"] is None else f"{round(r['pct']*100)}%"
    cells=[r["cat"],r["name"]]+[r[u] for u in UNIT_NAMES]+[r["מלאי"],r["sahak"],r["מצאי"],r["paar"],pct,sttxt,r["הערה"]]
    cx=0
    for i,(v,w) in enumerate(zip(cells,colw)):
        face=lt  # גוון שורה עדין
        if HEAD[i]=="סטטוס": face=bg
        elif HEAD[i]=="פער" and r["paar"] not in (None,0): face=bg
        ax.add_patch(Rectangle((cx,y),w,rh,facecolor=face,edgecolor="#d9d9d9",lw=0.3))
        isname=HEAD[i] in ("אמצעי","קטגוריה","הערות")
        strong=HEAD[i] in ("סטטוס","פער") and r["paar"] not in (None,0)
        col=fg if strong else "#222"
        # סרגל נתונים ל-% מימוש
        if HEAD[i]=="% מימוש" and r["pct"] is not None:
            bw=min(r["pct"],1.0)*w
            ax.add_patch(Rectangle((cx+w-bw,y+0.06),bw,rh-0.12,facecolor="#9Fd6a0",edgecolor="none",alpha=0.8))
        ax.text(cx+w-0.06 if isname else cx+w/2,y+rh/2,H(v),fontsize=6.8,
                ha="right" if isname else "center",va="center",
                fontweight="bold" if (HEAD[i]=="אמצעי" or strong) else "normal",color=col); cx+=w
    y+=rh
plt.tight_layout(); plt.savefig("preview_live_table.png",dpi=120,bbox_inches="tight"); plt.close()

# ---------- דשבורד ----------
short=[r for r in records if r["paar"] is not None and r["paar"]<0]
surp=[r for r in records if r["paar"] is not None and r["paar"]>0]
ok=[r for r in records if r["paar"]==0]; nod=[r for r in records if r["paar"] is None]
tot_short=-sum(r["paar"] for r in short); tot_surp=sum(r["paar"] for r in surp)
fig,ax=plt.subplots(figsize=(13,7.5)); ax.axis("off"); ax.set_xlim(0,100); ax.set_ylim(0,100); ax.invert_yaxis()
ax.add_patch(Rectangle((0,0),100,8,color=NAVY))
ax.text(50,4,H("עוצמה גדודית — לוח בקרה חי"),color="white",fontsize=21,fontweight="bold",ha="center",va="center")
ax.text(50,10.3,H("כל המספרים מחושבים אוטומטית מלשונית \"טבלת ניהול\""),color="#555",fontsize=10,ha="center")
cards=[("סך פריטים",len(records),STEEL),("חוסרים",len(short),RED),("עודפים",len(surp),AMBER),
       ("תקין",len(ok),GREEN),("ללא מצאי",len(nod),GREY),("יח' חסרות",int(tot_short),RED),("יח' עודפות",int(tot_surp),AMBER)]
x=1.5; w=13.2
for t,v,c in cards:
    ax.add_patch(FancyBboxPatch((x,14),w,11,boxstyle="round,pad=0.2,rounding_size=0.6",color=c,ec="none"))
    ax.text(x+w/2,17,H(t),color="white",fontsize=10.5,fontweight="bold",ha="center",va="center")
    ax.text(x+w/2,22,str(v),color="white",fontsize=21,fontweight="bold",ha="center",va="center"); x+=w+0.6
def tbl(x0,title,rows,headcol,bg):
    ax.add_patch(Rectangle((x0,29),46,4,color=headcol))
    ax.text(x0+45,31,H(title),color="white",fontsize=12,fontweight="bold",ha="right",va="center")
    for i,(ct,cw) in enumerate([("אמצעי",30),("סה\"כ",10),("מצאי",10),("פער",6)]):
        pass
    cols=[("אמצעי",30),("סה\"כ",10),("מצאי",10),("פער",6)]; cx=x0
    for ct,cw in cols:
        ax.add_patch(Rectangle((cx,33),cw,3.4,color=NAVY))
        ax.text(cx+cw-1 if ct=="אמצעי" else cx+cw/2,34.7,H(ct),color="white",fontsize=9,fontweight="bold",ha="right" if ct=="אמצעי" else "center",va="center"); cx+=cw
    y=36.4
    for r in rows[:11]:
        cx=x0
        for v,cw,al,strong in [(r["name"],30,"r",False),(r["sahak"],10,"c",False),(r["מצאי"],10,"c",False),(r["paar"],6,"c",True)]:
            fc=bg if strong else "white"
            ax.add_patch(Rectangle((cx,y),cw,3.0,facecolor=fc,edgecolor="#ccc",lw=0.4))
            ax.text(cx+cw-0.8 if al=="r" else cx+cw/2,y+1.5,H(v),fontsize=8.2,ha="right" if al=="r" else "center",va="center",
                    fontweight="bold" if strong else "normal",color=(headcol if strong else "#222")); cx+=cw
        y+=3.0
tbl(1.5,"חוסרים מובילים (מתעדכן)",sorted(short,key=lambda r:r["paar"]),RED,REDBG)
tbl(52,"עודפים מובילים (מתעדכן)",sorted(surp,key=lambda r:-r["paar"]),AMBER,AMBERBG)
plt.tight_layout(); plt.savefig("preview_live_dashboard.png",dpi=130,bbox_inches="tight"); plt.close()
print("saved live previews")
