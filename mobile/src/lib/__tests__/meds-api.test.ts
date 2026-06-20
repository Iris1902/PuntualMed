const mockApiRequest = jest.fn();
jest.mock("@/lib/api", () => ({ apiRequest: (...a: unknown[]) => mockApiRequest(...a) }));
jest.mock("@/lib/supabase", () => ({ getAccessToken: jest.fn() }));

import { listMedications } from "../meds-api";

describe("listMedications", () => {
  it("requests /api/v1/medications with the token provider", async () => {
    mockApiRequest.mockResolvedValue([{ id: "m1", name: "Losartan", dose: "50mg" }]);
    const meds = await listMedications();
    expect(meds).toEqual([{ id: "m1", name: "Losartan", dose: "50mg" }]);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "/api/v1/medications",
      expect.objectContaining({ token: expect.any(Function) }),
    );
  });
});
