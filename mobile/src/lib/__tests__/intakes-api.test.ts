const mockApiRequest = jest.fn();
jest.mock("@/lib/api", () => ({ apiRequest: (...a: unknown[]) => mockApiRequest(...a) }));
jest.mock("@/lib/supabase", () => ({ getAccessToken: jest.fn() }));

import { listIntakes } from "../intakes-api";

describe("listIntakes", () => {
  it("builds the date-filtered path", async () => {
    mockApiRequest.mockResolvedValue([]);
    await listIntakes({ from: "2026-06-14", to: "2026-06-28" });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/v1/intakes?from_date=2026-06-14&to_date=2026-06-28",
      expect.objectContaining({ token: expect.any(Function) }),
    );
  });
});
