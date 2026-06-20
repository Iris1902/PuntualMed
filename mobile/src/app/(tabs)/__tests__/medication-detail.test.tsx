import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import MedicationDetail from "../medication-detail";
import { deleteMedication } from "@/lib/meds-api";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: () => mockBack() }),
  useLocalSearchParams: () => ({ id: "m1" }),
}));
jest.mock("@/lib/meds-api", () => ({
  getMedication: jest.fn().mockResolvedValue({
    id: "m1", name: "Losartan", dose: "50mg", frequency_hours: 24,
    start_date: "2026-06-20", end_date: "2026-07-20", duration_days: 30,
    notes: null, source: "manual", active: true, created_at: "2026-06-20T00:00:00Z",
    schedules: [{ id: "s1", time_of_day: "09:00:00" }],
  }),
  deleteMedication: jest.fn().mockResolvedValue(undefined),
}));

describe("MedicationDetail", () => {
  it("shows the medication once loaded", async () => {
    render(<MedicationDetail />);
    await waitFor(() => expect(screen.getByText(/Losartan/)).toBeOnTheScreen());
  });

  it("deletes after confirming and navigates back", async () => {
    render(<MedicationDetail />);
    await waitFor(() => expect(screen.getByText("Eliminar")).toBeOnTheScreen());
    fireEvent.press(screen.getByText("Eliminar"));
    fireEvent.press(screen.getByText("Confirmar"));
    await waitFor(() => expect(deleteMedication).toHaveBeenCalledWith("m1"));
  });
});
