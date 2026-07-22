import { Text, View } from "react-native";

type Props = {
  percentage: number;
  completed: number;
  total: number;
  difference?: number;
};

export default function AdherenceCard({
  percentage,
  completed,
  total,
  difference = 0,
}: Props) {

  function getMessage() {

    if (percentage >= 90)
      return {
        text: "🎉 ¡Excelente adherencia!",
        color: "text-green-600",
      };

    if (percentage >= 75)
      return {
        text: "👏 Muy buen trabajo",
        color: "text-blue-600",
      };

    if (percentage >= 60)
      return {
        text: "⚠️ Puedes mejorar",
        color: "text-yellow-600",
      };

    return {
      text: "❌ Baja adherencia",
      color: "text-red-600",
    };
  }

  const progress = getMessage();

  return (

    <View className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mt-5">

      <Text className="text-lg font-bold text-slate-900">

        Adherencia mensual

      </Text>

      <Text className="text-5xl font-bold text-center text-[#1E3A8A] mt-5">

        {percentage}%

      </Text>

      {/* Barra */}

      <View className="h-4 rounded-full bg-slate-200 mt-6 overflow-hidden">

        <View
          className="h-full rounded-full bg-[#1E3A8A]"
          style={{
            width: `${percentage}%`,
          }}
        />

      </View>

      <Text className="text-center text-slate-500 mt-4">

        {completed} de {total} dosis registradas

      </Text>

      <Text
        className={`text-center font-semibold mt-2 ${progress.color}`}
      >
        {progress.text}
      </Text>

      <View className="items-center mt-5">

        <View className="bg-slate-100 rounded-full px-4 py-2">

          <Text className="text-slate-600 font-medium">

            {difference >= 0 ? "+" : ""}

            {difference}% respecto al mes anterior

          </Text>

        </View>

      </View>

    </View>

  );
}
