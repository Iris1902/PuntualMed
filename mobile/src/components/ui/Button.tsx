import { Pressable, Text } from "react-native";

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  disabled?: boolean;
};

const containerByVariant = {
  primary: "bg-primary",
  secondary: "bg-surface border border-border",
};

const textByVariant = {
  primary: "text-white",
  secondary: "text-primary",
};

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled = false,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      className={`h-12 items-center justify-center rounded ${containerByVariant[variant]} ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <Text className={`font-semibold ${textByVariant[variant]}`}>{label}</Text>
    </Pressable>
  );
}
