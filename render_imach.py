# -*- coding: utf-8 -*-
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from matplotlib import font_manager as fm
from bidi.algorithm import get_display
import openpyxl
for f in ["/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
          "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"]:
    fm.fontManager.addfont(f)
plt.rcParams["font.family"]="Liberation Sans"
def H(s): return get_display("" if s is None else str(s))
NAVY="#1F3864"; AMBER="#B45309"; ZEBRA="#F2F5FA"; GRP="#E2E8F0"

def render(sheet, headers, colw, title, out, head_color, nrows=34, group_col=None):
    ws=openpyxl.load_workbook("ימח_דשבורד_גדוד.xlsx")[sheet]
    data=[[ws.cell(r,c).value for c in range(1,len(headers)+1)] for r in range(3,3+nrows)]
    totw=sum(colw); rh=0.36
    fig,ax=plt.subplots(figsize=(totw*0.42, (nrows+3)*rh*0.42+1)); ax.axis("off")
    ax.set_xlim(0,totw); ax.set_ylim(0,(nrows+2)*rh); ax.invert_yaxis()
    ax.add_patch(Rectangle((0,0),totw,rh*1.3,color=head_color))
    ax.text(totw-0.1,rh*0.65,H(title),color="white",fontsize=11,fontweight="bold",ha="right",va="center")
    y=rh*1.3; cx=0
    for h,w in zip(headers,colw):
        ax.add_patch(Rectangle((cx,y),w,rh,color=head_color))
        ax.text(cx+w/2,y+rh/2,H(h),color="white",fontsize=8,fontweight="bold",ha="center",va="center"); cx+=w
    y+=rh
    prev_grp=None
    for row in data:
        cx=0
        for i,(v,w) in enumerate(zip(row,colw)):
            face="white"
            if group_col is not None and i==group_col and v!=prev_grp: face=GRP
            ax.add_patch(Rectangle((cx,y),w,rh,facecolor=face,edgecolor="#dce3ec",lw=0.3))
            isname=(i==0 or (isinstance(v,str) and len(str(v))>10))
            ax.text(cx+w-0.05 if isname else cx+w/2, y+rh/2, H(v), fontsize=6.8,
                    ha="right" if isname else "center", va="center",
                    fontweight="bold" if i==0 else "normal"); cx+=w
        if group_col is not None: prev_grp=row[group_col]
        y+=rh
    plt.tight_layout(); plt.savefig(out,dpi=135,bbox_inches="tight"); plt.close(); print("saved",out)

render("זיווד רכבים (FMTV)", ["רכב","מבנה","עמדה/דולב","סוג","תוכן (חייל/תיק/פריט)"],
       [4.2,3.6,3.2,2.6,5.0], "זיווד רכבים — מה נמצא בכל דולב/עמדה", "preview_imach_fmtv.png", NAVY, group_col=2)
render("זיווד האמרים", ["האמר","צ׳","קבוצת זיווד","פריט","מיקום / הערה"],
       [5.2,2.4,3.6,5.2,4.0], "זיווד האמרים — מה נמצא איפה", "preview_imach_hammers.png", AMBER, group_col=2)
