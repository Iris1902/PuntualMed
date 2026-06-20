import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/use-async";
import { fetchMe, updateProfile } from "@/lib/users-api";
import { signOut, updatePassword } from "@/lib/auth-actions";

export default function Profile() {
  const { session } = useAuth();
  const { data } = useAsync(fetchMe);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  // Precarga el nombre actual cuando llega el perfil.
  useEffect(() => {
    if (data?.full_name) setName(data.full_name);
  }, [data]);

  async function saveName() {
    await updateProfile({ full_name: name.trim() });
    setNotice("Nombre actualizado");
  }

  async function savePassword() {
    const result = await updatePassword(password);
    setNotice(result.error ?? "Contraseña actualizada");
    if (!result.error) setPassword("");
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-4 p-4">
      <ScreenHeader title="Perfil" />
      <Text className="font-sans text-muted">{session?.user?.email}</Text>

      <Card className="gap-2">
        <Text className="font-semibold text-primary">Nombre</Text>
        <Input value={name} onChangeText={setName} placeholder="Tu nombre" />
        <Button label="Guardar nombre" onPress={saveName} />
      </Card>

      <Card className="gap-2">
        <Text className="font-semibold text-primary">Cambiar contraseña</Text>
        <Input value={password} onChangeText={setPassword} placeholder="Nueva contraseña" secureTextEntry />
        <Button label="Guardar contraseña" variant="secondary" onPress={savePassword} />
      </Card>

      {notice ? <Text className="text-center font-sans text-muted">{notice}</Text> : null}

      <View className="mt-4">
        <Button label="Cerrar sesión" variant="secondary" onPress={() => signOut()} />
      </View>
    </ScrollView>
  );
}
