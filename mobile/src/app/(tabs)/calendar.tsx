import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { palette } from "@/constants/puntualmed";
import { useAuth } from "@/contexts/auth";
import {
  getCalendar,
  getCalendarDay,
  type CalendarDay,
  type CalendarDayDetail,
} from "@/lib/api";

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function CalendarScreen() {
  const { session } = useAuth();
  const token = session?.access_token ?? "";
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation<any>();

  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<CalendarDay[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayDetail, setDayDetail] = useState<CalendarDayDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const fetchData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await getCalendar(token, 60);
      setDays(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const dayMap = useMemo(() => {
    const map = new Map<string, CalendarDay>();
    for (const d of days) map.set(d.day, d);
    return map;
  }, [days]);

  function daysInMonth(month: number, year: number): number {
    return new Date(year, month + 1, 0).getDate();
  }

  function firstDayOfMonth(month: number, year: number): number {
    return new Date(year, month, 1).getDay();
  }

  const calendarGrid = useMemo(() => {
    const totalDays = daysInMonth(currentMonth, currentYear);
    const startDay = firstDayOfMonth(currentMonth, currentYear);
    const grid: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) grid.push(null);
    for (let d = 1; d <= totalDays; d++) grid.push(d);
    return grid;
  }, [currentMonth, currentYear]);

  function isToday(day: number): boolean {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() &&
      currentYear === today.getFullYear()
    );
  }

  function dateStr(day: number): string {
    const m = String(currentMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${currentYear}-${m}-${d}`;
  }

  function getDayData(day: number): CalendarDay | undefined {
    return dayMap.get(dateStr(day));
  }

  async function loadDayDetail(dateString: string) {
    setSelectedDate(dateString);
    setDetailLoading(true);
    setDayDetail(null);
    try {
      const detail = await getCalendarDay(token, dateString);
      setDayDetail(detail);
    } catch {
      setDayDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDayPress(day: number) {
    loadDayDetail(dateStr(day));
  }

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else setCurrentMonth(currentMonth - 1);
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else setCurrentMonth(currentMonth + 1);
  }

  if (loading || !token) {
    return (
      <SafeAreaView
        style={[
          styles.safe,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={palette.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: tabBarHeight + 20 },
        ]}
      >
        <Text style={styles.kicker}>Calendario de tomas</Text>
        <Text style={styles.title}>Calendario</Text>

        <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <Pressable onPress={prevMonth} style={styles.monthArrow}>
              <Ionicons name="chevron-back" size={22} color={palette.navy} />
            </Pressable>
            <Text style={styles.monthTitle}>
              {MONTHS[currentMonth]} {currentYear}
            </Text>
            <Pressable onPress={nextMonth} style={styles.monthArrow}>
              <Ionicons name="chevron-forward" size={22} color={palette.navy} />
            </Pressable>
          </View>

          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={styles.weekdayText}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {calendarGrid.map((day, i) => {
              if (day === null)
                return <View key={`e-${i}`} style={styles.dayCell} />;
              const dd = getDayData(day);
              return (
                <Pressable
                  key={day}
                  style={[
                    styles.dayCell,
                    isToday(day) && styles.dayCellToday,
                    selectedDate === dateStr(day) && styles.dayCellSelected,
                  ]}
                  onPress={() => handleDayPress(day)}
                >
                  <Text
                    style={[
                      styles.dayNum,
                      isToday(day) && styles.dayNumToday,
                      selectedDate === dateStr(day) && styles.dayNumSelected,
                    ]}
                  >
                    {day}
                  </Text>
                  {dd && (
                    <View style={styles.dotsRow}>
                      {dd.taken > 0 && (
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: palette.mint },
                          ]}
                        />
                      )}
                      {dd.missed > 0 && (
                        <View
                          style={[styles.dot, { backgroundColor: palette.red }]}
                        />
                      )}
                      {dd.symptoms > 0 && (
                        <View
                          style={[
                            styles.dot,
                            { backgroundColor: palette.amberLight },
                          ]}
                        />
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: palette.mint }]}
            />
            <Text style={styles.legendText}>Tomado</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: palette.red }]}
            />
            <Text style={styles.legendText}>Omitido</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                { backgroundColor: palette.amberLight },
              ]}
            />
            <Text style={styles.legendText}>Sintomas</Text>
          </View>
        </View>

        {(() => {
          const total_taken = days.reduce((s, d) => s + d.taken, 0);
          const total_missed = days.reduce((s, d) => s + d.missed, 0);
          const total_symptoms = days.reduce((s, d) => s + d.symptoms, 0);
          const cards = [
            { label: "Tomados", value: total_taken, color: palette.mint },
            { label: "Omitidos", value: total_missed, color: palette.red },
            {
              label: "Sintomas",
              value: total_symptoms,
              color: palette.amberLight,
            },
          ];
          return (
            <View style={styles.statsRow}>
              {cards.map((c) => (
                <View
                  key={c.label}
                  style={[styles.statCard, { backgroundColor: c.color + "20" }]}
                >
                  <Text style={[styles.statValue, { color: c.color }]}>
                    {c.value}
                  </Text>
                  <Text style={[styles.statLabel, { color: c.color }]}>
                    {c.label}
                  </Text>
                </View>
              ))}
            </View>
          );
        })()}
      </ScrollView>

      <Modal visible={!!selectedDate} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedDate
                  ? new Date(selectedDate + "T12:00:00").toLocaleDateString(
                      "es-ES",
                      {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      },
                    )
                  : ""}
              </Text>
              <Pressable
                onPress={() => {
                  setSelectedDate(null);
                  setDayDetail(null);
                }}
              >
                <Ionicons name="close" size={24} color={palette.slate} />
              </Pressable>
            </View>

            {detailLoading && (
              <ActivityIndicator
                size="large"
                color={palette.navy}
                style={{ marginVertical: 40 }}
              />
            )}

            {dayDetail && !detailLoading && (
              <>
                {dayDetail.intakes.length === 0 &&
                  dayDetail.symptoms.length === 0 && (
                    <View style={styles.emptyDetail}>
                      <Ionicons
                        name="calendar-outline"
                        size={40}
                        color={palette.grayLight}
                      />
                      <Text style={styles.emptyDetailText}>
                        Sin actividad este dia
                      </Text>
                    </View>
                  )}

                {dayDetail.intakes.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Tomas</Text>
                    {dayDetail.intakes.map((i) => (
                      <View key={i.id} style={styles.detailRow}>
                        <Ionicons
                          name={
                            i.status === "taken"
                              ? "checkmark-circle"
                              : i.status === "missed"
                                ? "close-circle"
                                : "time"
                          }
                          size={20}
                          color={
                            i.status === "taken"
                              ? palette.mint
                              : i.status === "missed"
                                ? palette.red
                                : palette.amber
                          }
                        />
                        <View style={styles.detailRowBody}>
                          <Text style={styles.detailMedName}>
                            {i.medication_name || "Medicamento"}
                          </Text>
                          <Text style={styles.detailTime}>
                            {new Date(i.scheduled_at).toLocaleTimeString(
                              "es-ES",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.detailStatus,
                            {
                              color:
                                i.status === "taken"
                                  ? palette.mint
                                  : i.status === "missed"
                                    ? palette.red
                                    : palette.amber,
                            },
                          ]}
                        >
                          {i.status === "taken"
                            ? "Tomado"
                            : i.status === "missed"
                              ? "Omitido"
                              : "Pendiente"}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {dayDetail.symptoms.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Sintomas</Text>
                    {dayDetail.symptoms.map((s) => (
                      <View key={s.id} style={styles.detailRow}>
                        <Ionicons
                          name="pulse"
                          size={20}
                          color={palette.amber}
                        />
                        <View style={styles.detailRowBody}>
                          <Text style={styles.detailMedName}>
                            {s.description}
                          </Text>
                          <Text style={styles.detailTime}>
                            {new Date(s.occurred_at).toLocaleTimeString(
                              "es-ES",
                              { hour: "2-digit", minute: "2-digit" },
                            )}
                            {s.severity ? ` - ${s.severity}` : ""}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {dayDetail.symptoms.length > 0 && (
                  <Pressable
                    onPress={() => {
                      setSelectedDate(null);
                      setDayDetail(null);
                      navigation.navigate("sintomas");
                    }}
                    style={styles.fullDetailLink}
                  >
                    <Text style={styles.verDetalle}>
                      Ver detalle completo →
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  content: { gap: 14, padding: 20, paddingBottom: 32 },
  kicker: { color: palette.gray, fontSize: 13 },
  title: { color: palette.slate, fontSize: 26, fontWeight: "900" },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: {
    alignItems: "center",
    borderRadius: 16,
    flex: 1,
    padding: 12,
  },
  statValue: { fontSize: 22, fontWeight: "900" },
  statLabel: { fontSize: 11, fontWeight: "800", marginTop: 2 },
  calendarCard: {
    backgroundColor: palette.white,
    borderRadius: 22,
    padding: 16,
  },
  monthHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  monthArrow: { padding: 4 },
  monthTitle: { color: palette.slate, fontSize: 18, fontWeight: "900" },
  weekdayRow: { flexDirection: "row", marginBottom: 8 },
  weekdayText: {
    color: palette.gray,
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: "14.28%",
  },
  dayCellToday: {
    backgroundColor: palette.navy,
    borderRadius: 12,
  },
  dayCellSelected: {
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
  },
  dayNum: { color: palette.slate, fontSize: 15, fontWeight: "700" },
  dayNumToday: { color: palette.white, fontWeight: "900" },
  dayNumSelected: { color: palette.navy, fontWeight: "900" },
  dotsRow: { flexDirection: "row", gap: 2, marginTop: 2 },
  dot: { borderRadius: 3, height: 5, width: 5 },
  legend: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
    justifyContent: "center",
  },
  legendItem: { alignItems: "center", flexDirection: "row", gap: 6 },
  legendDot: { borderRadius: 4, height: 10, width: 10 },
  legendText: { color: palette.gray, fontSize: 13, fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    padding: 24,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modalTitle: {
    color: palette.slate,
    fontSize: 20,
    fontWeight: "900",
    flex: 1,
  },
  emptyDetail: { alignItems: "center", gap: 12, paddingVertical: 40 },
  emptyDetailText: { color: palette.gray, fontSize: 15, fontWeight: "700" },
  detailSection: { marginTop: 16 },
  detailSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  detailSectionTitle: {
    color: palette.slate,
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },
  verDetalle: { color: palette.sky, fontSize: 13, fontWeight: "700" },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  detailRowBody: { flex: 1 },
  detailMedName: { color: palette.slate, fontSize: 15, fontWeight: "800" },
  detailTime: { color: palette.gray, fontSize: 12, marginTop: 1 },
  detailStatus: { fontSize: 12, fontWeight: "800" },
  fullDetailLink: { alignItems: "center", marginTop: 20, paddingVertical: 8 },
});
