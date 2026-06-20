import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { createMedication } from "@/lib/meds-api";
import { FREQUENCIES, UNITS, toInput, validateMedForm, type MedForm } from "@/lib/med-form";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY: MedForm = { name: "", amount: "", unit: "mg", startDate: todayIso(), durationDays: "30", times: ["09:00"], notes: "" };

// Suma/resta 30 minutos a un horario HH:MM, con wrap en 24h.
function shiftTime(value: string, deltaMin: number): string {
  const [h, m] = value.split(":").map(Number);
  const total = (h * 60 + m + deltaMin + 1440) % 1440;
  return `${`${Math.floor(total / 60)}`.padStart(2, "0")}:${`${total % 60}`.padStart(2, "0")}`;
}

export default function AddMedication() {
  const router = useRouter();
  const [form, setForm] = useState<MedForm>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof MedForm>(key: K, value: MedForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function adjustTime(index: number, deltaMin: number) {
    set("times", form.times.map((t, i) => (i === index ? shiftTime(t, deltaMin) : t)));
  }

  async function onSubmit() {
    const message = validateMedForm(form);
    if (message) return setError(message);
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
      <ScreenHeader title="Nuevo medicamento" />
      <Input value={form.name} onChangeText={(v) => set("name", v)} placeholder="Nombre" />

      <Text className="font-semibold text-primary">Dosis</Text>
      <View className="flex-row items-center gap-2">
        <View className="flex-1"><Input value={form.amount} onChangeText={(v) => set("amount", v)} placeholder="Cantidad" keyboardType="numeric" /></View>
        <View className="flex-row gap-1">
          {UNITS.map((u) => (
            <Pressable key={u} accessibilityRole="button" onPress={() => set("unit", u)} className={`rounded px-2 py-2 ${form.unit === u ? "bg-primary" : "bg-surface"}`}>
              <Text className={form.unit === u ? "text-white" : "text-primary"}>{u}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text className="font-semibold text-primary">Inicio</Text>
      <DatePicker value={form.startDate} onChange={(d) => set("startDate", d)} />

      <Input value={form.durationDays} onChangeText={(v) => set("durationDays", v)} placeholder="Duración (días)" keyboardType="number-pad" />

      <Text className="font-semibold text-primary">Frecuencia</Text>
      <View className="flex-row flex-wrap gap-2">
        {FREQUENCIES.map((f) => (
          <Pressable key={f.label} accessibilityRole="button" onPress={() => set("times", f.times)} className="rounded bg-surface px-3 py-2">
            <Text className="text-primary">{f.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text className="font-semibold text-primary">Horarios</Text>
      {form.times.map((t, i) => (
        <View key={i} className="flex-row items-center gap-3">
          <Pressable accessibilityRole="button" onPress={() => adjustTime(i, -30)}><Text className="px-2 text-lg text-sky">-</Text></Pressable>
          <Text className="font-sans text-primary">{t}</Text>
          <Pressable accessibilityRole="button" onPress={() => adjustTime(i, 30)}><Text className="px-2 text-lg text-sky">+</Text></Pressable>
        </View>
      ))}

      <Input value={form.notes} onChangeText={(v) => set("notes", v)} placeholder="Notas (opcional)" />
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
      <Button label={saving ? "Guardando..." : "Guardar"} onPress={onSubmit} disabled={saving} />
    </ScrollView>
  );
}
