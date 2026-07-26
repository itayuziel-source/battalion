import { describe, expect, it } from "vitest";
import { canApproveWiring, canCommitSet, canMarkWires, canResolveDeviation } from "../lib/permissions";

describe("canApproveWiring — רק בודק או מנהל מאשרים חיווט סופי", () => {
  it("עובד אינו יכול לאשר", () => {
    expect(canApproveWiring("worker")).toBe(false);
  });
  it("בודק יכול לאשר", () => {
    expect(canApproveWiring("inspector")).toBe(true);
  });
  it("מנהל יכול לאשר", () => {
    expect(canApproveWiring("manager")).toBe(true);
  });
});

describe("canResolveDeviation — רק מנהל מטפל בחריגות", () => {
  it("עובד ובודק אינם יכולים", () => {
    expect(canResolveDeviation("worker")).toBe(false);
    expect(canResolveDeviation("inspector")).toBe(false);
  });
  it("מנהל יכול", () => {
    expect(canResolveDeviation("manager")).toBe(true);
  });
});

describe("canMarkWires", () => {
  it("כל התפקידים יכולים לסמן גידים", () => {
    expect(canMarkWires("worker")).toBe(true);
    expect(canMarkWires("inspector")).toBe(true);
    expect(canMarkWires("manager")).toBe(true);
  });
});

describe("canCommitSet", () => {
  it("כל התפקידים יכולים להזין נתוני מיפוי", () => {
    expect(canCommitSet("worker")).toBe(true);
    expect(canCommitSet("inspector")).toBe(true);
    expect(canCommitSet("manager")).toBe(true);
  });
});
