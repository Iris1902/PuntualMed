import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { CheckCircle2 } from "lucide-react-native";

type Props = {
  medication: string;
  dose: string;
  hour: string;
  onConfirm: () => void;
};

export default function NextMedicationCard({
  medication,
  dose,
  hour,
  onConfirm,
}: Props) {
  return (
    <LinearGradient
      colors={["#0F4CDE", "#0B3AAE"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="mx-5 mt-4 overflow-hidden rounded-3xl p-6"
    >
      {/* Círculos decorativos */}
      <View className="absolute -right-10 -top-8 h-40 w-40 rounded-full bg-white/10" />
      <View className="absolute -bottom-16 right-6 h-56 w-56 rounded-full bg-white/5" />

      <Text className="text-xs font-semibold tracking-widest text-blue-100">
        PRÓXIMA TOMA
      </Text>

      <Text className="mt-4 text-4xl font-bold text-white">
        {medication}
      </Text>

      <Text className="mt-1 text-xl text-blue-100">
        {dose}
      </Text>

      <View className="mt-8 flex-row items-end justify-between">
        <View>
          <Text className="text-5xl font-bold text-white">
            {hour}
          </Text>

          <Text className="mt-2 text-base text-blue-100">
            Próxima dosis asignada
          </Text>
        </View>

        <Pressable
          onPress={onConfirm}
          className="flex-row items-center rounded-2xl bg-white px-5 py-4"
        >
          <CheckCircle2
            size={22}
            color="#0F4CDE"
          />

          <Text className="ml-3 text-lg font-semibold text-blue-700">
            Registrar toma
          </Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}