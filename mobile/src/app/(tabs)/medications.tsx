import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";

import { palette } from "@/constants/puntualmed";
import { useAuth } from "@/contexts/auth";
import {
  createMedication,
  deleteMedication,
  listMedications,
  ocrPrescription,
  toggleMedicationActive,
  updateMedication,
  type Medication,
} from "@/lib/api";

type FilterMode = "todos" | "activos" | "completados";

const FREQUENCY_OPTIONS = [
  { label: "Cada 4 horas", value: 4 },
  { label: "Cada 6 horas", value: 6 },
  { label: "Cada 8 horas", value: 8 },
  { label: "Cada 12 horas", value: 12 },
  { label: "Cada 24 horas", value: 24 },
];

function generateScheduleTimes(frequencyHours: number): string[] {
  const times: string[] = [];
  for (let i = 0; i < 24; i += frequencyHours) {
    times.push(`${String(i).padStart(2, "0")}:00`);
  }
  return times;
}

function treatmentProgress(med: Medication): number {
  if (med.total_count === 0) return 0;
  return (med.taken_count / med.total_count) * 100;
}

function progressLabel(pct: number): string {
  if (pct >= 10) return Math.round(pct) + "%";
  if (pct >= 1) return pct.toFixed(1) + "%";
  return pct.toFixed(2) + "%";
}

