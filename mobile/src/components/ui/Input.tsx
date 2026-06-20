import { TextInput, type TextInputProps } from "react-native";
import { colors } from "@/theme/colors";

type InputProps = TextInputProps & {
  value: string;
  onChangeText: (text: string) => void;
};

export function Input({ value, onChangeText, ...rest }: InputProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor={colors.subtle}
      className="h-12 rounded border border-border bg-surface px-4 font-sans text-base"
      {...rest}
    />
  );
}
