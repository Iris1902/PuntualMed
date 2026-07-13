import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { FontAwesome6, MaterialCommunityIcons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { useAsync } from "@/lib/use-async";
import { listIntakes } from "@/lib/intakes-api";
import { listMedications } from "@/lib/meds-api";
import { listSymptoms } from "@/lib/symptoms-api";
import { dayDetail, dayStatuses, daysInMonth, statusColor, statusIcon } from "@/lib/calendar-data";

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function pad(n: number): string {
  return `${n}`.padStart(2, "0");
}

export default function Calendar() {
  const base = new Date();
  const [offset, setOffset] = useState(0);
  const view = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  const year = view.getFullYear();
  const month0 = view.getMonth();
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    const from = `${year}-${pad(month0 + 1)}-01`;
    const to = `${year}-${pad(month0 + 1)}-${daysInMonth(year, month0).length}`;
    const [intakes, meds, symptoms] = await Promise.all([
      listIntakes({ from, to }),
      listMedications(),
      listSymptoms(),
    ]);
    return { intakes, meds, symptoms };
  }, [year, month0]);

  const { data, loading, reload } = useAsync(load);

  useEffect(() => {
    reload();
  }, [offset, reload]);

  const now = new Date();
  const statuses = data ? dayStatuses(data.intakes, data.symptoms, now) : {};
  const detail = data && selected ? dayDetail(data.intakes, data.meds, data.symptoms, selected, now) : null;

  // Lógica de conteo para las tarjetas estadísticas inferiores basadas en los datos actuales
  const stats = {
    taken: Object.values(statuses).filter(s => s?.taken).length,
    missed: Object.values(statuses).filter(s => s?.missed).length,
    symptoms: Object.values(statuses).filter(s => s?.symptom).length,
  };

  return (
    <ScrollView className="flex-1 bg-[#F3F4F6]" contentContainerClassName="gap-4 pb-10">
      
      {/* Header de Navegación de Meses */}
      <View className="flex-row items-center justify-between bg-white px-4 h-14 border-b border-[#E5E7EB]">
        <Pressable 
          accessibilityRole="button" 
          onPress={() => setOffset((o) => o - 1)}
          className="w-9 h-9 items-center justify-center rounded-full active:bg-gray-100"
        >
          <FontAwesome6 name="chevron-left" size={16} color="#1E293B" />
        </Pressable>
        <Text className="text-[17px] font-semibold text-[#1E293B]">
          {MONTHS[month0]} {year}
        </Text>
        <Pressable 
          accessibilityRole="button" 
          onPress={() => setOffset((o) => o + 1)}
          className="w-9 h-9 items-center justify-center rounded-full active:bg-gray-100"
        >
          <FontAwesome6 name="chevron-right" size={16} color="#1E293B" />
        </Pressable>
      </View>

      <View className="px-4 gap-4">
        {loading ? <Text className="text-center font-sans text-gray-400 my-1">Cargando...</Text> : null}

        {/* Contenedor Principal del Calendario */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          
          {/* Nombres de los días */}
          <View className="flex-row mb-2">
            {DAY_NAMES.map((d) => (
              <Text key={d} className="flex-1 text-center text-[#9CA3AF] text-[11px] font-medium py-1">
                {d}
              </Text>
            ))}
          </View>

          {/* Rejilla del Calendario */}
          <View className="flex-row flex-wrap">
            {daysInMonth(year, month0).map((d) => {
              const key = `${year}-${pad(month0 + 1)}-${pad(d)}`;
              const f = statuses[key];
              const todayKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
              const isToday = key === todayKey;
              const isSelected = key === selected;

              // Estilos visuales adaptados a la interfaz
              let cellClass = "h-[54px] w-[14.28%] items-center justify-center py-1 rounded-xl";
              let textClass = "text-[14px] font-semibold mb-1 ";

              if (isToday) {
                cellClass += " bg-[#1E3A8A]";
                textClass += " text-white";
              } else if (isSelected) {
                cellClass += " bg-[#EFF6FF]";
                textClass += " text-[#1E293B]";
              } else {
                textClass += " text-[#1E293B]";
              }

              return (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  onPress={() => setSelected(key === selected ? null : key)}
                  className={cellClass}
                >
                  <Text className={textClass}>{d}</Text>
                  
                  {/* Indicadores de estado inferiores corregidos nativamente */}
                  <View className="flex-row gap-0.5 h-1.5 items-center justify-center">
                    {f?.taken ? <View className="h-1.5 w-1.5 rounded-full bg-[#34D399]" /> : null}
                    {f?.missed ? <View className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" /> : null}
                    {f?.pending ? <View className="h-1.5 w-1.5 rounded-full bg-[#38BDF8]" /> : null}
                    {f?.symptom ? <View className="h-1.5 w-1.5 rounded-full bg-[#FCD34D]" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Leyenda Horizontal Inferior */}
          <View className="flex-row justify-center gap-4 pt-3 mt-3 border-t border-[#F3F4F6]">
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-[#34D399]" />
              <Text className="text-[#6B7280] text-[11px]">Tomado</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-[#EF4444]" />
              <Text className="text-[#6B7280] text-[11px]">Omitido</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <View className="w-2 h-2 rounded-full bg-[#FCD34D]" />
              <Text className="text-[#6B7280] text-[11px]">Síntoma</Text>
            </View>
          </View>
        </View>

        {/* Bloque Estadístico de 3 Columnas */}
        <View className="flex-row gap-3">
          {/* Tarjeta de Tomados */}
          <View className="flex-1 rounded-2xl p-4 items-center justify-center shadow-sm bg-[#ECFDF5]">
            <MaterialCommunityIcons name="pill" size={18} color="#34D399" className="mb-1" />
            <Text className="font-bold text-[22px] text-[#34D399]">{stats.taken}</Text>
            <Text className="text-[#6B7280] text-[11px]">Tomados</Text>
          </View>

          {/* Tarjeta de Omitidos */}
          <View className="flex-1 rounded-2xl p-4 items-center justify-center shadow-sm bg-[#FEF2F2]">
            <MaterialCommunityIcons name="heart-flash" size={18} color="#EF4444" className="mb-1" />
            <Text className="font-bold text-[22px] text-[#EF4444]">{stats.missed}</Text>
            <Text className="text-[#6B7280] text-[11px]">Omitidos</Text>
          </View>

          {/* Tarjeta de Síntomas */}
          <View className="flex-1 rounded-2xl p-4 items-center justify-center shadow-sm bg-[#FFFBEB]">
            <MaterialCommunityIcons name="sine-wave" size={18} color="#F59E0B" className="mb-1" />
            <Text className="font-bold text-[22px] text-[#F59E0B]">{stats.symptoms}</Text>
            <Text className="text-[#6B7280] text-[11px]">Síntomas</Text>
          </View>
        </View>

        {/* Desglose Detallado del Día Seleccionado (Card) */}
        {detail ? (
          <Card className="gap-2 p-4 bg-white rounded-2xl shadow-sm">
            <View className="flex-row justify-between items-center border-b border-[#F3F4F6] pb-2">
              <Text className="font-bold text-[15px] text-[#1E293B]">Detalles: {selected}</Text>
              <Pressable onPress={() => setSelected(null)}>
                <FontAwesome6 name="xmark" size={16} color="#6B7280" />
              </Pressable>
            </View>
            
            {detail.meds.length === 0 && detail.symptoms.length === 0 ? (
              <Text className="font-sans text-gray-400 text-center py-2">Sin registros para este día</Text>
            ) : null}

            {/* Medicamentos */}
            {detail.meds.map((m) => (
              <View key={m.id} className="flex-row items-center justify-between py-1.5 border-b border-gray-50">
                <Text className="font-sans text-[#1E293B] text-[14px]">{m.name}</Text>
                <View className="flex-row items-center gap-1.5">
                  <Text className={`text-[12px] font-medium ${statusColor(m.status)}`}>
                    {m.time} {statusIcon(m.status)}
                  </Text>
                </View>
              </View>
            ))}

            {/* Síntomas */}
            {detail.symptoms.map((s) => (
              <View key={s.id} className="mt-2 pt-1">
                <Text className="font-semibold text-[#1E293B] text-[13px] mb-1">Síntomas registrados:</Text>
                <View className="bg-[#FEF9C3] rounded-full px-3 py-1.5 align-self-start">
                  <Text className="text-[#713F12] text-[12px] font-medium">⚠️ {s.description}</Text>
                </View>
              </View>
            ))}
          </Card>
        ) : null}
      </View>
    </ScrollView>
  );
}