import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAsync } from "@/lib/use-async";
import { deleteMedication, getMedication } from "@/lib/meds-api";

export default function MedicationDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const load = useCallback(() => getMedication(id), [id]);
  const { data: med, loading, error } = useAsync(load);
  const [confirming, setConfirming] = useState(false);

  async function onDelete() {
    await deleteMedication(id);
    router.back();
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-3 p-4">
      {loading ? <Text className="text-center font-sans text-muted">Cargando...</Text> : null}
      {error ? <Text className="text-center text-danger">No se pudo cargar</Text> : null}
      {med ? (
        <>
          <Text className="text-xl font-bold text-primary">{med.name} {med.dose}</Text>
          <Card className="gap-1">
            <Text className="font-sans text-muted">Inicio: {med.start_date}</Text>
            <Text className="font-sans text-muted">Fin: {med.end_date}</Text>
            <Text className="font-sans text-muted">Duracion: {med.duration_days} dias</Text>
            {med.notes ? <Text className="font-sans text-muted">Notas: {med.notes}</Text> : null}
          </Card>
          <Card className="gap-1">
            <Text className="font-semibold text-primary">Horarios</Text>
            {med.schedules.length === 0 ? (
              <Text className="font-sans text-muted">Sin horarios</Text>
            ) : (
              med.schedules.map((s) => (
                <Text key={s.id} className="font-sans text-primary">{s.time_of_day}</Text>
              ))
            )}
          </Card>
          {confirming ? (
            <View className="gap-2">
              <Text className="text-center text-danger">Eliminar este medicamento?</Text>
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
