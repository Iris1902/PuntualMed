const mockApiRequest = jest.fn();
jest.mock("@/lib/api", () => ({ apiRequest: (...a: unknown[]) => mockApiRequest(...a) }));
jest.mock("@/lib/supabase", () => ({ getAccessToken: jest.fn() }));

import { fetchMe } from "../users-api";

describe("fetchMe", () => {
  it("requests /api/v1/users/me with the token provider", async () => {
    mockApiRequest.mockResolvedValue({ id: "u1", full_name: "Iris" });
    const me = await fetchMe();
    expect(me).toEqual({ id: "u1", full_name: "Iris" });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/v1/users/me",
      expect.objectContaining({ token: expect.any(Function) }),
    );
  });
});
