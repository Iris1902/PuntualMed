import { useState } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signUp } from "@/lib/auth-actions";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    if (password !== confirm) {
      setError("Las contrasenas no coinciden");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await signUp(email.trim(), password);
    setLoading(false);
    if (result.error) setError(result.error);
    else setSent(true);
  }

  if (sent) {
    return (
      <View className="flex-1 justify-center gap-4 bg-white px-6">
        <Text className="text-center text-2xl font-bold text-primary">Confirma tu correo</Text>
        <Text className="text-center font-sans text-muted">
          Te enviamos un enlace a {email}. Abrelo para activar tu cuenta.
        </Text>
        <Link href="/login" className="text-center font-sans text-sky">Volver al inicio de sesion</Link>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center gap-3 bg-white px-6">
      <Text className="mb-2 text-center text-2xl font-bold text-primary">Crear cuenta</Text>
      <Input value={name} onChangeText={setName} placeholder="Nombre completo" />
      <Input value={email} onChangeText={setEmail} placeholder="Correo electronico" autoCapitalize="none" keyboardType="email-address" />
      <Input value={password} onChangeText={setPassword} placeholder="Contrasena" secureTextEntry />
      <Input value={confirm} onChangeText={setConfirm} placeholder="Confirmar contrasena" secureTextEntry />
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
      <Button label={loading ? "Creando..." : "Crear cuenta"} onPress={onSubmit} disabled={loading} />
      <Link href="/login" className="text-center font-sans text-sky">Ya tengo cuenta</Link>
    </View>
  );
}
