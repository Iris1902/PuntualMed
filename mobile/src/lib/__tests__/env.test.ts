import { getEnv } from "../env";

describe("getEnv", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("returns all values when env vars are set", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:8000";

    expect(getEnv()).toEqual({
      supabaseUrl: "https://x.supabase.co",
      supabaseAnonKey: "anon-key",
      apiBaseUrl: "http://localhost:8000",
    });
  });

  it("throws naming the missing variable", () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://localhost:8000";

    expect(() => getEnv()).toThrow("EXPO_PUBLIC_SUPABASE_URL");
  });
});
