import { formatTime } from "@/lib/home-data";
import type { Intake } from "@/lib/intakes-api";
import type { Medication } from "@/lib/meds-api";
import type { Symptom } from "@/lib/symptoms-api";

type DayFlags = { taken: boolean; missed: boolean; symptom: boolean; pending: boolean };
type EffectiveStatus = "taken" | "missed" | "pending";

// Clave de dia local YYYY-MM-DD.
export function dayKey(iso: string): string {
  const d = new Date(iso);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// "missed" se deriva: pendiente y ya vencida, o cuando el backend ya lo persistió.
export function effectiveStatus(intake: Intake, now: Date): EffectiveStatus {
  if (intake.status === "taken") return "taken";
  if (intake.status === "missed") return "missed";
  if (intake.status === "pending" && new Date(intake.scheduled_at) < now) return "missed";
  return "pending";
}

export function daysInMonth(year: number, month0: number): number[] {
  const count = new Date(year, month0 + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => i + 1);
}

export function dayStatuses(
  intakes: Intake[],
  symptoms: Symptom[],
  now: Date,
): Record<string, DayFlags> {
  const map: Record<string, DayFlags> = {};
  const ensure = (key: string) =>
    (map[key] ??= { taken: false, missed: false, symptom: false, pending: false });
  for (const i of intakes) {
    const flags = ensure(dayKey(i.scheduled_at));
    const status = effectiveStatus(i, now);
    if (status === "taken") flags.taken = true;
    if (status === "missed") flags.missed = true;
    if (status === "pending") flags.pending = true;
  }
  for (const s of symptoms) ensure(dayKey(s.occurred_at)).symptom = true;
  return map;
}

export function statusIcon(status: "taken" | "missed" | "pending"): string {
  if (status === "taken") return "✓";
  if (status === "missed") return "✗";
  return "•";
}

// Clase de color por estado de toma (verde tomada, rojo vencida, celeste pendiente).
export function statusColor(status: "taken" | "missed" | "pending"): string {
  if (status === "taken") return "font-sans text-success";
  if (status === "missed") return "font-sans text-danger";
  return "font-sans text-sky";
}

export function dayDetail(
  intakes: Intake[],
  meds: Medication[],
  symptoms: Symptom[],
  key: string,
  now: Date,
) {
  const byId = new Map(meds.map((m) => [m.id, m]));
  const medRows = intakes
    .filter((i) => dayKey(i.scheduled_at) === key && byId.has(i.medication_id))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((i) => ({
      id: i.id,
      name: byId.get(i.medication_id)!.name,
      time: formatTime(i.scheduled_at),
      status: effectiveStatus(i, now),
    }));
  const daySymptoms = symptoms
    .filter((s) => dayKey(s.occurred_at) === key)
    .map((s) => ({ id: s.id, description: s.description }));
  return { meds: medRows, symptoms: daySymptoms };
}
