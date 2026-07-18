import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useRouter } from "expo-router";

// 💡 MODIFICA ESTE VALOR PARA CAMBIAR EL TIEMPO (en milisegundos):
// 1000 = 1 segundo | 3000 = 3 segundos | 5000 = 5 segundos
const TIEMPO_SPLASH_MS = 3000; 

// Splash de marca. El guard del root layout redirige a /login o /home segun la sesion.
export default function Index() {
  const router = useRouter();
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
    // Usa la constante para controlar la duración
    const timer = setTimeout(() => {
      setIsTimeUp(true);
    }, TIEMPO_SPLASH_MS);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isTimeUp) {
      // Guard de sesión
      const isAuthenticated = false; // Simulación de sesión
      
      if (isAuthenticated) {
        router.replace("/home");
      } else {
        router.replace("/(auth)/login");
      }
    }
  }, [isTimeUp, router]);

  return (
    <View className="flex-1 items-center justify-center bg-primary">
      <Text className="text-4xl font-bold text-white">PuntualMed</Text>
    </View>
  );
}