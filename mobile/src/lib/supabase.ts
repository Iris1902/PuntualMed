import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import { getEnv } from "./env";
import type { TokenProvider } from "./api";

const { supabaseUrl, supabaseAnonKey } = getEnv();

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

function createMemoryStorage(): StorageLike {
  const store = new Map<string, string>();
  return {
    async getItem(key: string) {
      return store.get(key) ?? null;
    },
    async setItem(key: string, value: string) {
      store.set(key, value);
    },
    async removeItem(key: string) {
      store.delete(key);
    },
  };
}

function getStorage(): StorageLike | undefined {
  if (Platform.OS === "web" && typeof window === "undefined") {
    return undefined;
  }

  try {
    const AsyncStorageModule = require("@react-native-async-storage/async-storage");
    return AsyncStorageModule?.default ?? AsyncStorageModule;
  } catch {
    return createMemoryStorage();
  }
}

// AsyncStorage (no SecureStore) porque la sesion JWT supera el limite de 2KB de SecureStore.
// En SSR (web static export) no existe window ni storage nativo; se omite el storage.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: "pkce",
  },
});

// Entrega el access token actual al cliente API; null si no hay sesion.
export const getAccessToken: TokenProvider = async () => {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
};
