import { fireEvent, render, screen } from "@testing-library/react-native";
import AddMedication from "../add-medication";
import { createMedication } from "@/lib/meds-api";

const mockBack = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ back: () => mockBack() }) }));
jest.mock("@/lib/meds-api", () => ({ createMedication: jest.fn().mockResolvedValue({ id: "m9" }) }));

describe("AddMedication", () => {
  it("does not submit and shows an error when the name is empty", () => {
    render(<AddMedication />);
    fireEvent.press(screen.getByText("Guardar"));
    expect(createMedication).not.toHaveBeenCalled();
    expect(screen.getByText(/obligatorio/i)).toBeOnTheScreen();
  });
});
