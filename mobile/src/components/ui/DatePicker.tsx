import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { daysInMonth } from "@/lib/calendar-data";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

function pad(n: number): string {
  return `${n}`.padStart(2, "0");
}

export function DatePicker({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const initial = value ? new Date(`${value}T00:00:00`) : new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [month0, setMonth0] = useState(initial.getMonth());

  function move(delta: number) {
    const d = new Date(year, month0 + delta, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  }

  return (
    <View className="rounded border border-border p-2">
      <View className="mb-2 flex-row items-center justify-between">
        <Pressable accessibilityRole="button" onPress={() => move(-1)}><Text className="px-2 text-sky">{"<"}</Text></Pressable>
        <Text className="font-semibold text-primary">{MONTHS[month0]} {year}</Text>
        <Pressable accessibilityRole="button" onPress={() => move(1)}><Text className="px-2 text-sky">{">"}</Text></Pressable>
      </View>
      <View className="flex-row flex-wrap">
        {daysInMonth(year, month0).map((d) => {
          const iso = `${year}-${pad(month0 + 1)}-${pad(d)}`;
          const selected = iso === value;
          return (
            <Pressable
              key={iso}
              accessibilityRole="button"
              onPress={() => onChange(iso)}
              className={`h-9 w-[14.28%] items-center justify-center rounded ${selected ? "bg-primary" : ""}`}
            >
              <Text className={selected ? "text-white" : "text-primary"}>{d}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
