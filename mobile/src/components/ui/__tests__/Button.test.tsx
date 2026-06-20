import { fireEvent, render, screen } from "@testing-library/react-native";
import { Button } from "../Button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button label="Iniciar sesion" onPress={() => {}} />);
    expect(screen.getByText("Iniciar sesion")).toBeOnTheScreen();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    render(<Button label="Continuar" onPress={onPress} />);
    fireEvent.press(screen.getByText("Continuar"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("does not call onPress when disabled", () => {
    const onPress = jest.fn();
    render(<Button label="Continuar" onPress={onPress} disabled />);
    fireEvent.press(screen.getByText("Continuar"));
    expect(onPress).not.toHaveBeenCalled();
  });
});
