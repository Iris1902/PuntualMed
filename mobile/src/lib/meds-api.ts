import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/supabase";

export type Schedule = { id: string; time_of_day: string };

export type Medication = {
  id: string;
  name: string;
  dose: string;
  frequency_hours: number | null;
  start_date: string;
  duration_days: number;
  end_date: string;
  notes: string | null;
  source: string;
  active: boolean;
  created_at: string;
  schedules: Schedule[];
};

export type MedicationInput = {
  name: string;
  dose: string;
  start_date: string;
  duration_days: number;
  frequency_hours?: number | null;
  notes?: string | null;
  schedules: { time_of_day: string }[];
};

export async function listMedications(): Promise<Medication[]> {
  return apiRequest<Medication[]>("/api/v1/medications", { token: getAccessToken });
}

export async function getMedication(id: string): Promise<Medication> {
  return apiRequest<Medication>(`/api/v1/medications/${id}`, { token: getAccessToken });
}

export async function createMedication(input: MedicationInput): Promise<Medication> {
  return apiRequest<Medication>("/api/v1/medications", {
    method: "POST",
    body: input,
    token: getAccessToken,
  });
}

export async function deleteMedication(id: string): Promise<void> {
  await apiRequest<null>(`/api/v1/medications/${id}`, {
    method: "DELETE",
    token: getAccessToken,
  });
}