export default function MedicationsScreen() {
  const { session } = useAuth();
  const token = session?.access_token ?? "";
  const tabBarHeight = useBottomTabBarHeight();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [filter, setFilter] = useState<FilterMode>("todos");

  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [frequencyHours, setFrequencyHours] = useState<number>(8);
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(["08:00", "16:00"]);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [durationValue, setDurationValue] = useState("30");
  const [durationUnit, setDurationUnit] = useState<"days" | "months" | "years">("days");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showFreqPicker, setShowFreqPicker] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [editingTimeIndex, setEditingTimeIndex] = useState<number | null>(null);

  async function handleOCR() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permiso requerido", "Necesitamos acceso a la camara para escanear recetas.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    setOcrLoading(true);
    try {
      const ocrResult = await ocrPrescription(token, result.assets[0].uri);
      if (ocrResult.medications.length === 0) {
        Alert.alert("Sin resultados", "No se pudieron detectar medicamentos en la imagen.");
        return;
      }
      const med = ocrResult.medications[0];
      setName(med.name);
      setDose(med.dose);
      if (med.frequency_hours) {
        setFrequencyHours(med.frequency_hours);
        setScheduleTimes(generateScheduleTimes(med.frequency_hours));
      }
      if (med.notes) setNotes(med.notes);
      setShowModal(true);
      if (ocrResult.medications.length > 1) {
        Alert.alert("Multiples medicamentos", `Se detectaron ${ocrResult.medications.length} medicamentos. Se ha precargado el primero.`);
      }
    } catch (error) {
      Alert.alert("Error OCR", error instanceof Error ? error.message : "No se pudo procesar la imagen.");
    } finally {
      setOcrLoading(false);
    }
  }

  const filteredMeds = useMemo(() => {
    switch (filter) {
      case "activos":
        return medications.filter((m) => m.active);
      case "completados":
        return medications.filter((m) => m.total_count > 0 && m.taken_count === m.total_count);
      default:
        return medications;
    }
  }, [medications, filter]);

  const fetchMeds = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const data = await listMedications(token);
      setMedications(data);
    } catch {
      Alert.alert("Error", "No se pudieron cargar los medicamentos.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMeds();
  }, [fetchMeds]);

  useFocusEffect(
    useCallback(() => {
      fetchMeds();
    }, [fetchMeds])
  );

  function handleFrequencySelect(hours: number) {
    setFrequencyHours(hours);
    setScheduleTimes(generateScheduleTimes(hours));
    setShowFreqPicker(false);
  }

  function computeEndDate(): string {
    const start = new Date(startDate);
    let days = parseInt(durationValue) || 0;
    if (durationUnit === "months") days *= 30;
    else if (durationUnit === "years") days *= 365;
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    return end.toISOString().slice(0, 10);
  }

  function openCreateModal() {
    setEditingMed(null);
    setName("");
    setDose("");
    setFrequencyHours(8);
    setScheduleTimes(["08:00", "16:00"]);
    setStartDate(new Date().toISOString().slice(0, 10));
    setDurationValue("30");
    setDurationUnit("days");
    setNotes("");
    setShowModal(true);
  }

  function openEditModal(med: Medication) {
    setEditingMed(med);
    setName(med.name);
    setDose(med.dose);
    setFrequencyHours(med.frequency_hours ?? 8);
    setScheduleTimes(med.schedules.map((s) => s.time_of_day.slice(0, 5)));
    setStartDate(med.start_date);
    const durDays = med.duration_days;
    if (durDays % 365 === 0 && durDays >= 365) {
      setDurationValue(String(durDays / 365));
      setDurationUnit("years");
    } else if (durDays % 30 === 0 && durDays >= 30) {
      setDurationValue(String(durDays / 30));
      setDurationUnit("months");
    } else {
      setDurationValue(String(durDays));
      setDurationUnit("days");
    }
    setNotes(med.notes ?? "");
    setShowModal(true);
  }

  async function handleSave() {
    if (!name.trim() || !dose.trim() || !startDate || !durationValue) {
      Alert.alert("Error", "Completa todos los campos obligatorios.");
      return;
    }
    setSaving(true);
    try {
      const durationDays = durationUnit === "days"
        ? parseInt(durationValue)
        : durationUnit === "months"
          ? parseInt(durationValue) * 30
          : parseInt(durationValue) * 365;

      const payload = {
        name: name.trim(),
        dose: dose.trim(),
        frequency_hours: frequencyHours,
        start_date: startDate,
        duration_days: durationDays,
        notes: notes.trim() || null,
        schedules: scheduleTimes.map((t) => ({ time_of_day: t + ":00" })),
      };

      if (editingMed) {
        await updateMedication(token, editingMed.id, payload);
        Alert.alert("Actualizado", "Medicamento actualizado correctamente.");
      } else {
        await createMedication(token, payload);
      }
      setShowModal(false);
      fetchMeds();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(medId: string) {
    Alert.alert("Eliminar", "¿Eliminar este medicamento?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMedication(token, medId);
            setMedications((prev) => prev.filter((m) => m.id !== medId));
          } catch {
            Alert.alert("Error", "No se pudo eliminar.");
          }
        },
      },
    ]);
  }

  async function handleToggleActive(medId: string) {
    try {
      const result = await toggleMedicationActive(token, medId);
      setMedications((prev) =>
        prev.map((m) => (m.id === medId ? { ...m, active: result.active } : m))
      );
    } catch {
      Alert.alert("Error", "No se pudo cambiar el estado.");
    }
  }

  if (loading || !token) {
    return (
      <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={palette.navy} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 20 }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>Gestion de medicamentos</Text>
            <Text style={styles.title}>Medicamentos</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable style={styles.ocrButton} onPress={handleOCR} disabled={ocrLoading}>
              {ocrLoading ? (
                <ActivityIndicator color={palette.white} size="small" />
              ) : (
                <Ionicons name="camera" size={22} color={palette.white} />
              )}
            </Pressable>
            <Pressable style={styles.addButton} onPress={openCreateModal}>
              <Ionicons name="add" size={24} color={palette.white} />
            </Pressable>
          </View>
        </View>

        <View style={styles.filterRow}>
          {(["todos", "activos", "completados"] as const).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === "todos" ? "Todos" : f === "activos" ? "Activos" : "Completados"}
              </Text>
            </Pressable>
          ))}
        </View>

        {filteredMeds.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="medkit-outline" size={48} color={palette.grayLight} />
            <Text style={styles.emptyText}>
              {filter === "todos"
                ? "No hay medicamentos registrados"
                : filter === "activos"
                  ? "No hay medicamentos activos"
                  : "No hay tratamientos completados"}
            </Text>
            {filter !== "completados" && (
              <Text style={styles.emptySubtext}>Presiona + para agregar uno</Text>
            )}
          </View>
        )}

        {filteredMeds.map((med) => {
          const progress = treatmentProgress(med);
          return (
            <View key={med.id} style={[styles.card, !med.active && styles.cardInactive]}>
              <View style={styles.cardTop}>
                <View style={styles.iconWrap}>
                  <Ionicons name="medkit" size={24} color={med.active ? palette.navy : palette.gray} />
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.medName, !med.active && styles.textInactive]}>{med.name}</Text>
                  <Text style={styles.meta}>{med.dose}</Text>
                  {med.frequency_hours && (
                    <Text style={styles.meta}>Cada {med.frequency_hours} horas</Text>
                  )}
                  <Text style={styles.meta}>
                    {new Date(med.start_date).toLocaleDateString("es-ES")} - {new Date(med.end_date).toLocaleDateString("es-ES")}
                  </Text>
                  {med.notes ? <Text style={styles.instructions}>{med.notes}</Text> : null}
                </View>
                <View style={styles.cardActionsCol}>
                  <Pressable onPress={() => openEditModal(med)} style={styles.iconBtn}>
                    <Ionicons name="create-outline" size={18} color={palette.navy} />
                  </Pressable>
                  <Pressable onPress={() => handleDelete(med.id)} style={styles.iconBtn}>
                    <Ionicons name="trash-outline" size={18} color={palette.red} />
                  </Pressable>
                  <Switch
                    value={med.active}
                    onValueChange={() => handleToggleActive(med.id)}
                    trackColor={{ false: "#D1D5DB", true: palette.mint }}
                    thumbColor={palette.white}
                  />
                </View>
              </View>

              {med.schedules.length > 0 && (
                <View style={styles.schedulesRow}>
                  {med.schedules.map((s) => (
                    <View key={s.id} style={styles.schedulePill}>
                      <Text style={styles.scheduleText}>
                        {s.time_of_day.slice(0, 5)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${Math.max(progress, 0.5)}%` }, !med.active && styles.progressFillInactive]} />
                </View>
                <Text style={styles.progressText}>{progressLabel(progress)}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>
              {editingMed ? "Editar medicamento" : "Nuevo medicamento"}
            </Text>

            <Text style={styles.label}>Nombre del medicamento</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: Metformina"
              placeholderTextColor={palette.grayLight}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Dosis</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej: 500 mg"
              placeholderTextColor={palette.grayLight}
              value={dose}
              onChangeText={setDose}
            />

            <Text style={styles.label}>Frecuencia</Text>
            <Pressable style={styles.pickerButton} onPress={() => setShowFreqPicker(!showFreqPicker)}>
              <Text style={styles.pickerText}>
                Cada {frequencyHours} horas ({scheduleTimes.length} tomas/dia)
              </Text>
              <Ionicons name="chevron-down" size={18} color={palette.gray} />
            </Pressable>
            {showFreqPicker && (
              <View style={styles.pickerOptions}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.pickerOption, frequencyHours === opt.value && styles.pickerOptionActive]}
                    onPress={() => handleFrequencySelect(opt.value)}
                  >
                    <Text style={[styles.pickerOptionText, frequencyHours === opt.value && { color: palette.white }]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            <Text style={styles.label}>Horarios programados</Text>
              {scheduleTimes.map((time, index) => (
              <View key={index} style={styles.timeRow}>
                <Pressable
                  style={[styles.input, { flex: 1, justifyContent: "center" }]}
                  onPress={() => setEditingTimeIndex(index)}
                >
                  <Text style={{ color: palette.slate, fontSize: 15 }}>{time}</Text>
                </Pressable>
                {scheduleTimes.length > 1 && (
                  <Pressable
                    onPress={() => setScheduleTimes(scheduleTimes.filter((_, i) => i !== index))}
                    style={styles.removeTimeBtn}
                  >
                    <Ionicons name="close-circle" size={22} color={palette.red} />
                  </Pressable>
                )}
                {editingTimeIndex === index && (
                  <DateTimePicker
                    value={(() => {
                      const [h, m] = time.split(":").map(Number);
                      const d = new Date();
                      d.setHours(h, m, 0, 0);
                      return d;
                    })()}
                    mode="time"
                    display="default"
                    onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                      setEditingTimeIndex(null);
                      if (selectedDate) {
                        const hh = String(selectedDate.getHours()).padStart(2, "0");
                        const mm = String(selectedDate.getMinutes()).padStart(2, "0");
                        const newTimes = [...scheduleTimes];
                        newTimes[index] = hh + ":" + mm;
                        setScheduleTimes(newTimes);
                      }
                    }}
                  />
                )}
              </View>
            ))}
            <Pressable
              onPress={() => setScheduleTimes([...scheduleTimes, "12:00"])}
              style={styles.addTimeBtn}
            >
              <Ionicons name="add-circle-outline" size={18} color={palette.navy} />
              <Text style={styles.addTimeText}>Agregar horario</Text>
            </Pressable>

            <Text style={styles.label}>Fecha de inicio</Text>
            <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: palette.slate, fontSize: 15 }}>{startDate}</Text>
            </Pressable>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(startDate + "T12:00:00")}
                mode="date"
                display="default"
                onChange={(_event: DateTimePickerEvent, selectedDate?: Date) => {
                  setShowDatePicker(false);
                  if (selectedDate) setStartDate(selectedDate.toISOString().slice(0, 10));
                }}
              />
            )}

            <Text style={styles.label}>Duracion del tratamiento</Text>
            <View style={styles.durationRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="30"
                placeholderTextColor={palette.grayLight}
                keyboardType="number-pad"
                value={durationValue}
                onChangeText={setDurationValue}
              />
              <View style={styles.unitPicker}>
                {(["days", "months", "years"] as const).map((unit) => (
                  <Pressable
                    key={unit}
                    style={[styles.unitOption, durationUnit === unit && styles.unitOptionActive]}
                    onPress={() => setDurationUnit(unit)}
                  >
                    <Text style={[styles.unitText, durationUnit === unit && { color: palette.white }]}>
                      {unit === "days" ? "Dias" : unit === "months" ? "Meses" : "Años"}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.endDateCard}>
              <Text style={styles.endDateLabel}>Fecha de fin calculada</Text>
              <Text style={styles.endDateValue}>{computeEndDate()}</Text>
            </View>

            <Text style={styles.label}>Instrucciones adicionales</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notas opcionales..."
              placeholderTextColor={palette.grayLight}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => { setShowModal(false); }}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={palette.white} size="small" />
                ) : (
                  <Text style={styles.saveText}>{editingMed ? "Actualizar" : "Guardar"}</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  content: { gap: 14, padding: 20, paddingBottom: 32 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  kicker: { color: palette.gray, fontSize: 13 },
  title: { color: palette.slate, fontSize: 26, fontWeight: "900" },
  headerActions: { flexDirection: "row", gap: 8 },
  addButton: {
    alignItems: "center",
    backgroundColor: palette.navy,
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  ocrButton: {
    alignItems: "center",
    backgroundColor: palette.sky,
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  filterRow: {
    backgroundColor: palette.white,
    borderRadius: 14,
    flexDirection: "row",
    overflow: "hidden",
  },
  filterBtn: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 10,
  },
  filterBtnActive: { backgroundColor: palette.navy },
  filterText: { color: palette.slate, fontSize: 13, fontWeight: "700" },
  filterTextActive: { color: palette.white },
  emptyCard: { alignItems: "center", backgroundColor: palette.white, borderRadius: 18, gap: 8, padding: 40 },
  emptyText: { color: palette.gray, fontSize: 16, fontWeight: "700", marginTop: 8 },
  emptySubtext: { color: palette.grayLight, fontSize: 13 },
  card: { backgroundColor: palette.white, borderRadius: 18, padding: 16 },
  cardInactive: { opacity: 0.7 },
  cardTop: { flexDirection: "row", gap: 14 },
  iconWrap: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  cardBody: { flex: 1 },
  medName: { color: palette.slate, fontSize: 18, fontWeight: "900" },
  textInactive: { color: palette.gray },
  meta: { color: palette.gray, fontSize: 13, marginTop: 2 },
  instructions: { color: palette.slate, fontSize: 13, marginTop: 6, fontStyle: "italic" },
  cardActionsCol: {
    alignItems: "center",
    gap: 4,
    marginLeft: 8,
  },
  iconBtn: { padding: 4 },
  schedulesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  schedulePill: {
    backgroundColor: "#EFF6FF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  scheduleText: { color: palette.navy, fontSize: 13, fontWeight: "700" },
  progressRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  progressTrack: {
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    flex: 1,
    height: 8,
    overflow: "hidden",
  },
  progressFill: { backgroundColor: palette.mint, height: 8, borderRadius: 999 },
  progressFillInactive: { backgroundColor: palette.grayLight },
  progressText: { color: palette.gray, fontSize: 12, fontWeight: "700", width: 36, textAlign: "right" },


  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    padding: 24,
  },
  modalTitle: { color: palette.slate, fontSize: 22, fontWeight: "900", marginBottom: 20 },
  label: { color: palette.slate, fontSize: 13, fontWeight: "800", marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
    borderRadius: 14,
    borderWidth: 1,
    color: palette.slate,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  pickerButton: {
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerText: { color: palette.slate, fontSize: 15 },
  pickerOptions: {
    backgroundColor: palette.white,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
    overflow: "hidden",
  },
  pickerOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pickerOptionActive: { backgroundColor: palette.navy },
  pickerOptionText: { color: palette.slate, fontSize: 15 },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  removeTimeBtn: { padding: 4 },
  addTimeBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  addTimeText: { color: palette.navy, fontSize: 14, fontWeight: "700" },
  durationRow: { flexDirection: "row", gap: 8 },
  unitPicker: { flexDirection: "row", borderRadius: 14, overflow: "hidden", borderWidth: 1, borderColor: "#E5E7EB" },
  unitOption: { paddingHorizontal: 12, paddingVertical: 12, backgroundColor: "#F8FAFC" },
  unitOptionActive: { backgroundColor: palette.navy },
  unitText: { color: palette.slate, fontSize: 13, fontWeight: "700" },
  endDateCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    marginTop: 12,
    padding: 14,
  },
  endDateLabel: { color: palette.gray, fontSize: 12, fontWeight: "700" },
  endDateValue: { color: palette.navy, fontSize: 18, fontWeight: "900", marginTop: 4 },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 24, marginBottom: 40 },
  modalButton: {
    alignItems: "center",
    borderRadius: 15,
    flex: 1,
    paddingVertical: 14,
  },
  cancelButton: { backgroundColor: "#F3F4F6" },
  saveButton: { backgroundColor: palette.navy },
  cancelText: { color: palette.slate, fontSize: 15, fontWeight: "900" },
  saveText: { color: palette.white, fontSize: 15, fontWeight: "900" },
});
