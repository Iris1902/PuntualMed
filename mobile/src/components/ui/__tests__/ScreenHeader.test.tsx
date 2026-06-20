import { fireEvent, render, screen } from "@testing-library/react-native";
import { ScreenHeader } from "../ScreenHeader";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ back: () => mockBack() }) }));

describe("ScreenHeader", () => {
  it("renders the title and goes back when pressed", () => {
    render(<ScreenHeader title="Perfil" />);
    expect(screen.getByText("Perfil")).toBeOnTheScreen();
    fireEvent.press(screen.getByText("Atrás"));
    expect(mockBack).toHaveBeenCalled();
  });
});
