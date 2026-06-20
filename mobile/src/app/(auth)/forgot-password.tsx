import { useState } from "react";
import { Text, View } from "react-native";
import { Link } from "expo-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { requestPasswordReset } from "@/lib/auth-actions";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const result = await requestPasswordReset(email.trim());
    setLoading(false);
    if (result.error) setError(result.error);
    else setSent(true);
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-white px-6">
      <Text className="text-center text-2xl font-bold text-primary">Recupera tu acceso</Text>
      {sent ? (
        <Text className="text-center font-sans text-muted">
          Si el correo existe, te enviamos un enlace para restablecer tu contrasena.
        </Text>
      ) : (
        <>
          <Input value={email} onChangeText={setEmail} placeholder="Correo electronico" autoCapitalize="none" keyboardType="email-address" />
          {error ? <Text className="text-sm text-danger">{error}</Text> : null}
          <Button label={loading ? "Enviando..." : "Enviar enlace"} onPress={onSubmit} disabled={loading} />
        </>
      )}
      <Link href="/login" className="text-center font-sans text-sky">Volver al inicio de sesion</Link>
    </View>
  );
}
