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
      // Aquí irá tu lógica de AuthSession (ej. Supabase, Firebase o WebBrowser)
      // const response = await Google.logInAsync(config);
      Alert.alert("Google Auth", "Abriendo ventana de inicio de sesión con Google...");
    } catch (err) {
      Alert.alert("Error", "No se pudo conectar con Google");
    }
  }

  // Lógica para Autenticación con Facebook
  async function onFacebookSignIn() {
    try {
      // Aquí irá tu lógica de Login nativo con Facebook
      Alert.alert("Facebook Auth", "Abriendo ventana de inicio de sesión con Facebook...");
    } catch (err) {
      Alert.alert("Error", "No se pudo conectar con Facebook");
    }
  }

  return (
    <View className="flex-1 justify-center items-center bg-[#F3F4F6] px-4">
      
      {/* Contenedor del Logo y Título */}
      <View className="items-center mb-6 pt-10">
        <View className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-md mb-3">
          <Image 
            source={logoImg} 
            className="w-12 h-12" 
            resizeMode="contain"
          />
        </View>
        <Text className="text-xl font-bold text-[#1E3A8A]">PuntualMed</Text>
        <Text className="text-[#6B7280] text-xs mt-0.5">Tu tratamiento, guiado por inteligencia.</Text>
      </View>

      {/* Tarjeta Blanca del Formulario */}
      <View className="w-full bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-sm">
        <Text className="text-2xl font-bold text-[#1E293B] mb-1">Bienvenido de vuelta</Text>
        <Text className="text-[#6B7280] text-sm mb-6">Inicia sesión para continuar</Text>

        {/* Inputs con íconos integrados */}
        <View className="gap-4 mb-4">
          
          {/* Email Input */}
          <View className="flex-row items-center bg-white border border-[#E5E7EB] rounded-xl h-13 px-4 gap-3">
            <Mail size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Correo electrónico"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              className="flex-1 h-full text-[#1E293B] text-base"
            />
          </View>

          {/* Password Input */}
          <View className="flex-row items-center bg-white border border-[#E5E7EB] rounded-xl h-13 px-4 gap-3">
            <Lock size={18} color="#9CA3AF" />
            <TextInput
              placeholder="Contraseña"
              placeholderTextColor="#9CA3AF"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              className="flex-1 h-full text-[#1E293B] text-base"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              {showPassword ? <EyeOff size={18} color="#9CA3AF" /> : <Eye size={18} color="#9CA3AF" />}
            </TouchableOpacity>
          </View>
        </View>

        {error && <Text className="text-red-500 text-xs mb-2 text-center">{error}</Text>}

        {/* Enlace Olvidaste tu contraseña */}
        <View className="flex-row justify-end mb-5 -mt-1">
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
          className="bg-[#1E3A8A] h-13 rounded-3xl flex-row justify-center items-center shadow-md active:scale-95"
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-white text-base font-semibold">Iniciar sesión</Text>
          )}
        </TouchableOpacity>

        {/* Divisor "o" */}
        <View className="flex-row items-center my-5">
          <View className="flex-1 h-[1px] bg-[#E5E7EB]" />
          <Text className="text-[#9CA3AF] mx-3 text-xs">o</Text>
          <View className="flex-1 h-[1px] bg-[#E5E7EB]" />
        </View>

        {/* Botones Sociales con Redirección */}
        <View className="gap-3">
          
          {/* Botón de Google */}
          <TouchableOpacity 
            onPress={onGoogleSignIn}
            className="flex-row items-center justify-center border border-[#E5E7EB] rounded-3xl h-13 bg-white active:scale-95"
          >
            <Image 
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg' }} 
              className="w-5 h-5 mr-3" 
            />
            <Text className="text-[#1E293B] font-medium text-base">Continuar con Google</Text>
          </TouchableOpacity>

          {/* Botón de Facebook */}
          <TouchableOpacity 
            onPress={onFacebookSignIn}
            className="flex-row items-center justify-center rounded-3xl h-13 active:scale-95"
            style={{ backgroundColor: '#1877F2' }}
          >
            <Image 
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/F_icon.svg' }} 
              className="w-5 h-5 mr-3" 
              style={{ tintColor: '#ffffff' }}
            />
            <Text className="text-white font-medium text-base">Continuar con Facebook</Text>
          </TouchableOpacity>
          
        </View>
      </View>

      {/* Enlaces inferiores */}
      <View className="items-center mt-6 pb-6">
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