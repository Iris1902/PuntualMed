import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { getEnv } from "./env";
import type { TokenProvider } from "./api";

const { supabaseUrl, supabaseAnonKey } = getEnv();

// AsyncStorage (no SecureStore) porque la sesion JWT supera el limite de 2KB de SecureStore.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Entrega el access token actual al cliente API; null si no hay sesion.
export const getAccessToken: TokenProvider = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};
