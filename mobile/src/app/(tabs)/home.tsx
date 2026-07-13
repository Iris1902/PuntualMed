import { useCallback } from "react";
import { Pressable, ScrollView, Text, View, Image } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/use-async";
import { confirmIntake, listIntakes } from "@/lib/intakes-api";
import { listMedications } from "@/lib/meds-api";
import { fetchMe } from "@/lib/users-api";
import { adherence, formatTime, nextPendingIntake, todaysMeds } from "@/lib/home-data";

// Iconos nativos compatibles para sustituir lucide-react web
import { Bell, User, Activity, Bot, CheckCircle2, Clock } from "lucide-react-native";

// Mock para el minicalendario semanal
const weekDays = [
  { day: 'Lun', num: 9, taken: true, missed: false, symptom: false },
  { day: 'Mar', num: 10, taken: true, missed: false, symptom: true },
  { day: 'Mié', num: 11, taken: true, missed: true, symptom: false },
  { day: 'Jue', num: 12, taken: false, missed: true, symptom: false },
  { day: 'Vie', num: 13, taken: true, missed: false, symptom: false },
  { day: 'Sáb', num: 14, taken: true, missed: false, symptom: false },
  { day: 'Dom', num: 15, taken: false, missed: false, symptom: false },
];

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

async function loadHome() {
  const [intakes, meds, me] = await Promise.all([
    listIntakes({ from: isoDate(-7), to: isoDate(7) }),
    listMedications(),
    fetchMe(),
  ]);
  return { intakes, meds, me };
}

