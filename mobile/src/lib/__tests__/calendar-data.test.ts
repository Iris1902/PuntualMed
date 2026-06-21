import { dayDetail, dayKey, dayStatuses, daysInMonth, effectiveStatus, statusIcon } from "../calendar-data";
import type { Intake } from "../intakes-api";
import type { Medication } from "../meds-api";
import type { Symptom } from "../symptoms-api";

const now = new Date("2026-06-20T12:00:00Z");
const meds: Medication[] = [
  { id: "m1", name: "Losartan", dose: "50mg", frequency_hours: null, start_date: "2026-06-01", duration_days: 30, end_date: "2026-07-01", notes: null, source: "manual", active: true, created_at: "x", schedules: [] },
];
function intake(o: Partial<Intake>): Intake {
  return { id: "i", medication_id: "m1", scheduled_at: "2026-06-20T13:00:00Z", status: "pending", ...o };
}
function symptom(o: Partial<Symptom>): Symptom {
  return { id: "s", medication_id: null, description: "mareo", severity: null, occurred_at: "2026-06-20T10:00:00Z", ...o };
}

describe("effectiveStatus", () => {
  it("is taken when confirmed", () => {
    expect(effectiveStatus(intake({ status: "taken" }), now)).toBe("taken");
  });
  it("is missed when pending and overdue", () => {
    expect(effectiveStatus(intake({ scheduled_at: "2026-06-20T08:00:00Z" }), now)).toBe("missed");
  });
  it("is pending when not yet due", () => {
    expect(effectiveStatus(intake({ scheduled_at: "2026-06-20T20:00:00Z" }), now)).toBe("pending");
  });
  it("returns missed when the backend already persisted missed", () => {
    const testIntake = { status: "missed", scheduled_at: "2999-01-01T00:00:00Z" } as never;
    expect(effectiveStatus(testIntake, now)).toBe("missed");
  });
});

describe("daysInMonth", () => {
  it("returns the right number of days (June -> 30)", () => {
    expect(daysInMonth(2026, 5)).toHaveLength(30);
    expect(daysInMonth(2026, 5)[0]).toBe(1);
  });
});

describe("dayStatuses", () => {
  it("aggregates taken/missed/symptom/pending flags per local day", () => {
    const result = dayStatuses(
      [
        intake({ scheduled_at: "2026-06-20T08:00:00Z", status: "taken" }),
        intake({ scheduled_at: "2026-06-20T20:00:00Z", status: "pending" }),
      ],
      [symptom({ occurred_at: "2026-06-20T10:00:00Z" })],
      now,
    );
    const key = dayKey("2026-06-20T08:00:00Z");
    expect(result[key]).toEqual({ taken: true, missed: false, symptom: true, pending: true });
  });
});

describe("statusIcon", () => {
  it("maps statuses to glyphs", () => {
    expect(statusIcon("taken")).toBe("✓");
    expect(statusIcon("missed")).toBe("✗");
    expect(statusIcon("pending")).toBe("•");
  });
});

describe("dayDetail", () => {
  it("joins the day's intakes to med names and lists symptoms", () => {
    const key = dayKey("2026-06-20T13:00:00Z");
    const detail = dayDetail([intake({})], meds, [symptom({})], key, now);
    expect(detail.meds[0]).toMatchObject({ name: "Losartan", status: "pending" });
    expect(detail.symptoms[0].description).toBe("mareo");
  });
});
