import { adherence, formatTime, nextDose, todaysMeds } from "../home-data";
import type { Intake } from "../intakes-api";
import type { Medication } from "../meds-api";

const meds: Medication[] = [
  { id: "m1", name: "Losartan", dose: "50mg" },
  { id: "m2", name: "Metformina", dose: "500mg" },
];

function intake(over: Partial<Intake>): Intake {
  return { id: "i", medication_id: "m1", scheduled_at: "2026-06-20T13:00:00Z", status: "pending", ...over };
}

describe("formatTime", () => {
  it("formats to local 12-hour time", () => {
    // 2026-06-20T14:05:00Z -> 09:05 in UTC-5; assert it contains the minutes and an AM/PM marker
    const out = formatTime("2026-06-20T14:05:00Z");
    expect(out).toMatch(/\d{1,2}:05\s?(AM|PM)/);
  });
});

describe("nextDose", () => {
  it("returns the earliest pending intake at/after now, joined to its med", () => {
    const now = new Date("2026-06-20T12:00:00Z");
    const result = nextDose(
      [
        intake({ id: "a", scheduled_at: "2026-06-20T11:00:00Z" }), // past
        intake({ id: "b", scheduled_at: "2026-06-20T15:00:00Z", medication_id: "m2" }),
        intake({ id: "c", scheduled_at: "2026-06-20T13:00:00Z" }),
      ],
      meds,
      now,
    );
    expect(result).toEqual({ name: "Losartan", dose: "50mg", time: formatTime("2026-06-20T13:00:00Z") });
  });

  it("returns null when there is no upcoming pending intake", () => {
    const now = new Date("2026-06-20T23:00:00Z");
    expect(nextDose([intake({ status: "taken" })], meds, now)).toBeNull();
  });
});

describe("adherence", () => {
  it("computes taken/total/percent over the last 7 days", () => {
    const now = new Date("2026-06-20T12:00:00Z");
    const result = adherence(
      [
        intake({ scheduled_at: "2026-06-18T13:00:00Z", status: "taken" }),
        intake({ scheduled_at: "2026-06-19T13:00:00Z", status: "taken" }),
        intake({ scheduled_at: "2026-06-19T20:00:00Z", status: "pending" }),
        intake({ scheduled_at: "2026-06-01T13:00:00Z", status: "taken" }), // outside window
      ],
      now,
    );
    expect(result).toEqual({ taken: 2, total: 3, percent: 67 });
  });

  it("returns 0 percent when there are no intakes in the window", () => {
    expect(adherence([], new Date("2026-06-20T12:00:00Z"))).toEqual({ taken: 0, total: 0, percent: 0 });
  });
});

describe("todaysMeds", () => {
  it("returns today's intakes joined and time-sorted", () => {
    const now = new Date("2026-06-20T12:00:00Z");
    const rows = todaysMeds(
      [
        intake({ id: "late", scheduled_at: "2026-06-20T21:00:00Z", medication_id: "m2" }),
        intake({ id: "early", scheduled_at: "2026-06-20T13:00:00Z" }),
        intake({ id: "other-day", scheduled_at: "2026-06-19T13:00:00Z" }),
      ],
      meds,
      now,
    );
    expect(rows.map((r) => r.id)).toEqual(["early", "late"]);
    expect(rows[0]).toMatchObject({ name: "Losartan", dose: "50mg", status: "pending" });
  });
});
