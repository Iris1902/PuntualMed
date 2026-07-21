import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/supabase";

export type Symptom = {
  id: string;
  medication_id: string | null;
  description: string;
  severity: string | null;
  occurred_at: string;
};

export async function listSymptoms(): Promise<Symptom[]> {
  try {
    return await apiRequest<Symptom[]>("/api/v1/symptoms", { token: getAccessToken });
  } catch (error) {
    console.error("Error al listar síntomas:", error);
    return []; // Retorna lista vacía si falla la petición
  }
}

export type SymptomInput = {
  description: string;
  severity?: string | null;
  medication_id?: string | null;
};

export async function createSymptom(input: SymptomInput): Promise<Symptom> {
  return apiRequest<Symptom>("/api/v1/symptoms", {
    method: "POST",
    body: input,
    token: getAccessToken,
  });
}

export async function updateSymptom(id: string, input: Partial<SymptomInput>): Promise<Symptom> {
  return apiRequest<Symptom>(`/api/v1/symptoms/${id}`, {
    method: "PATCH",
    body: input,
    token: getAccessToken,
  });
}

export async function deleteSymptom(id: string): Promise<void> {
  await apiRequest<null>(`/api/v1/symptoms/${id}`, { method: "DELETE", token: getAccessToken });
}