import type { MedicationInput } from "@/lib/meds-api";

export type MedForm = {
  name: string;
  dose: string;
  startDate: string;
  durationDays: string;
  timesRaw: string;
  notes: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export function parseTimes(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

// Devuelve un mensaje de error o null si el formulario es valido.
export function validateMedForm(form: MedForm): string | null {
  if (!form.name.trim()) return "El nombre es obligatorio";
  if (!form.dose.trim()) return "La dosis es obligatoria";
  if (!DATE_RE.test(form.startDate)) return "La fecha debe ser YYYY-MM-DD";
  const days = Number(form.durationDays);
  if (!Number.isInteger(days) || days <= 0) return "La duracion debe ser un numero positivo";
  const times = parseTimes(form.timesRaw);
  if (times.some((t) => !TIME_RE.test(t))) return "Cada horario debe ser HH:MM";
  return null;
}

export function toInput(form: MedForm): MedicationInput {
  return {
    name: form.name.trim(),
    dose: form.dose.trim(),
    start_date: form.startDate,
    duration_days: Number(form.durationDays),
    notes: form.notes.trim() || null,
    schedules: parseTimes(form.timesRaw).map((t) => ({ time_of_day: t })),
  };
}
