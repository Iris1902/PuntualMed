import type { Intake } from "@/lib/intakes-api";
import type { Medication } from "@/lib/meds-api";

type DoseStatus = "taken" | "missed" | "pending";
type DoseRow = { id: string; name: string; dose: string; time: string; status: DoseStatus };

// "missed" se deriva: pendiente y ya vencida, o cuando el backend ya lo persistió.
function doseStatus(intake: Intake, now: Date): DoseStatus {
  if (intake.status === "taken") return "taken";
  if (intake.status === "missed") return "missed";
  if (new Date(intake.scheduled_at) < now) return "missed";
  return "pending";
}

// Hora local en formato 12h (ej. "9:00 AM").
export function formatTime(iso: string): string {
  const d = new Date(iso);
  const hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, "0");
  const period = hours < 12 ? "AM" : "PM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${period}`;
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
  return { name: med.name, dose: med.dose, time: formatTime(next.scheduled_at) };
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
