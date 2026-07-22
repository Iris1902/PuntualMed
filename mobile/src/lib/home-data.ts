import { dayStatuses } from "@/lib/calendar-data";
import type { Intake } from "@/lib/intakes-api";
import type { Medication } from "@/lib/meds-api";
import type { Symptom } from "@/lib/symptoms-api";
import type { CalendarDay } from "@/components/ui/home/MonthlyCalendar";
import { addDays, formatTime } from "@/lib/date-utils";

type DoseStatus = "taken" | "missed" | "pending";
type DoseRow = { id: string; name: string; dose: string; time: string; status: DoseStatus };

// "missed" se deriva: pendiente y ya vencida, o cuando el backend ya lo persistió.
function doseStatus(intake: Intake, now: Date): DoseStatus {
  if (intake.status === "taken") return "taken";
  if (intake.status === "missed") return "missed";
  if (new Date(intake.scheduled_at) < now) return "missed";
  return "pending";
}

function medById(meds: Medication[]): Map<string, Medication> {
  return new Map(meds.map((m) => [m.id, m]));
}

function sameLocalDay(iso: string, ref: Date): boolean {
  return new Date(iso).toDateString() === ref.toDateString();
}

export function nextDose(
  intakes: Intake[],
  meds: Medication[],
  now: Date,
): { name: string; dose: string; time: string } | null {
  const byId = medById(meds);
  const upcoming = intakes
    .filter((i) => i.status === "pending" && new Date(i.scheduled_at) >= now)
    .filter((i) => byId.has(i.medication_id))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const next = upcoming[0];
  if (!next) return null;
  const med = byId.get(next.medication_id)!;
  return {
    name: med.name,
    dose: med.dose,
    time: formatTime(next.scheduled_at),
  };
}

export function todaysMeds(intakes: Intake[], meds: Medication[], now: Date): DoseRow[] {
  const byId = medById(meds);
  return intakes
    .filter((i) => sameLocalDay(i.scheduled_at, now) && byId.has(i.medication_id))
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at))
    .map((i) => {
      const med = byId.get(i.medication_id)!;
      return {
        id: i.id,
        name: med.name,
        dose: med.dose,
        time: formatTime(i.scheduled_at),
        status: doseStatus(i, now),
      };
    });
}

export function nextPendingIntake(intakes: Intake[], now: Date): Intake | null {
  const upcoming = intakes
    .filter((i) => i.status === "pending" && new Date(i.scheduled_at) >= now)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  return upcoming[0] ?? null;
}

export function adherence(
  intakes: Intake[],
  now: Date,
): { taken: number; total: number; percent: number } {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const window = intakes.filter((i) => {
    const at = new Date(i.scheduled_at);
    return at >= weekAgo && at <= now;
  });
  const taken = window.filter((i) => i.status === "taken").length;
  const total = window.length;
  const percent = total === 0 ? 0 : Math.round((taken / total) * 100);
  return { taken, total, percent };
}

// Fecha ISO (YYYY-MM-DD) en base a componentes locales, sin desfases de zona horaria.
export function isoDate(d: Date): string {
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function sameLocalMonth(iso: string, ref: Date): boolean {
  const d = new Date(iso);
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

// Rango [from, to] que cubre el mes completo de `date`.
export function monthRange(date: Date): { from: string; to: string } {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { from: isoDate(first), to: isoDate(last) };
}

// Estado por día (tomado/omitido/síntoma/sin registros) para alimentar MonthlyCalendar.
// La prioridad visual es: síntoma > omitido > tomado > sin registros.
export function monthlyCalendarData(intakes: Intake[], symptoms: Symptom[], now: Date): CalendarDay[] {
  const flags = dayStatuses(intakes, symptoms, now);
  return Object.entries(flags).map(([date, f]) => ({
    date,
    status: f.symptom ? "symptom" : f.missed ? "missed" : f.taken ? "taken" : "none",
  }));
}

// Conteo de tomas/síntomas del mes de `now`, para el grid "Resumen del mes".
export function monthSummary(
  intakes: Intake[],
  symptoms: Symptom[],
  now: Date,
): { taken: number; pending: number; missed: number; symptoms: number } {
  const monthIntakes = intakes.filter((i) => sameLocalMonth(i.scheduled_at, now));
  const monthSymptoms = symptoms.filter((s) => sameLocalMonth(s.occurred_at, now));
  let taken = 0;
  let pending = 0;
  let missed = 0;
  for (const i of monthIntakes) {
    const status = doseStatus(i, now);
    if (status === "taken") taken++;
    else if (status === "missed") missed++;
    else pending++;
  }
  return { taken, pending, missed, symptoms: monthSymptoms.length };
}

// % de adherencia del mes de `now`, contando solo tomas ya resueltas (tomadas u omitidas).
export function monthlyAdherence(
  intakes: Intake[],
  now: Date,
): { percentage: number; completed: number; total: number } {
  const decided = intakes
    .filter((i) => sameLocalMonth(i.scheduled_at, now))
    .filter((i) => doseStatus(i, now) !== "pending");
  const completed = decided.filter((i) => doseStatus(i, now) === "taken").length;
  const total = decided.length;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { percentage, completed, total };
}