import type { MedicationInput } from "@/lib/meds-api";

export const UNITS = ["mg", "g", "ml", "mcg", "UI"] as const;

export const FREQUENCIES: { label: string; times: string[] }[] = [
  { label: "1 vez al día", times: ["09:00"] },
  { label: "2 veces al día", times: ["09:00", "21:00"] },
  { label: "Cada 8 horas", times: ["08:00", "16:00", "00:00"] },
  { label: "Cada 12 horas", times: ["08:00", "20:00"] },
];

export type MedForm = {
  name: string;
  amount: string;
  unit: string;
  startDate: string;
  durationDays: string;
  times: string[];
  notes: string;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export function parseTimes(raw: string): string[] {
  return raw.split(",").map((t) => t.trim()).filter((t) => t.length > 0);
}

export function buildDose(amount: string, unit: string): string {
  return `${amount.trim()} ${unit}`;
}

// Devuelve un mensaje de error o null si el formulario es valido.
export function validateMedForm(form: MedForm): string | null {
  if (!form.name.trim()) return "El nombre es obligatorio";
  if (!form.amount.trim()) return "La dosis es obligatoria";
  if (!DATE_RE.test(form.startDate)) return "Elige una fecha de inicio";
  const days = Number(form.durationDays);
  if (!Number.isInteger(days) || days <= 0) return "La duración debe ser un número positivo";
  if (form.times.length === 0) return "Agrega al menos un horario";
  if (form.times.some((t) => !TIME_RE.test(t))) return "Cada horario debe ser HH:MM";
  return null;
}

export function toInput(form: MedForm): MedicationInput {
  return {
    name: form.name.trim(),
    dose: buildDose(form.amount, form.unit),
    start_date: form.startDate,
    duration_days: Number(form.durationDays),
    notes: form.notes.trim() || null,
    schedules: form.times.map((t) => ({ time_of_day: t })),
  };
}

export function recipeToForm(recipe: {
  name?: string | null;
  dose?: string | null;
  start_date?: string | null;
  duration_days?: number | null;
  frequency_hours?: number | null;
  schedules?: Array<string | { time_of_day?: string | null }> | null;
  notes?: string | null;
}): MedForm {
  const amount = (recipe.dose ?? "").trim().split(/\s+/)[0] ?? "";
  const unit = (recipe.dose ?? "").trim().split(/\s+/).slice(1).join(" ") || "mg";
  const times = (recipe.schedules ?? [])
    .map((entry) => (typeof entry === "string" ? entry : entry?.time_of_day ?? ""))
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    name: recipe.name?.trim() ?? "",
    amount,
    unit: UNITS.includes(unit as (typeof UNITS)[number]) ? unit : "mg",
    startDate: recipe.start_date ?? todayIso(),
    durationDays: String(recipe.duration_days ?? 7),
    times,
    notes: recipe.notes?.trim() ?? "",
  };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
