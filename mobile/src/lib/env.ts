export type Env = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
};

import { Platform } from "react-native";

// Falla ruidosamente si falta una variable, en vez de fallar silenciosamente en runtime.
function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getEnv(): Env {
  const apiBaseUrl = resolveApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

  return {
    supabaseUrl: required(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      "EXPO_PUBLIC_SUPABASE_URL",
    ),
    supabaseAnonKey: required(
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    ),
    apiBaseUrl: required(apiBaseUrl, "EXPO_PUBLIC_API_BASE_URL"),
  };
}

function resolveApiBaseUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  if (Platform.OS === "android" && /^(http:\/\/)?(127\.0\.0\.1|localhost|0\.0\.0\.0)(:\d+)?$/i.test(normalized)) {
    return "http://10.0.2.2:8000";
  }

  return normalized;
}
