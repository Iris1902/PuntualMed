import { ApiError, apiRequest } from "../api";

describe("apiRequest", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    process.env.EXPO_PUBLIC_API_BASE_URL = "http://api.test";
  });

  afterEach(() => {
    process.env = { ...original };
    jest.restoreAllMocks();
  });

  function mockFetch(status: number, body: unknown) {
    return jest.spyOn(global, "fetch").mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
    } as Response);
  }

  it("builds the URL from base + path and parses JSON", async () => {
    const fetchSpy = mockFetch(200, { id: 1 });
    const result = await apiRequest<{ id: number }>("/users/me");
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api.test/users/me",
      expect.objectContaining({ method: "GET" }),
    );
    expect(result).toEqual({ id: 1 });
  });

  it("attaches the Bearer token when the provider returns one", async () => {
    const fetchSpy = mockFetch(200, {});
    await apiRequest("/users/me", { token: async () => "jwt-123" });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer jwt-123",
    );
  });

  it("omits Authorization when the provider returns null", async () => {
    const fetchSpy = mockFetch(200, {});
    await apiRequest("/users/me", { token: async () => null });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it("throws ApiError with the status on a non-2xx response", async () => {
    mockFetch(404, { detail: "not found" });
    await expect(apiRequest("/missing")).rejects.toMatchObject({
      name: "ApiError",
      status: 404,
    });
  });

  it("serializes the body as JSON for non-GET requests", async () => {
    const fetchSpy = mockFetch(201, {});
    await apiRequest("/symptoms", { method: "POST", body: { description: "x" } });
    const init = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe(JSON.stringify({ description: "x" }));
  });
});

it("exports ApiError as an Error subclass", () => {
  expect(new ApiError(500, "boom") instanceof Error).toBe(true);
});
