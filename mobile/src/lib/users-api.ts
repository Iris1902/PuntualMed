import { apiRequest } from "@/lib/api";
import { getAccessToken } from "@/lib/supabase";

export type Me = { id: string; full_name: string | null };

export async function fetchMe(): Promise<Me> {
  return apiRequest<Me>("/api/v1/users/me", { token: getAccessToken });
}
