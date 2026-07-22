import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { palette } from "@/constants/puntualmed";
import { useAuth } from "@/contexts/auth";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const { signUp, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [authError, setAuthError] = useState("");

  const normalizedEmail = email.trim().toLowerCase();
  const emailError = useMemo(() => {
    if (!submitted && !email) return "";
    if (!normalizedEmail) return "Ingresa tu correo electronico.";
    if (!emailPattern.test(normalizedEmail)) return "Ingresa un correo valido.";
    return "";
  }, [email, normalizedEmail, submitted]);

  const passwordError = useMemo(() => {
    if (!submitted && !password) return "";
    if (!password) return "Ingresa tu contrasena.";
    if (password.length < 8)
      return "La contrasena debe tener al menos 8 caracteres.";
    return "";
  }, [password, submitted]);

  const confirmPasswordError = useMemo(() => {
    if (!submitted && !confirmPassword) return "";
    if (!confirmPassword) return "Confirma tu contrasena.";
    if (confirmPassword !== password) return "Las contrasenas no coinciden.";
    return "";
  }, [password, confirmPassword, submitted]);

  const canSubmit = Boolean(
    normalizedEmail &&
    password &&
    confirmPassword &&
    !emailError &&
    !passwordError &&
    !confirmPasswordError,
  );

  async function handleRegister() {
    setSubmitted(true);
    setAuthError("");
    if (!emailPattern.test(normalizedEmail) || password.length < 8) return;
    if (password !== confirmPassword) {
      setAuthError("Las contrasenas no coinciden.");
      return;
    }
    try {
      await signUp(normalizedEmail, password);
      router.replace({ pathname: "/login", params: { registered: "true" } });
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "No se pudo registrar.",
      );
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.brandMark}>
          <Image
            source={require("../assets/images/PuntualMed.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.brand}>PuntualMed</Text>
        <Text style={styles.subtitle}>Crear cuenta</Text>

        <View style={styles.form}>
          <Text style={styles.label}>Correo electronico</Text>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="maria@email.com"
            placeholderTextColor={palette.grayLight}
            textContentType="emailAddress"
            value={email}
            style={[styles.input, emailError ? styles.inputError : null]}
          />
          {emailError ? (
            <Text style={styles.errorText}>{emailError}</Text>
          ) : null}

          <Text style={styles.label}>Contrasena</Text>
          <TextInput
            editable={!isLoading}
            onChangeText={setPassword}
            placeholder="Tu contrasena"
            placeholderTextColor={palette.grayLight}
            secureTextEntry
            textContentType="password"
            value={password}
            style={[styles.input, passwordError ? styles.inputError : null]}
          />
          {passwordError ? (
            <Text style={styles.errorText}>{passwordError}</Text>
          ) : null}

          <Text style={styles.label}>Confirma contrasena</Text>
          <TextInput
            editable={!isLoading}
            onChangeText={setConfirmPassword}
            placeholder="Confirma tu contrasena"
            placeholderTextColor={palette.grayLight}
            secureTextEntry
            textContentType="password"
            value={confirmPassword}
            style={[
              styles.input,
              confirmPasswordError ? styles.inputError : null,
            ]}
          />
          {confirmPasswordError ? (
            <Text style={styles.errorText}>{confirmPasswordError}</Text>
          ) : null}

          <Pressable
            accessibilityState={{ disabled: isLoading || !canSubmit }}
            style={({ pressed }) => [
              styles.primaryButton,
              isLoading || (!canSubmit && submitted)
                ? styles.primaryButtonDisabled
                : null,
              pressed ? styles.buttonPressed : null,
            ]}
            onPress={handleRegister}
          >
            {isLoading ? (
              <ActivityIndicator color={palette.white} />
            ) : (
              <Text style={styles.primaryText}>Registrarse</Text>
            )}
          </Pressable>
          {authError ? <Text style={styles.authError}>{authError}</Text> : null}
          <Pressable
            onPress={() => router.push("/login")}
            style={styles.linkPress}
          >
            <Text style={styles.link}>¿Ya tienes cuenta? Inicia sesion</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  brandMark: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 24,
    height: 72,
    justifyContent: "center",
    marginBottom: 18,
    width: 72,
  },
  brand: {
    color: palette.slate,
    fontSize: 34,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: palette.gray,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 8,
    textAlign: "center",
  },
  form: {
    backgroundColor: palette.white,
    borderRadius: 22,
    gap: 10,
    marginTop: 28,
    padding: 18,
  },
  label: {
    color: palette.slate,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 4,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderColor: "#E5E7EB",
    borderRadius: 14,
    borderWidth: 1,
    color: palette.slate,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputError: { borderColor: palette.red, backgroundColor: "#FEF2F2" },
  errorText: {
    color: palette.red,
    fontSize: 12,
    fontWeight: "700",
    marginTop: -4,
  },
  authError: {
    color: palette.red,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: palette.navy,
    borderRadius: 15,
    marginTop: 10,
    paddingVertical: 14,
  },
  primaryButtonDisabled: { backgroundColor: "#94A3B8" },
  buttonPressed: { opacity: 0.86 },
  primaryText: { color: palette.white, fontSize: 15, fontWeight: "900" },
  logo: { height: 100, width: 100 },
  linkPress: { marginTop: 12, alignItems: "center" },
  link: { color: palette.sky, fontSize: 14, fontWeight: "600" },
});
