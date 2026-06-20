import { fireEvent, render, screen } from "@testing-library/react-native";
import { Input } from "../Input";

describe("Input", () => {
  it("shows the placeholder and reports changes", () => {
    const onChangeText = jest.fn();
    render(
      <Input
        value=""
        onChangeText={onChangeText}
        placeholder="Correo electronico"
      />,
    );
    const field = screen.getByPlaceholderText("Correo electronico");
    fireEvent.changeText(field, "a@b.com");
    expect(onChangeText).toHaveBeenCalledWith("a@b.com");
  });
});
