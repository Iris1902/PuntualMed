// mobile/src/lib/date-utils.ts

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString);
  const hours = `${d.getHours()}`.padStart(2, "0");
  const minutes = `${d.getMinutes()}`.padStart(2, "0");
  return `${hours}:${minutes}`;
}