import { Text, View } from "react-native";

// Splash de marca. El guard del root layout redirige a /login o /home segun la sesion.
export default function Index() {
  return (
    <View className="flex-1 items-center justify-center bg-primary">
      <Text className="text-4xl font-bold text-white">PuntualMed</Text>
    </View>
  );
}
