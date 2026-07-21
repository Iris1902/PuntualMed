import { useCallback, useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/use-async";
import { confirmIntake, listIntakes } from "@/lib/intakes-api";
import { listMedications } from "@/lib/meds-api";
import { listSymptoms } from "@/lib/symptoms-api";
import { fetchMe } from "@/lib/users-api";
import {
  addDays,
  formatTime,
  monthRange,
  monthSummary,
  monthlyAdherence,
  monthlyCalendarData,
  nextPendingIntake,
  todaysMeds,
} from "@/lib/home-data";

import Header from "@/components/ui/home/Header";
import NextMedicationCard from "@/components/ui/home/NextMedicationCard";
import TodayMedications from "@/components/ui/home/TodayMedications";
import MonthlyCalendar from "@/components/ui/home/MonthlyCalendar";
import MonthlySummary from "@/components/ui/home/MonthlySummary";
import AdherenceCard from "@/components/ui/home/AdherenceCard";

// Rango de datos a traer: desde el 1° del mes anterior hasta una semana después del fin del mes actual
function loadRange(now: Date) {
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const { from } = monthRange(prevMonth);
  const { to } = monthRange(now);
  return { from, to: monthRange(addDays(new Date(to), 7)).from };
}

async function loadHome() {
  const now = new Date();
  const { from, to } = loadRange(now);
  const [intakes, meds, symptoms, me] = await Promise.all([
    listIntakes({ from, to }),
    listMedications(),
    listSymptoms(),
    fetchMe(),
  ]);
  return { intakes, meds, symptoms, me };
}

function greetingByHour(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "Buenos días";
  if (hour >= 12 && hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function Home() {
  const router = useRouter();
  const { session } = useAuth();
  const { data, error, loading, reload } = useAsync(loadHome);

  // Obtiene el nombre del usuario prioritariamente desde fetchMe() (full_name o name).
  // Si no existe o está vacío, usa el email o "Usuario".
  const userFullName = data?.me?.full_name?.trim() || data?.me?.name?.trim();
  const greetName = userFullName || session?.user?.email || "Usuario";

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
  const calendarData = data ? monthlyCalendarData(data.intakes, data.symptoms, now) : [];
  const summary = data ? monthSummary(data.intakes, data.symptoms, now) : null;
  const adherenceStats = data ? monthlyAdherence(data.intakes, now) : null;

  const adherenceDifference = useMemo(() => {
    if (!data || !adherenceStats) return 0;
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previous = monthlyAdherence(data.intakes, prevMonth);
    return adherenceStats.percentage - previous.percentage;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, adherenceStats]);

  const goProfile = useCallback(() => router.push("/profile"), [router]);
  const goNotifications = useCallback(() => router.push("/notifications"), [router]);
  const goCalendar = useCallback(() => router.push("/calendar"), [router]);
  const goMedication = useCallback(
    (intakeId: string) => {
      const intake = data?.intakes.find((i) => i.id === intakeId);
      if (intake) {
        router.push({ pathname: "/medication-detail", params: { id: intake.medication_id } });
      }
    },
    [data, router],
  );

  async function onConfirm(id: string) {
    await confirmIntake(id);
    reload();
  }

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <Header
        greeting={greetingByHour()}
        name={greetName}
        onNotifications={goNotifications}
        onProfile={goProfile}
      />

      {loading && <Text className="text-center text-xs text-muted my-1">Actualizando datos...</Text>}
      {error && <Text className="text-center text-xs text-danger my-1">No se pudo cargar el inicio</Text>}

      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-10">
        {upcoming && upcomingMed ? (
          <NextMedicationCard
            medication={`${upcomingMed.name} ${upcomingMed.dose}`}
            dose="Vía oral"
            hour={formatTime(upcoming.scheduled_at)}
            onConfirm={() => onConfirm(upcoming.id)}
          />
        ) : (
          <View className="mt-4 rounded-3xl bg-[#0B3AAE] p-6 items-center justify-center">
            <Text className="text-white font-semibold text-base">
              No tienes tomas pendientes inmediatas
            </Text>
          </View>
        )}

        <TodayMedications
          medications={todayMedsList.map((row) => ({
            id: row.id,
            name: row.name,
            dosage: row.dose,
            hour: row.time,
            status: row.status,
          }))}
          onPressMedication={goMedication}
        />

        <View className="mt-5">
          <MonthlyCalendar data={calendarData} onDayPress={goCalendar} />
        </View>

        {summary && (
          <MonthlySummary
            taken={summary.taken}
            pending={summary.pending}
            missed={summary.missed}
            symptoms={summary.symptoms}
          />
        )}

        {adherenceStats && (
          <AdherenceCard
            percentage={adherenceStats.percentage}
            completed={adherenceStats.completed}
            total={adherenceStats.total}
            difference={adherenceDifference}
          />
        )}
      </ScrollView>
    </View>
  );
}