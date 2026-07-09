import { buildDose, FREQUENCIES, parseTimes, recipeToForm, toInput, UNITS, validateMedForm } from "../med-form";

const valid = {
  name: "Losartan",
  amount: "50",
  unit: "mg",
  startDate: "2026-06-20",
  durationDays: "30",
  times: ["09:00", "21:00"],
  notes: "",
};

describe("UNITS / FREQUENCIES", () => {
  it("exposes unit and frequency options", () => {
    expect(UNITS).toContain("mg");
    expect(FREQUENCIES.length).toBeGreaterThan(0);
    expect(FREQUENCIES[0]).toHaveProperty("label");
    expect(FREQUENCIES[0]).toHaveProperty("times");
  });
});

describe("buildDose", () => {
  it("joins amount and unit", () => {
    expect(buildDose("50", "mg")).toBe("50 mg");
  });
});

describe("validateMedForm", () => {
  it("returns null for a valid form", () => {
    expect(validateMedForm(valid)).toBeNull();
  });
  it("rejects a missing name", () => {
    expect(validateMedForm({ ...valid, name: " " })).toMatch(/nombre/i);
  });
  it("rejects a missing amount", () => {
    expect(validateMedForm({ ...valid, amount: "" })).toMatch(/dosis/i);
  });
  it("rejects no schedule times", () => {
    expect(validateMedForm({ ...valid, times: [] })).toMatch(/horario/i);
  });
  it("rejects a non-positive duration", () => {
    expect(validateMedForm({ ...valid, durationDays: "0" })).toMatch(/duraci/i);
  });
});

describe("toInput", () => {
  it("maps the form to the backend MedicationInput", () => {
    expect(toInput(valid)).toEqual({
      name: "Losartan",
      dose: "50 mg",
      start_date: "2026-06-20",
      duration_days: 30,
      notes: null,
      schedules: [{ time_of_day: "09:00" }, { time_of_day: "21:00" }],
    });
  });
});

describe("parseTimes", () => {
  it("still trims and drops blanks (kept for reuse)", () => {
    expect(parseTimes(" 09:00 , , 21:00 ")).toEqual(["09:00", "21:00"]);
  });
});

describe("recipeToForm", () => {
  it("maps a parsed prescription into the add-medication form", () => {
    expect(
      recipeToForm({
        name: "Amoxicilina",
        dose: "500 mg",
        start_date: "2026-01-01",
        duration_days: 7,
        frequency_hours: 24,
        schedules: ["09:00"],
        notes: "Tomar con comida",
      }),
    ).toEqual({
      name: "Amoxicilina",
      amount: "500",
      unit: "mg",
      startDate: "2026-01-01",
      durationDays: "7",
      times: ["09:00"],
      notes: "Tomar con comida",
    });
  });
});
