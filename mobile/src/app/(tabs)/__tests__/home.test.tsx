import { render, screen, waitFor } from "@testing-library/react-native";
import Home from "../home";

// Fecha estatica futura (no relativa): el factory de jest.mock se hoistea sobre las
// variables del modulo, asi que el intake pendiente "siempre futuro" hace el test
// independiente de la fecha del sistema.
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@/lib/auth", () => ({ useAuth: () => ({ session: { user: { email: "t@e.com" } } }) }));
jest.mock("@/lib/intakes-api", () => ({
  listIntakes: jest.fn().mockResolvedValue([
    { id: "i1", medication_id: "m1", scheduled_at: "2099-12-31T10:00:00.000Z", status: "pending" },
  ]),
}));
jest.mock("@/lib/meds-api", () => ({
  listMedications: jest.fn().mockResolvedValue([{ id: "m1", name: "Losartan", dose: "50mg" }]),
}));
jest.mock("@/lib/users-api", () => ({
  fetchMe: jest.fn().mockResolvedValue({ id: "u1", full_name: "Iris" }),
}));

describe("Home dashboard", () => {
  it("shows the greeting and the upcoming medication once loaded", async () => {
    render(<Home />);
    await waitFor(() => expect(screen.getByText(/Losartan/)).toBeOnTheScreen());
    expect(screen.getByText(/Iris/)).toBeOnTheScreen();
  });
});
