import { render, screen, waitFor } from "@testing-library/react-native";
import Profile from "../profile";

jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock("@/lib/auth", () => ({ useAuth: () => ({ session: { user: { email: "t@e.com" } } }) }));
jest.mock("@/lib/users-api", () => ({
  fetchMe: jest.fn().mockResolvedValue({ id: "u1", full_name: "Iris" }),
  updateProfile: jest.fn().mockResolvedValue({ id: "u1", full_name: "Iris" }),
}));
jest.mock("@/lib/auth-actions", () => ({
  updatePassword: jest.fn().mockResolvedValue({ error: null }),
  signOut: jest.fn().mockResolvedValue(undefined),
}));

describe("Profile screen", () => {
  it("shows the email and the loaded name", async () => {
    render(<Profile />);
    expect(screen.getByText(/t@e.com/)).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByDisplayValue("Iris")).toBeOnTheScreen());
  });

  it("renders the logout action", () => {
    render(<Profile />);
    expect(screen.getByText("Cerrar sesión")).toBeOnTheScreen();
  });
});
