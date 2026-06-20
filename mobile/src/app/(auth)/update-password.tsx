import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth";
import { updatePassword } from "@/lib/auth-actions";

export default function UpdatePassword() {
  const { clearRecovery } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const result = await updatePassword(password);
    setLoading(false);
    if (result.error) setError(result.error);
    else clearRecovery(); // el guard redirige a /home con la sesion ya activa
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-white px-6">
      <Text className="text-center text-2xl font-bold text-primary">Nueva contrasena</Text>
      <Input value={password} onChangeText={setPassword} placeholder="Nueva contrasena" secureTextEntry />
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
      <Button label={loading ? "Guardando..." : "Guardar contrasena"} onPress={onSubmit} disabled={loading} />
    </View>
  );
}
