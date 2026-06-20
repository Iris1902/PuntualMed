import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/supabase";

export type Medication = { id: string; name: string; dose: string };

export async function listMedications(): Promise<Medication[]> {
  return apiRequest<Medication[]>("/api/v1/medications", { token: getAccessToken });
}
