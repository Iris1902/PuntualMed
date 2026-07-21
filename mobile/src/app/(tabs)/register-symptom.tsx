import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useAsync } from "@/lib/use-async";
import { listMedications } from "@/lib/meds-api";
import { createSymptom } from "@/lib/symptoms-api";
import { SEVERITIES, toSymptomInput, validateSymptomForm } from "@/lib/symptom-form";

export default function RegisterSymptom() {
  const router = useRouter();
  const { data: meds } = useAsync(listMedications);
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<string>("leve");
  const [medicationId, setMedicationId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit() {
    const form = { description, severity, medicationId };
    const message = validateSymptomForm(form);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createSymptom(toSymptomInput(form));
      router.back();
    } catch (err) {
      // Impresión en la terminal para identificar el error real del backend
      console.error("ERROR REAL AL GUARDAR SÍNTOMA:", err);
      
      setError("No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 p-4">
      <ScreenHeader title="Nuevo síntoma" />
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
            <Text className={`capitalize ${severity === level ? "text-white" : "text-primary"}`}>
              {level}
            </Text>
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
        {(meds ?? []).map((m) => (
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

      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
      <Button label={saving ? "Guardando..." : "Guardar"} onPress={onSubmit} disabled={saving} />
    </ScrollView>
  );
}