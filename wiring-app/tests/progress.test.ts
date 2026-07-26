import { describe, expect, it } from "vitest";
import {
  cableProgress,
  cableStatus,
  cabinetProgress,
  cabinetStatus,
  isCableComplete,
  percent,
  projectProgress,
} from "../lib/progress";

describe("percent", () => {
  it("מחזיר 0 כשאין פריטים", () => {
    expect(percent(0, 0)).toBe(0);
  });
  it("מעגל לאחוז שלם", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
    expect(percent(3, 3)).toBe(100);
  });
});

describe("cableProgress", () => {
  it("סופר גידים שהושלמו", () => {
    const wires = [{ completed: 1 }, { completed: 0 }, { completed: 1 }, { completed: 0 }];
    expect(cableProgress(wires)).toEqual({ completed: 2, total: 4, percent: 50 });
  });
});

describe("isCableComplete — כבל מושלם רק כשכל הגידים הושלמו", () => {
  it("לא מושלם כשגיד אחד פתוח", () => {
    expect(isCableComplete([{ completed: 1 }, { completed: 1 }, { completed: 0 }])).toBe(false);
  });
  it("מושלם כשכולם הושלמו", () => {
    expect(isCableComplete([{ completed: 1 }, { completed: 1 }])).toBe(true);
  });
  it("כבל ללא גידים אינו מושלם", () => {
    expect(isCableComplete([])).toBe(false);
  });
});

describe("cableStatus", () => {
  it("טרם התחיל כשאף גיד לא הושלם", () => {
    expect(cableStatus([{ completed: 0 }, { completed: 0 }], false, false)).toBe("not_started");
  });
  it("בביצוע כשחלק מהגידים הושלמו", () => {
    expect(cableStatus([{ completed: 1 }, { completed: 0 }], false, false)).toBe("in_progress");
  });
  it("כבל שכל גידיו הושלמו אך לא נבדק — ממתין לבדיקה, לא הושלם", () => {
    expect(cableStatus([{ completed: 1 }, { completed: 1 }], false, false)).toBe("pending_check");
  });
  it("הושלם רק אחרי בדיקה", () => {
    expect(cableStatus([{ completed: 1 }, { completed: 1 }], true, false)).toBe("done");
  });
  it("חריגה פתוחה גוברת על כל סטטוס", () => {
    expect(cableStatus([{ completed: 1 }, { completed: 1 }], true, true)).toBe("issue");
  });
  it("כבל שנבדק אך גיד בוטל אינו נשאר הושלם", () => {
    expect(cableStatus([{ completed: 1 }, { completed: 0 }], true, false)).toBe("in_progress");
  });
});

describe("cabinetProgress", () => {
  it("מחשב לפי כבלים שהושלמו (done) בלבד", () => {
    const cables = [
      { status: "done" as const },
      { status: "pending_check" as const },
      { status: "in_progress" as const },
      { status: "not_started" as const },
    ];
    expect(cabinetProgress(cables)).toEqual({ completed: 1, total: 4, percent: 25 });
  });
});

describe("cabinetStatus — ארון מושלם רק כשכל הכבלים הושלמו", () => {
  it("לא מושלם כשיש כבל שאינו done", () => {
    expect(cabinetStatus([{ status: "done" }, { status: "pending_check" }], false)).toBe("pending_check");
  });
  it("מושלם כשכל הכבלים done", () => {
    expect(cabinetStatus([{ status: "done" }, { status: "done" }], false)).toBe("done");
  });
  it("טרם התחיל כשכל הכבלים לא התחילו", () => {
    expect(cabinetStatus([{ status: "not_started" }, { status: "not_started" }], false)).toBe("not_started");
  });
  it("בביצוע במצב מעורב", () => {
    expect(cabinetStatus([{ status: "done" }, { status: "in_progress" }], false)).toBe("in_progress");
  });
  it("חריגה פתוחה הופכת את הארון לחריגה", () => {
    expect(cabinetStatus([{ status: "done" }, { status: "done" }], true)).toBe("issue");
  });
  it("ארון ריק אינו מושלם", () => {
    expect(cabinetStatus([], false)).toBe("not_started");
  });
});

describe("projectProgress", () => {
  it("ממוצע משוקלל לפי מספר כבלים", () => {
    const cabinets = [
      { progress: 100, total_cables: 10 },
      { progress: 0, total_cables: 10 },
    ];
    expect(projectProgress(cabinets)).toBe(50);
  });
  it("ארון גדול משפיע יותר", () => {
    const cabinets = [
      { progress: 100, total_cables: 30 },
      { progress: 0, total_cables: 10 },
    ];
    expect(projectProgress(cabinets)).toBe(75);
  });
  it("0 כשאין כבלים", () => {
    expect(projectProgress([])).toBe(0);
  });
});
