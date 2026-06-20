import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/supabase";

export type Intake = {
  id: string;
  medication_id: string;
  scheduled_at: string;
  status: string;
};

export async function listIntakes(opts: { from: string; to: string }): Promise<Intake[]> {
  const path = `/api/v1/intakes?from_date=${opts.from}&to_date=${opts.to}`;
  return apiRequest<Intake[]>(path, { token: getAccessToken });
}
