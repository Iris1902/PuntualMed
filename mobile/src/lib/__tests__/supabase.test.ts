const mockGetSession = jest.fn();

jest.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getSession: mockGetSession } }),
}));
jest.mock("@react-native-async-storage/async-storage", () => ({}));
jest.mock("react-native-url-polyfill/auto", () => ({}));

beforeAll(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.EXPO_PUBLIC_API_BASE_URL = "http://api.test";
});

describe("getAccessToken", () => {
  it("returns the access token when a session exists", async () => {
    const { getAccessToken } = require("../supabase");
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: "jwt-abc" } },
    });
    await expect(getAccessToken()).resolves.toBe("jwt-abc");
  });

  it("returns null when there is no session", async () => {
    const { getAccessToken } = require("../supabase");
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await expect(getAccessToken()).resolves.toBeNull();
  });
});
