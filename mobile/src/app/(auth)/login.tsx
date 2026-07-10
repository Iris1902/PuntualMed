import { useState } from "react";
import { Text, View, Image, TouchableOpacity, ActivityIndicator } from "react-native"; 
import { Link } from "expo-router";
import { Input } from "@/components/ui/Input";
import { signIn } from "@/lib/auth-actions";

import logoImg from "../../../assets/images/logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) setError(result.error);
  }

  return (
    <View className="flex-1 justify-center items-center bg-slate-50 px-6">
      
      {/* Contenedor del Logo y Título */}
      <View className="items-center mb-8">
        <Image 
          source={logoImg} 
          className="w-24 h-24 mb-2" 
          resizeMode="contain"
        />
        <Text className="text-3xl font-bold text-blue-900">PuntualMed</Text>
        <Text className="text-gray-400 text-sm mt-1">Tu tratamiento guiado por inteligencia</Text>
      </View>

      {/* Tarjeta Blanca del Formulario */}
      <View className="w-full bg-white p-6 rounded-3xl shadow-sm border border-gray-100 max-w-sm">
        <Text className="text-2xl font-bold text-blue-900 mb-1">Bienvenido</Text>
        <Text className="text-gray-500 text-sm mb-5">Inicia sesión para continuar</Text>

        {/* Inputs */}
        <View className="gap-3 mb-4">
          <Input 
            placeholder="Correo electrónico" 
            value={email}
            onChangeText={setEmail}
          />
          <Input 
            placeholder="Contraseña" 
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        {error && <Text className="text-red-500 text-xs mb-2 text-center">{error}</Text>}

        {/* Botón Iniciar Sesión - Reemplazado con componentes nativos para asegurar texto blanco y bordes perfectos */}
        <TouchableOpacity 
          onPress={onSubmit}
          disabled={loading}
          className="bg-blue-800 py-3.5 rounded-full shadow-md flex-row justify-center items-center"
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-base font-semibold">Iniciar sesión</Text>
          )}
        </TouchableOpacity>

        {/* Divisor "o" */}
        <View className="flex-row items-center my-5">
          <View className="flex-1 h-[1px] bg-gray-200" />
          <Text className="text-gray-400 mx-3 text-sm">o</Text>
          <View className="flex-1 h-[1px] bg-gray-200" />
        </View>

        {/* Botón de Google */}
        <TouchableOpacity className="flex-row items-center justify-center border border-gray-200 rounded-xl py-3 bg-white shadow-sm">
          <Image 
            source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }} 
            className="w-5 h-5 mr-2" 
          />
          <Text className="text-gray-600 font-medium">Continuar con Google</Text>
        </TouchableOpacity>
      </View>

      {/* Enlaces inferiores */}
      <View className="items-center mt-8 gap-3">
        <Link href="/forgot-password" asChild>
          <Text className="text-blue-800 font-semibold text-sm">¿Olvidaste tu contraseña?</Text>
        </Link>
        <Link href="/register" asChild>
          <Text className="text-gray-500 text-sm">
            ¿No tienes cuenta? <Text className="text-blue-800 font-semibold">Regístrate</Text>
          </Text>
        </Link>
      </View>

    </View>
  );
}