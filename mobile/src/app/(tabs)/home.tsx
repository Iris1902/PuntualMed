import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { signOut } from "@/lib/auth-actions";
import { fetchMe, type Me } from "@/lib/users-api";

export default function Home() {
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMe()
      .then(setMe)
      .catch(() => setError("No se pudo cargar el perfil"));
  }, []);

  return (
    <View className="flex-1 justify-center gap-4 bg-surface px-6">
      <Text className="text-center font-semibold text-primary">Inicio</Text>
      {error ? <Text className="text-center text-danger">{error}</Text> : null}
      {me ? (
        <Text className="text-center font-sans text-muted">
          Sesion activa: {me.full_name ?? me.id}
        </Text>
      ) : null}
      <Button label="Cerrar sesion" variant="secondary" onPress={() => signOut()} />
    </View>
  );
}
