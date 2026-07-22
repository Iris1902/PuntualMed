import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react-native";

type DayStatus = "taken" | "missed" | "symptom" | "none";

export type CalendarDay = {
  date: string;
  status: DayStatus;
};

type Props = {
  data?: CalendarDay[];
  onDayPress?: (date: string) => void;
};

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Fecha local YYYY-MM-DD (evita el desfase de día que introduce toISOString()
// en zonas horarias negativas, ej. Ecuador UTC-5).
function localIso(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function MonthlyCalendar({
  data = [],
  onDayPress,
}: Props) {
  const today = new Date();

  // Genera exclusivamente los 7 días de la semana actual (de Lunes a Domingo)
  const currentWeek = useMemo(() => {
    const dayOfWeek = today.getDay(); // 0 es Domingo
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, []);

  function statusColor(date: Date) {
    const iso = localIso(date);

    const found = data.find(
      d => d.date === iso
    );

    switch (found?.status) {
      case "taken":
        return "#22C55E";

      case "missed":
        return "#EF4444";

      case "symptom":
        return "#F59E0B";

      default:
        return "transparent";
    }
  }

  return (
    <View className="bg-white rounded-3xl p-5 shadow-sm">

      {/* HEADER / TÍTULO */}

      <Text className="text-base font-bold text-slate-800 mb-4">
        Esta semana
      </Text>

      {/* DÍAS Y DÍAS DEL MES */}

      <View className="flex-row justify-between mb-4">

        {currentWeek.map((date, index) => {
          const isToday =
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();

          const dotColor = statusColor(date);

          return (
            <Pressable
              key={index}
              onPress={() =>
                onDayPress?.(
                  localIso(date)
                )
              }
              className={`w-11 py-2 items-center rounded-2xl ${
                isToday ? "bg-[#1E3A8A]" : "bg-transparent"
              }`}
            >
              {/* Día abreviado (Lun, Mar, etc.) */}
              <Text
                className={`text-xs mb-1 font-medium ${
                  isToday ? "text-slate-200" : "text-slate-400"
                }`}
              >
                {weekDays[index]}
              </Text>

              {/* Número del día */}
              <Text
                className={`text-base font-bold ${
                  isToday ? "text-white" : "text-slate-800"
                }`}
              >
                {date.getDate()}
              </Text>

              {/* Punto indicador de estado */}
              <View className="h-2 justify-center items-center mt-2">
                <View
                  style={{
                    backgroundColor: dotColor,
                  }}
                  className="w-2 h-2 rounded-full"
                />
              </View>

            </Pressable>
          );
        })}

      </View>

      {/* LEYENDA */}

      <View className="pt-3 border-t border-slate-100">

        <View className="flex-row justify-center space-x-4">

          <View className="flex-row items-center mr-3">

            <View className="w-2 h-2 rounded-full bg-green-500 mr-1.5"/>

            <Text className="text-xs text-slate-500 font-medium">

              Tomado

            </Text>

          </View>

          <View className="flex-row items-center mr-3">

            <View className="w-2 h-2 rounded-full bg-red-500 mr-1.5"/>

            <Text className="text-xs text-slate-500 font-medium">

              Omitido

            </Text>

          </View>

          <View className="flex-row items-center">

            <View className="w-2 h-2 rounded-full bg-amber-400 mr-1.5"/>

            <Text className="text-xs text-slate-500 font-medium">

              Síntoma

            </Text>

          </View>

        </View>

      </View>

    </View>
  );
}