import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

export function ScreenHeader({ title }: { title: string }) {
  const router = useRouter();
  return (
    <View className="flex-row items-center gap-3 pb-1">
      <Pressable accessibilityRole="button" onPress={() => router.back()}>
        <Text className="font-semibold text-sky">‹ <Text>Atrás</Text></Text>
      </Pressable>
      <Text className="text-xl font-bold text-primary">{title}</Text>
    </View>
  );
}
