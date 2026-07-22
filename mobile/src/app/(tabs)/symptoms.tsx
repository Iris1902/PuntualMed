import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { palette } from "@/constants/puntualmed";
import { useAuth } from "@/contexts/auth";
import { createSymptom, deleteSymptom, listMedications, listSymptoms, type Medication, type Symptom } from "@/lib/api";

const SEVERITY_OPTIONS = ["Leve", "Moderado", "Grave"];

type SymptomFilter = "todos" | "semana" | "mes";

export default function SymptomsScreen() {
  const { session } = useAuth();
  const token = session?.access_token ?? "";
  const tabBarHeight = useBottomTabBarHeight();

  const [symptoms, setSymptoms] = useState<Symptom[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<string>("");
  const [selectedMedId, setSelectedMedId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const [filter, setFilter] = useState<SymptomFilter>("todos");
  const [filterMedId, setFilterMedId] = useState<string>("");

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [s, m] = await Promise.all([
        listSymptoms(token),
        listMedications(token),
      ]);
      setSymptoms(s);
      setMedications(m);
    } catch {
      Alert.alert("Error", "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const filteredSymptoms = useMemo(() => {
    let result = [...symptoms];
    const now = new Date();

    if (filter === "semana") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      result = result.filter((s) => new Date(s.occurred_at) >= weekAgo);
    } else if (filter === "mes") {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      result = result.filter((s) => new Date(s.occurred_at) >= monthAgo);
    }

    if (filterMedId) {
      result = result.filter((s) => s.medication_id === filterMedId);
    }

    return result;
  }, [symptoms, filter, filterMedId]);

  function severityColor(sev: string | null): string {
    switch (sev?.toLowerCase()) {
      case "grave": return palette.red;
      case "moderado": return palette.amber;
      default: return palette.mint;
    }
  }

  function severityIcon(sev: string | null): keyof typeof Ionicons.glyphMap {
    switch (sev?.toLowerCase()) {
      case "grave": return "warning";
      case "moderado": return "alert-circle";
      default: return "information-circle";
    }
  }

  async function handleDelete(symptomId: string) {
    Alert.alert("Eliminar sintoma", "¿Estas seguro?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSymptom(token, symptomId);
            setSymptoms((prev) => prev.filter((s) => s.id !== symptomId));
          } catch {
            Alert.alert("Error", "No se pudo eliminar el sintoma.");
          }
        },
      },
    ]);
  }

  async function handleSave() {
    if (!description.trim()) {
      Alert.alert("Error", "Describe el sintoma.");
      return;
    }
    setSaving(true);
    try {
      await createSymptom(token, {
        description: description.trim(),
        severity: severity || null,
        medication_id: selectedMedId || null,
      });
      setShowModal(false);
      setDescription("");
      setSeverity("");
      setSelectedMedId("");
      fetchData();
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "No se pudo guardar.");
    } finally {
      setSaving(false);
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
            <Text style={styles.kicker}>Registro de sintomas</Text>
            <Text style={styles.title}>Sintomas</Text>
          </View>
          <Pressable style={styles.addButton} onPress={() => setShowModal(true)}>
            <Ionicons name="add" size={24} color={palette.white} />
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {(["todos", "semana", "mes"] as const).map((f) => (
            <Pressable
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f === "todos" ? "Todos" : f === "semana" ? "Esta semana" : "Este mes"}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.medFilterScroll}>
          <Pressable
            style={[styles.medFilterChip, !filterMedId && styles.medFilterChipActive]}
            onPress={() => setFilterMedId("")}
          >
            <Text style={[styles.medFilterText, !filterMedId && styles.medFilterTextActive]}>
              Todos los medicamentos
            </Text>
          </Pressable>
          {medications.filter((m) => m.active).map((m) => (
            <Pressable
              key={m.id}
              style={[styles.medFilterChip, filterMedId === m.id && styles.medFilterChipActive]}
              onPress={() => setFilterMedId(filterMedId === m.id ? "" : m.id)}
            >
              <Text style={[styles.medFilterText, filterMedId === m.id && styles.medFilterTextActive]}>
                {m.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {filteredSymptoms.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="pulse-outline" size={48} color={palette.grayLight} />
            <Text style={styles.emptyText}>No hay sintomas registrados</Text>
            <Text style={styles.emptySubtext}>Presiona + para agregar uno</Text>
          </View>
        )}

        {filteredSymptoms.map((s) => {
          const med = medications.find((m) => m.id === s.medication_id);
          const isExpanded = expandedId === s.id;
          return (
            <View key={s.id} style={styles.card}>
              <Pressable onPress={() => setExpandedId(isExpanded ? null : s.id)}>
                <View style={styles.cardRow}>
                  <View style={[styles.severityBadge, { backgroundColor: severityColor(s.severity) + "20" }]}>
                    <Ionicons name={severityIcon(s.severity)} size={20} color={severityColor(s.severity)} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.symptomDesc}>{s.description}</Text>
                    <Text style={styles.symptomMeta}>
                      {new Date(s.occurred_at).toLocaleDateString("es-ES", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </Text>
                    {med && <Text style={styles.symptomMed}>{med.name}</Text>}
                    {s.ai_analysis && (
                      <View style={styles.analysisPreview}>
                        <Ionicons name="sparkles" size={12} color={palette.navy} />
                        <Text style={styles.analysisPreviewText}>
                          {isExpanded ? "Ocultar analisis" : "Analisis disponible"}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.cardRight}>
                    {s.severity && (
                      <View style={[styles.severityPill, { backgroundColor: severityColor(s.severity) + "20" }]}>
                        <Text style={[styles.severityText, { color: severityColor(s.severity) }]}>
                          {s.severity}
                        </Text>
                      </View>
                    )}
                    <Pressable onPress={() => handleDelete(s.id)} style={styles.deleteBtn}>
                      <Ionicons name="trash-outline" size={16} color={palette.red} />
                    </Pressable>
                  </View>
                </View>
              </Pressable>

              {isExpanded && s.ai_analysis && (
                <View style={styles.analysisBox}>
                  <View style={styles.analysisHeader}>
                    <Ionicons name="sparkles" size={14} color={palette.navy} />
                    <Text style={styles.analysisTitle}>Analisis IA</Text>
                  </View>
                  <Text style={styles.analysisText}>{s.ai_analysis}</Text>
                </View>
              )}

              {isExpanded && !s.ai_analysis && (
                <View style={styles.analysisBox}>
                  <Text style={styles.analysisEmpty}>
                    Analisis no disponible para este sintoma.
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>Nuevo sintoma</Text>

            <Text style={styles.label}>Descripcion</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe el sintoma..."
              placeholderTextColor={palette.grayLight}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Text style={styles.label}>Severidad</Text>
            <View style={styles.severityRow}>
              {SEVERITY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.severityOption, severity === opt && styles.severityOptionActive]}
                  onPress={() => setSeverity(severity === opt ? "" : opt)}
                >
                  <Text style={[styles.severityOptionText, severity === opt && { color: palette.white }]}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Medicamento</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.medScroll}>
              <Pressable
                style={[styles.medChip, !selectedMedId && styles.medChipActive]}
                onPress={() => setSelectedMedId("")}
              >
                <Text style={[styles.medChipText, !selectedMedId && styles.medChipTextActive]}>
                  Ninguno
                </Text>
              </Pressable>
              {medications.filter((m) => m.active).map((m) => (
                <Pressable
                  key={m.id}
                  style={[styles.medChip, selectedMedId === m.id && styles.medChipActive]}
                  onPress={() => setSelectedMedId(selectedMedId === m.id ? "" : m.id)}
                >
                  <Text style={[styles.medChipText, selectedMedId === m.id && styles.medChipTextActive]}>
                    {m.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? <ActivityIndicator color={palette.white} size="small" /> : <Text style={styles.saveText}>Guardar</Text>}
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
  addButton: {
    alignItems: "center",
    backgroundColor: palette.navy,
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
  medFilterScroll: { marginTop: 4 },
  medFilterChip: {
    backgroundColor: palette.white,
    borderColor: "#E5E7EB",
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  medFilterChipActive: { backgroundColor: palette.navy, borderColor: palette.navy },
  medFilterText: { color: palette.slate, fontSize: 13, fontWeight: "700" },
  medFilterTextActive: { color: palette.white },
  emptyCard: { alignItems: "center", backgroundColor: palette.white, borderRadius: 18, gap: 8, padding: 40 },
  emptyText: { color: palette.gray, fontSize: 16, fontWeight: "700", marginTop: 8 },
  emptySubtext: { color: palette.grayLight, fontSize: 13 },
  card: { backgroundColor: palette.white, borderRadius: 18, padding: 14 },
  cardRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  severityBadge: {
    alignItems: "center",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  cardBody: { flex: 1 },
  symptomDesc: { color: palette.slate, fontSize: 15, fontWeight: "800" },
  symptomMeta: { color: palette.gray, fontSize: 12, marginTop: 2 },
  symptomMed: { color: palette.navy, fontSize: 12, fontWeight: "700", marginTop: 2 },
  analysisPreview: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    marginTop: 6,
  },
  analysisPreviewText: { color: palette.navy, fontSize: 11, fontWeight: "700" },
  cardRight: { alignItems: "center", gap: 6 },
  deleteBtn: { padding: 4 },
  severityPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  severityText: { fontSize: 11, fontWeight: "800" },
  analysisBox: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    marginTop: 12,
    padding: 14,
  },
  analysisHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginBottom: 8,
  },
  analysisTitle: { color: palette.navy, fontSize: 13, fontWeight: "800" },
  analysisText: { color: palette.slate, fontSize: 13, lineHeight: 20 },
  analysisEmpty: { color: palette.gray, fontSize: 13, fontStyle: "italic" },
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
  severityRow: { flexDirection: "row", gap: 8 },
  severityOption: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  severityOptionActive: { backgroundColor: palette.navy, borderColor: palette.navy },
  severityOptionText: { color: palette.slate, fontSize: 14, fontWeight: "700" },
  medScroll: { marginTop: 4 },
  medChip: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  medChipActive: { backgroundColor: palette.navy, borderColor: palette.navy },
  medChipText: { color: palette.slate, fontSize: 13, fontWeight: "700" },
  medChipTextActive: { color: palette.white },
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
