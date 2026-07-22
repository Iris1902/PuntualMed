import { useState } from "react";
import { Text, View, Image, TouchableOpacity, ActivityIndicator, TextInput, Alert } from "react-native"; 
import { Link } from "expo-router";
import { signIn } from "@/lib/auth-actions";
import { Mail, Lock, Eye, EyeOff, Shield } from "lucide-react-native"; 

import logoImg from "../../../assets/images/logo.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Formulario Tradicional
  async function onSubmit() {
    setLoading(true);
    setError(null);
    const result = await signIn(email.trim(), password);
    setLoading(false);
    if (result.error) setError(result.error);
  }

  // Lógica para Autenticación con Google
  async function onGoogleSignIn() {
    try {
      Alert.alert("Google Auth", "Abriendo ventana de inicio de sesión con Google...");
    } catch (err) {
      Alert.alert("Error", "No se pudo conectar con Google");
    }
  }

  // Lógica para Autenticación con Facebook
  async function onFacebookSignIn() {
    try {
      Alert.alert("Facebook Auth", "Abriendo ventana de inicio de sesión con Facebook...");
    } catch (err) {
      Alert.alert("Error", "No se pudo conectar con Facebook");
    }
  }

  return (
    <View className="flex-1 justify-center items-center bg-[#F8FAFC] px-5">
      
      {/* Contenedor del Logo y Título */}
      <View className="items-center mb-6 pt-6">
        <View className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-sm mb-3 border border-gray-100">
          <Image 
            source={logoImg} 
            className="w-11 h-11" 
            resizeMode="contain"
          />
        </View>
        <Text className="text-2xl font-bold text-[#1E3A8A]">PuntualMed</Text>
        <Text className="text-[#6B7280] text-xs mt-1">Tu tratamiento, guiado por inteligencia.</Text>
      </View>

      {/* Tarjeta Blanca del Formulario */}
      <View className="w-full bg-white p-6 rounded-3xl shadow-sm border border-gray-100 max-w-sm">
        <Text className="text-2xl font-bold text-[#0F172A] mb-1">Bienvenido de vuelta</Text>
        <Text className="text-[#6B7280] text-sm mb-6">Inicia sesión para continuar</Text>

        {/* Inputs del formulario */}
        <View className="gap-3.5 mb-4">
          
          {/* Email Input */}
          <View className="flex-row items-center bg-white border border-[#E2E8F0] rounded-xl h-12 px-4 gap-3">
            <Mail size={18} color="#9CA3AF" strokeWidth={1.8} />
            <TextInput
              placeholder="Correo electrónico"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              className="flex-1 h-full text-[#0F172A] text-[15px]"
            />
          </View>

          {/* Password Input */}
          <View className="flex-row items-center bg-white border border-[#E2E8F0] rounded-xl h-12 px-4 gap-3">
            <Lock size={18} color="#9CA3AF" strokeWidth={1.8} />
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              className="flex-1 h-full text-[#0F172A] text-[15px]"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
              {showPassword ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
            </TouchableOpacity>
          </View>
        </View>

        {error && <Text className="text-red-500 text-xs mb-2 text-center">{error}</Text>}

        {/* Enlace Olvidaste tu contraseña */}
        <View className="flex-row justify-end mb-6">
          <Link href="/forgot-password" asChild>
            <TouchableOpacity className="flex-row items-center gap-1">
              <Shield size={13} color="#1E3A8A" />
              <Text className="text-[#1E3A8A] font-medium text-xs">¿Olvidaste tu contraseña?</Text>
            </TouchableOpacity>
          </Link>
        </View>

        {/* Botón Iniciar Sesión */}
        <TouchableOpacity 
          onPress={onSubmit}
          disabled={loading}
          className="bg-[#1E3A8A] h-12 rounded-2xl flex-row justify-center items-center active:scale-[0.98]"
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-[15px] font-semibold">Iniciar sesión</Text>
          )}
        </TouchableOpacity>

        {/* Divisor "o" */}
        <View className="flex-row items-center my-6">
          <View className="flex-1 h-[1px] bg-[#E2E8F0]" />
          <Text className="text-[#94A3B8] mx-3 text-xs">o</Text>
          <View className="flex-1 h-[1px] bg-[#E2E8F0]" />
        </View>

        {/* Botones Sociales */}
        <View className="gap-3">
          
          {/* Botón de Google de la Segunda Imagen */}
          <TouchableOpacity 
            onPress={onGoogleSignIn}
            className="flex-row items-center justify-center border border-[#E2E8F0] rounded-2xl h-12 bg-white active:scale-[0.98]"
          >
            <Image 
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }} 
              className="w-5 h-5 mr-3" 
            />
            <Text className="text-[#1E293B] font-medium text-[15px]">Continuar con Google</Text>
          </TouchableOpacity>

          {/* Botón de Facebook de la Segunda Imagen */}
          <TouchableOpacity 
            onPress={onFacebookSignIn}
            className="flex-row items-center justify-center rounded-2xl h-12 bg-[#1877F2] active:scale-[0.98]"
          >
            <Image 
              source={{ uri: 'https://cdn-icons-png.flaticon.com/512/124/124010.png' }} 
              className="w-5 h-5 mr-3" 
            />
            <Text className="text-white font-medium text-[15px]">Continuar con Facebook</Text>
          </TouchableOpacity>
          
        </View>
      </View>

      {/* Enlaces inferiores */}
      <View className="items-center mt-6 pb-4">
        <Link href="/register" asChild>
          <TouchableOpacity>
            <Text className="text-[#6B7280] text-sm">
              ¿No tienes cuenta? <Text className="text-[#1E3A8A] font-semibold">Regístrate</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </View>

    </View>
  );
}