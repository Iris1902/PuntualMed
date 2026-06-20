import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createMedication } from "@/lib/meds-api";
import { toInput, validateMedForm, type MedForm } from "@/lib/med-form";

const EMPTY: MedForm = { name: "", dose: "", startDate: "", durationDays: "", timesRaw: "", notes: "" };

export default function AddMedication() {
  const router = useRouter();
  const [form, setForm] = useState<MedForm>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof MedForm>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit() {
    const message = validateMedForm(form);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await createMedication(toInput(form));
      router.back();
    } catch {
      setError("No se pudo guardar");
      setSaving(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 p-4">
      <Text className="text-xl font-bold text-primary">Nuevo medicamento</Text>
      <Input value={form.name} onChangeText={(v) => set("name", v)} placeholder="Nombre" />
      <Input value={form.dose} onChangeText={(v) => set("dose", v)} placeholder="Dosis (ej. 50mg)" />
      <Input value={form.startDate} onChangeText={(v) => set("startDate", v)} placeholder="Inicio (YYYY-MM-DD)" autoCapitalize="none" />
      <Input value={form.durationDays} onChangeText={(v) => set("durationDays", v)} placeholder="Duracion (dias)" keyboardType="number-pad" />
      <Input value={form.timesRaw} onChangeText={(v) => set("timesRaw", v)} placeholder="Horarios (HH:MM, separa con coma)" autoCapitalize="none" />
      <Input value={form.notes} onChangeText={(v) => set("notes", v)} placeholder="Notas (opcional)" />
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
      <Button label={saving ? "Guardando..." : "Guardar"} onPress={onSubmit} disabled={saving} />
    </ScrollView>
  );
}
