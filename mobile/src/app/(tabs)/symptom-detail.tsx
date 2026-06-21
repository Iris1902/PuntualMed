import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useAsync } from "@/lib/use-async";
import { listMedications } from "@/lib/meds-api";
import { listSymptoms, updateSymptom, deleteSymptom } from "@/lib/symptoms-api";
import { SEVERITIES } from "@/lib/symptom-form";

export default function SymptomDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, loading, error } = useAsync(async () => {
    const all = await listSymptoms();
    return { symptom: all.find((s) => s.id === id) ?? null, meds: await listMedications() };
  });

  const prefilled = useRef(false);
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("leve");
  const [medicationId, setMedicationId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (data?.symptom && !prefilled.current) {
      prefilled.current = true;
      setDescription(data.symptom.description);
      setSeverity(data.symptom.severity ?? "leve");
      setMedicationId(data.symptom.medication_id ?? "");
    }
  }, [data]);

  async function onSave() {
    setSaving(true);
    setSaveError(null);
    try {
      await updateSymptom(id, { description, severity, medication_id: medicationId || null });
      router.back();
    } catch {
      setSaveError("No se pudo guardar");
      setSaving(false);
    }
  }

  async function onDelete() {
    try {
      await deleteSymptom(id);
      router.back();
    } catch {
      setDeleteError("No se pudo eliminar");
      setConfirming(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 p-4">
      <ScreenHeader title="Síntoma" />
      {loading ? <Text className="text-center font-sans text-muted">Cargando...</Text> : null}
      {error ? <Text className="text-center text-danger">No se pudo cargar</Text> : null}

      {data ? (
        <>
          <Input value={description} onChangeText={setDescription} placeholder="Describe el síntoma" />

          <Text className="font-semibold text-primary">Severidad</Text>
          <View className="flex-row gap-2">
            {SEVERITIES.map((level) => (
              <Pressable
                key={level}
                accessibilityRole="button"
                onPress={() => setSeverity(level)}
                className={`rounded px-3 py-2 ${severity === level ? "bg-primary" : "bg-surface"}`}
              >
                <Text className={severity === level ? "text-white" : "text-primary"}>{level}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="font-semibold text-primary">Medicamento (opcional)</Text>
          <View className="flex-row flex-wrap gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={() => setMedicationId("")}
              className={`rounded px-3 py-2 ${medicationId === "" ? "bg-primary" : "bg-surface"}`}
            >
              <Text className={medicationId === "" ? "text-white" : "text-primary"}>Ninguno</Text>
            </Pressable>
            {(data.meds ?? []).map((m) => (
              <Pressable
                key={m.id}
                accessibilityRole="button"
                onPress={() => setMedicationId(m.id)}
                className={`rounded px-3 py-2 ${medicationId === m.id ? "bg-primary" : "bg-surface"}`}
              >
                <Text className={medicationId === m.id ? "text-white" : "text-primary"}>{m.name}</Text>
              </Pressable>
            ))}
          </View>

          {saveError ? <Text className="text-sm text-danger">{saveError}</Text> : null}
          <Button label={saving ? "Guardando..." : "Guardar"} onPress={onSave} disabled={saving} />

          {deleteError ? <Text className="text-center text-danger">{deleteError}</Text> : null}
          {confirming ? (
            <View className="gap-2">
              <Text className="text-center text-danger">¿Eliminar este síntoma?</Text>
              <Button label="Confirmar" onPress={onDelete} />
              <Button label="Cancelar" variant="secondary" onPress={() => setConfirming(false)} />
            </View>
          ) : (
            <Button label="Eliminar" variant="secondary" onPress={() => setConfirming(true)} />
          )}
        </>
      ) : null}
    </ScrollView>
  );
}
