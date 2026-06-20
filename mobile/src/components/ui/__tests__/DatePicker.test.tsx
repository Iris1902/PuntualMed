import { fireEvent, render, screen } from "@testing-library/react-native";
import { DatePicker } from "../DatePicker";

describe("DatePicker", () => {
  it("calls onChange with the picked day in the shown month", () => {
    const onChange = jest.fn();
    render(<DatePicker value="2026-06-10" onChange={onChange} />);
    fireEvent.press(screen.getByText("15"));
    expect(onChange).toHaveBeenCalledWith("2026-06-15");
  });
});
