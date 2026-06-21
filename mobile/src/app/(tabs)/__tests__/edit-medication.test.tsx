import { render, screen, waitFor } from "@testing-library/react-native";
import EditMedication from "../edit-medication";

jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }), useLocalSearchParams: () => ({ id: "m1" }) }));
jest.mock("@/lib/meds-api", () => ({
  getMedication: jest.fn().mockResolvedValue({
    id: "m1", name: "Losartan", dose: "50 mg", start_date: "2026-06-20", duration_days: 30,
    notes: null, schedules: [{ id: "s1", time_of_day: "09:00:00" }],
  }),
  deleteMedication: jest.fn(), createMedication: jest.fn(),
}));

describe("EditMedication", () => {
  it("prefills the medication name", async () => {
    render(<EditMedication />);
    await waitFor(() => expect(screen.getByDisplayValue("Losartan")).toBeOnTheScreen());
  });
});
