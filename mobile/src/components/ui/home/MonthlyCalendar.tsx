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

const weekDays = ["L", "M", "M", "J", "V", "S", "D"];

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
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthName = currentMonth.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  const days = useMemo(() => {
    const firstDay = new Date(year, month, 1);

    const lastDay = new Date(year, month + 1, 0);

    const firstWeekDay = firstDay.getDay();

    const totalDays = lastDay.getDate();

    const calendar = [];

    const offset = firstWeekDay === 0 ? 6 : firstWeekDay - 1;

    for (let i = 0; i < offset; i++) {
      calendar.push(null);
    }

    for (let day = 1; day <= totalDays; day++) {
      calendar.push(
        new Date(year, month, day)
      );
    }

    return calendar;
  }, [month, year]);

  function previousMonth() {
    setCurrentMonth(
      new Date(year, month - 1, 1)
    );
  }

  function nextMonth() {
    setCurrentMonth(
      new Date(year, month + 1, 1)
    );
  }

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
        return "#CBD5E1";
    }
  }

  const today = new Date();

  return (
    <View className="bg-white rounded-3xl p-5 shadow-sm">

      {/* HEADER */}

      <View className="flex-row items-center justify-between mb-5">

        <Pressable
          onPress={previousMonth}
          className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
        >
          <ChevronLeft
            color="#1E293B"
            size={20}
          />
        </Pressable>

        <Text className="text-lg font-bold capitalize text-slate-900">

          {monthName}

        </Text>

        <Pressable
          onPress={nextMonth}
          className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center"
        >
          <ChevronRight
            color="#1E293B"
            size={20}
          />
        </Pressable>

      </View>

      {/* DÍAS */}

      <View className="flex-row justify-between mb-4">

        {weekDays.map((day, index) => (

          <Text
            key={`${day}-${index}`}
            className="w-10 text-center text-slate-500 font-semibold"
          >
            {day}
          </Text>

        ))}

      </View>

      {/* CALENDARIO */}

      <View className="flex-row flex-wrap">

        {days.map((date, index) => {

          if (!date) {
            return (
              <View
                key={index}
                className="w-[14.28%] h-14"
              />
            );
          }

          const isToday =
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();

          return (
            <Pressable
              key={index}
              onPress={() =>
                onDayPress?.(
                  localIso(date)
                )
              }
              className="w-[14.28%] h-16 items-center justify-center"
            >

              <View
                className={`w-10 h-10 rounded-full items-center justify-center ${
                  isToday
                    ? "bg-[#1E3A8A]"
                    : ""
                }`}
              >

                <Text
                  className={`font-semibold ${
                    isToday
                      ? "text-white"
                      : "text-slate-900"
                  }`}
                >
                  {date.getDate()}
                </Text>

              </View>

              <View
                style={{
                  backgroundColor:
                    statusColor(date),
                }}
                className="w-2 h-2 rounded-full mt-1"
              />

            </Pressable>
          );
        })}

      </View>

      {/* LEYENDA */}

      <View className="mt-5 pt-4 border-t border-slate-100">

        <View className="flex-row justify-between">

          <View className="flex-row items-center">

            <View className="w-2 h-2 rounded-full bg-green-500 mr-2"/>

            <Text className="text-xs text-slate-500">

              Tomado

            </Text>

          </View>

          <View className="flex-row items-center">

            <View className="w-2 h-2 rounded-full bg-red-500 mr-2"/>

            <Text className="text-xs text-slate-500">

              Omitido

            </Text>

          </View>

          <View className="flex-row items-center">

            <View className="w-2 h-2 rounded-full bg-amber-400 mr-2"/>

            <Text className="text-xs text-slate-500">

              Síntoma

            </Text>

          </View>

        </View>

      </View>

    </View>
  );
}