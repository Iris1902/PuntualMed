export type Env = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
};

// Falla ruidosamente si falta una variable, en vez de fallar silenciosamente en runtime.
function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getEnv(): Env {
  return {
    supabaseUrl: required(
      process.env.EXPO_PUBLIC_SUPABASE_URL,
      "EXPO_PUBLIC_SUPABASE_URL",
    ),
    supabaseAnonKey: required(
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    ),
    apiBaseUrl: required(
      process.env.EXPO_PUBLIC_API_BASE_URL,
      "EXPO_PUBLIC_API_BASE_URL",
    ),
  };
}
