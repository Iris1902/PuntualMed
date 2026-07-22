import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { useAuth } from "@/lib/auth";
import { useAsync } from "@/lib/use-async";
import { fetchMe, updateProfile } from "@/lib/users-api";
import { signOut, updatePassword } from "@/lib/auth-actions";

export default function Profile() {
  const router = useRouter();
  const { session } = useAuth();
  
  // Obtenemos data y reload del hook
  const { data, reload } = useAsync(fetchMe);
  
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Precarga el nombre actual cuando llega el perfil.
  useEffect(() => {
    if (data?.full_name) setName(data.full_name);
  }, [data]);

  // Función guardar nombre
  async function saveName() {
    if (!name.trim()) {
      setNotice("El nombre no puede estar vacío");
      return;
    }
    
    try {
      setSavingName(true);
      setNotice("Guardando nombre...");
      await updateProfile({ full_name: name.trim() });
      await reload(); // Fuerza a pedir los nuevos datos al servidor
      setNotice("Nombre actualizado con éxito");
    } catch (error) {
      setNotice("Error al guardar el nombre");
      console.error(error);
    } finally {
      setSavingName(false);
    }
  }

  // Función guardar contraseña
  async function savePassword() {
    if (!password.trim()) {
      setNotice("Ingresa una contraseña válida");
      return;
    }

    try {
      setSavingPassword(true);
      const result = await updatePassword(password);
      setNotice(result.error ?? "Contraseña actualizada");
      if (!result.error) setPassword("");
    } catch (error) {
      setNotice("Error al guardar la contraseña");
      console.error(error);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-4 p-4">
      <ScreenHeader title="Perfil" />
      
      {/* Muestra el Nombre dinámico y el correo abajo */}
      <View className="px-1">
        {data?.full_name ? (
          <Text className="font-sans font-bold text-lg text-primary">{data.full_name}</Text>
        ) : null}
        <Text className="font-sans text-muted text-sm">{session?.user?.email}</Text>
      </View>

      <Card className="gap-2">
        <Text className="font-semibold text-primary">Nombre</Text>
        <Input value={name} onChangeText={setName} placeholder="Tu nombre" />
        <Button 
          label={savingName ? "Guardando..." : "Guardar nombre"} 
          onPress={saveName} 
          disabled={savingName} 
        />
      </Card>

      <Card className="gap-2">
        <Text className="font-semibold text-primary">Cambiar contraseña</Text>
        <Input 
          value={password} 
          onChangeText={setPassword} 
          placeholder="Nueva contraseña" 
          secureTextEntry 
        />
        <Button 
          label={savingPassword ? "Guardando..." : "Guardar contraseña"} 
          variant="secondary" 
          onPress={savePassword} 
          disabled={savingPassword} 
        />
      </Card>

      {notice ? <Text className="text-center font-sans text-muted">{notice}</Text> : null}

      <View className="gap-2 mt-4">
        <Button label="Familiares" variant="secondary" onPress={() => router.push("/family")} />
        <Button label="Cerrar sesión" variant="secondary" onPress={() => signOut()} />
      </View>
    </ScrollView>
  );
}