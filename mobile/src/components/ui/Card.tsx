import { View, type ViewProps } from "react-native";

type CardProps = ViewProps & {
  className?: string;
};

export function Card({ children, className = "", ...rest }: CardProps) {
  return (
    <View className={`rounded bg-white p-4 ${className}`} {...rest}>
      {children}
    </View>
  );
}
