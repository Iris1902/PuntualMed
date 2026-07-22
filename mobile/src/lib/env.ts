import { Platform } from "react-native";

export type Env = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
};

// En lugar de hacer throw new Error, le da un valor por defecto o avisa con un warning
function getOrFallback(value: string | undefined, name: string, fallback: string = ""): string {
  if (!value) {
    console.warn(`⚠️ Advertencia: Falta la variable de entorno: ${name}`);
    return fallback;
  }
  return value;
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

export function getEnv(): Env {
  // Acepta tanto EXPO_PUBLIC_API_BASE_URL como EXPO_PUBLIC_API_URL para evitar errores
  const rawApiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL;
  const apiBaseUrl = resolveApiBaseUrl(rawApiUrl);

  return {
    supabaseUrl: getOrFallback(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      "EXPO_PUBLIC_SUPABASE_URL"
    ),
    supabaseAnonKey: getOrFallback(
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      "EXPO_PUBLIC_SUPABASE_ANON_KEY"
    ),
    apiBaseUrl: getOrFallback(
      apiBaseUrl,
      "EXPO_PUBLIC_API_BASE_URL / EXPO_PUBLIC_API_URL",
      "http://192.168.100.3:8001" // Tu IP por defecto
    ),
  };
}