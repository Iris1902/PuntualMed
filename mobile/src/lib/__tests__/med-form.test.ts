import { parseTimes, toInput, validateMedForm } from "../med-form";

const valid = {
  name: "Losartan",
  dose: "50mg",
  startDate: "2026-06-20",
  durationDays: "30",
  timesRaw: "09:00, 21:00",
  notes: "",
};

describe("parseTimes", () => {
  it("splits and trims comma-separated times, dropping blanks", () => {
    expect(parseTimes(" 09:00 , 21:00 , ")).toEqual(["09:00", "21:00"]);
    expect(parseTimes("")).toEqual([]);
  });
});

describe("validateMedForm", () => {
  it("returns null for a valid form", () => {
    expect(validateMedForm(valid)).toBeNull();
  });
  it("rejects a missing name", () => {
    expect(validateMedForm({ ...valid, name: "  " })).toMatch(/nombre/i);
  });
  it("rejects a non-positive duration", () => {
    expect(validateMedForm({ ...valid, durationDays: "0" })).toMatch(/duracion/i);
  });
  it("rejects a bad date", () => {
    expect(validateMedForm({ ...valid, startDate: "20-06-2026" })).toMatch(/fecha/i);
  });
  it("rejects a malformed time", () => {
    expect(validateMedForm({ ...valid, timesRaw: "9am" })).toMatch(/horario/i);
  });
});

describe("toInput", () => {
  it("maps the form to the backend MedicationInput", () => {
    expect(toInput(valid)).toEqual({
      name: "Losartan",
      dose: "50mg",
      start_date: "2026-06-20",
      duration_days: 30,
      notes: null,
      schedules: [{ time_of_day: "09:00" }, { time_of_day: "21:00" }],
    });
  });
});
