import { Image, Pressable, Text, View } from "react-native";
import { Bell, User } from "lucide-react-native";

type HeaderProps = {
  greeting: string;
  name: string;
  onNotifications: () => void;
  onProfile: () => void;
};

export default function Header({
  greeting,
  name,
  onNotifications,
  onProfile,
}: HeaderProps) {
  return (
    <View className="bg-white px-5 pt-4 pb-5 border-b border-gray-100">

      <View className="flex-row items-center justify-between">

        <View className="flex-row items-center flex-1">

          <View className="w-12 h-12 rounded-full border border-gray-200 overflow-hidden">

            <Image
              source={require("../../../../assets/images/logo.png")}
              className="w-full h-full"
              resizeMode="contain"
            />

          </View>

          <View className="ml-3 flex-1">

            <Text className="text-gray-500 text-xs font-medium">
              {greeting}
            </Text>

            <Text
              className="text-slate-900 font-bold text-lg"
              numberOfLines={1}
            >
              Hola, {name} 👋
            </Text>

          </View>

        </View>

        <View className="flex-row items-center">

          <Pressable
            onPress={onNotifications}
            className="w-11 h-11 rounded-full bg-slate-100 justify-center items-center mr-2"
          >
            <Bell color="#1E3A8A" size={21} />

            <View className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />

          </Pressable>

          <Pressable
            onPress={onProfile}
            className="w-11 h-11 rounded-full bg-[#1E3A8A] justify-center items-center"
          >
            <User color="white" size={21} />
          </Pressable>

        </View>

      </View>

    </View>
  );
}