export default function Home() {
  const router = useRouter();
  const { session } = useAuth();
  const { data, error, loading, reload } = useAsync(loadHome);
  const greetName = data?.me.full_name ?? session?.user?.email ?? "Usuario";

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const now = new Date();
  const upcoming = data ? nextPendingIntake(data.intakes, now) : null;
  const upcomingMed = upcoming
    ? (data!.meds.find((m) => m.id === upcoming.medication_id) ?? null)
    : null;
  const todayMedsList = data ? todaysMeds(data.intakes, data.meds, now) : [];
  const stats = data ? adherence(data.intakes, now) : null;

  const goProfile = useCallback(() => router.push("/profile"), [router]);
  const goNotifications = useCallback(() => router.push("/notifications"), [router]);
  const goRegisterSymptom = useCallback(() => router.push("/register-symptom"), [router]);
  const goAIChat = useCallback(() => router.push("/assistant"), [router]);

  async function onConfirm(id: string) {
    await confirmIntake(id);
    reload();
  }

  return (
    <View className="flex-1 bg-[#F3F4F6]">
      {/* Header */}
      <View className="bg-white flex-row items-center justify-between px-4 h-16 pt-2 border-b border-gray-100">
        <View className="flex-row items-center gap-3">
          {/* Logo circular corregido con 3 niveles hacia atrás */}
          <View className="w-9 h-9 rounded-full bg-white justify-center items-center p-0.5 border border-gray-200">
            <Image 
              source={require("../../../assets/images/logo.png")} 
              className="w-full h-full rounded-full"
              resizeMode="contain"
            />
          </View>
          <View>
            <Text className="text-[#6B7280] text-xs">Buenos días</Text>
            <Text className="text-[#1E293B] font-bold text-lg">Hola, {greetName} 👋</Text>
          </View>
        </View>
        
        <View className="flex-row items-center gap-2">
          <Pressable onPress={goNotifications} className="w-9 h-9 rounded-full bg-[#F3F4F6] items-center justify-center relative">
            <Bell size={20} className="text-[#1E293B]" />
            <View className="absolute top-1 right-1 w-2 h-2 bg-[#EF4444] rounded-full" />
          </Pressable>
          <Pressable onPress={goProfile} className="w-9 h-9 rounded-full bg-[#1E3A8A] items-center justify-center">
            <User size={20} className="text-white" />
          </Pressable>
        </View>
      </View>

      {/* Estado de Carga / Error */}
      {loading && <Text className="text-center text-xs text-muted my-1">Actualizando datos...</Text>}
      {error && <Text className="text-center text-xs text-danger my-1">No se pudo cargar el inicio</Text>}

      {/* Scrollable Content */}
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-4 pb-24">
        
        {/* Próxima toma card */}
        {upcoming && upcomingMed ? (
          <View className="rounded-2xl p-5 bg-[#1E3A8A] relative overflow-hidden">
            <View className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
            <View className="absolute -right-2 bottom-2 w-16 h-16 rounded-full bg-white/5" />
            
            <Text className="text-white/70 font-semibold mb-1 text-[11px] tracking-wider">PRÓXIMA TOMA</Text>
            <Text className="text-white font-bold text-xl mb-0.5">{upcomingMed.name} {upcomingMed.dose}</Text>
            <Text className="text-white/80 text-[15px] mb-3">Via oral</Text>
            
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-white font-bold text-2xl">{formatTime(upcoming.scheduled_at)}</Text>
                <Text className="text-white/70 text-xs">Próxima dosis asignada</Text>
              </View>
              <Pressable 
                onPress={() => onConfirm(upcoming.id)}
                className="bg-white/20 border border-white/30 rounded-2xl px-4 py-2 active:scale-95"
              >
                <Text className="text-white font-semibold text-xs">Registrar toma</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="rounded-2xl p-5 bg-[#1E3A8A]/80 items-center justify-center">
            <Text className="text-white font-semibold">No tienes tomas pendientes inmediatas</Text>
          </View>
        )}

        {/* Hoy Section (Horizontal Scroll) */}
        <View>
          <Text className="text-[#1E293B] font-semibold mb-3 text-base">Hoy</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pb-1">
            {todayMedsList.length === 0 ? (
              <View className="bg-white rounded-xl px-4 py-6 border border-[#F3F4F6] w-full items-center">
                <Text className="text-[#6B7280] text-sm">Sin tomas programadas para hoy</Text>
              </View>
            ) : (
              todayMedsList.map((row) => (
                <View key={row.id} className="bg-white rounded-xl p-3 border border-[#F3F4F6] shadow-sm min-w-[140px]">
                  <View className="flex-row items-center gap-1.5 mb-1.5">
                    <View className="w-5 h-5 rounded-full bg-[#EFF6FF] items-center justify-center">
                      <View className="w-2 h-2 rounded-full bg-[#1E3A8A]" />
                    </View>
                    <Text className="text-[#1E293B] font-semibold text-xs" numberOfLines={1}>{row.name}</Text>
                  </View>
                  <Text className="text-[#6B7280] text-[11px] mb-2">{row.dose} · {row.time}</Text>
                  
                  <View className={`flex-row items-center gap-1 rounded-full px-2 py-0.5 self-start ${
                    row.status === 'taken' ? 'bg-[#ECFDF5]' : 'bg-[#FFF7ED]'
                  }`}>
                    {row.status === 'taken' ? (
                      <>
                        <CheckCircle2 size={10} className="text-[#065F46]" />
                        <Text className="text-[#065F46] text-[10px]">Tomado</Text>
                      </>
                    ) : (
                      <>
                        <Clock size={10} className="text-[#92400E]" />
                        <Text className="text-[#92400E] text-[10px]">Pendiente</Text>
                      </>
                    )}
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        {/* Esta semana Mini Calendar */}
        <View>
          <Text className="text-[#1E293B] font-semibold mb-3 text-base">Esta semana</Text>
          <View className="bg-white rounded-2xl p-4 shadow-sm">
            <View className="flex-row justify-between gap-1">
              {weekDays.map((d) => (
                <Pressable
                  key={d.day}
                  onPress={() => router.push("/calendar")}
                  className={`flex-1 items-center py-2 rounded-xl ${
                    d.num === 14 ? 'bg-[#1E3A8A]' : 'bg-transparent'
                  }`}
                >
                  <Text className={`text-[10px] mb-1.5 ${d.num === 14 ? 'text-white/70' : 'text-[#6B7280]'}`}>{d.day}</Text>
                  <Text className={`font-semibold mb-1.5 text-sm ${d.num === 14 ? 'text-white' : 'text-[#1E293B]'}`}>{d.num}</Text>
                  <View className="flex-col gap-0.5 h-5 justify-center">
                    {d.taken && <View className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />}
                    {d.missed && <View className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />}
                    {d.symptom && <View className="w-1.5 h-1.5 rounded-full bg-[#FCD34D]" />}
                  </View>
                </Pressable>
              ))}
            </View>
            
            {/* Leyenda */}
            <View className="flex-row items-center justify-center gap-4 mt-3 pt-3 border-t border-[#F3F4F6]">
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
        </View>

        {/* Accesos rápidos */}
        <View>
          <Text className="text-[#1E293B] font-semibold mb-3 text-base">Accesos rápidos</Text>
          <View className="flex-row gap-3">
            <Pressable
              onPress={goRegisterSymptom}
              className="flex-1 bg-white rounded-2xl p-4 shadow-sm flex-col items-start gap-2 active:scale-95"
            >
              <View className="w-10 h-10 rounded-xl bg-[#ECFDF5] items-center justify-center">
                <Activity size={22} className="text-[#34D399]" />
              </View>
              <View>
                <Text className="text-[#1E293B] font-semibold text-sm">Registrar</Text>
                <Text className="text-[#1E293B] font-semibold text-sm">síntoma</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={goAIChat}
              className="flex-1 bg-white rounded-2xl p-4 shadow-sm flex-col items-start gap-2 active:scale-95"
            >
              <View className="w-10 h-10 rounded-xl bg-[#EFF6FF] items-center justify-center">
                <Bot size={22} className="text-[#38BDF8]" />
              </View>
              <View>
                <Text className="text-[#1E293B] font-semibold text-sm">Consultar</Text>
                <Text className="text-[#1E293B] font-semibold text-sm">IA</Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Adherencia Semanal */}
        <View className="bg-white rounded-2xl p-4 shadow-sm">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[#1E293B] font-semibold text-[15px]">Adherencia semanal</Text>
            <Text className="text-[#34D399] font-bold text-base">{stats ? `${stats.percent}%` : "0%"}</Text>
          </View>
          <View className="w-full bg-[#E5E7EB] rounded-full h-2.5 mb-2">
            <View 
              className="h-2.5 bg-[#34D399] rounded-full" 
              style={{ width: stats ? `${stats.percent}%` : '0%' }} 
            />
          </View>
          <Text className="text-[#6B7280] text-xs">
            {stats ? `${stats.taken} de ${stats.total} tomas registradas` : "Sin tomas registradas"}
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}