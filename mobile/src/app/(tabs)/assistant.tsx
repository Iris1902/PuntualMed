import { useState, useRef, useEffect } from "react";
import { Pressable, ScrollView, Text, View, TextInput, KeyboardAvoidingView, Platform, Image } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { analyzeSymptoms, type AiMessage } from "@/lib/ai-api";
import { listSymptoms } from "@/lib/symptoms-api";
import { useAsync } from "@/lib/use-async";

// Importación de la imagen del robot según la estructura de tu proyecto
import robotImg from "@/assets/images/imagen-2.png";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
}

export default function Assistant() {
  const router = useRouter();
  const { data: symptoms, reload } = useAsync(listSymptoms);
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "ai",
      text: "Hola María, soy tu asistente PuntualMed. Puedo ayudarte a revisar tu tratamiento, consultar efectos secundarios registrados o analizar cómo has seguido tus medicamentos.",
      timestamp: "8:41 AM",
    }
  ]);
  
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const scrollViewRef = useRef<ScrollView>(null);

  useFocusEffect(
    useRef(() => {
      reload();
    }).current
  );

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [chatMessages, loading]);

  // Función unificada que procesa consultas escritas o sugerencias de síntomas
  async function onAnalyze(symptomId?: string, customText?: string) {
    if (loading) return;

    const userQuery = customText || (symptomId 
      ? `Analizar síntoma: "${symptomList.find(s => s.id === symptomId)?.description}"`
      : "Analizar todos los síntomas");

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: userQuery,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);
    setError(null);

    try {
      const response: AiMessage = await analyzeSymptoms(symptomId);
      
      const aiMsg: ChatMessage = {
        id: response.id || `ai-${Date.now()}`,
        sender: "ai",
        text: response.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, aiMsg]);
    } catch {
      setError("No se pudo completar el análisis en este momento.");
    } finally {
      setLoading(false);
    }
  }

  const symptomList = symptoms ?? [];

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"} 
      className="flex-1 bg-[#F3F4F6]"
    >
      {/* HEADER DE PUNTUALMED IA */}
      <View className="bg-white flex-row items-center px-4 h-16 border-b border-[#F3F4F6] gap-3 pt-2">
        <Pressable 
          onPress={() => router.back()}
          className="w-9 h-9 items-center justify-center rounded-full active:bg-gray-100"
        >
          <Text className="text-[#1E293B] text-2xl font-light">←</Text>
        </Pressable>

        {/* Avatar del Robot */}
        <View className="w-10 h-10 rounded-full overflow-hidden bg-[#1A2540] items-center justify-center">
          <Image 
            source={robotImg} 
            className="w-10 h-10"
            resizeMode="cover"
          />
        </View>

        <View className="flex-1">
          <Text className="text-[#1E293B] font-semibold text-[15px]">PuntualMed IA</Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            <View className="w-1.5 h-1.5 rounded-full bg-[#34D399]" />
            <Text className="text-[#6B7280] text-[11px]">En línea</Text>
          </View>
        </View>
        
        {/* Icono decorativo de robot a la derecha */}
        <Text className="text-[#D1D5DB] text-xl">🤖</Text>
      </View>

      {/* LÍNEA DE ECG / PULSO MÉDICO */}
      <View className="bg-white border-b border-[#F3F4F6] px-4 py-2 overflow-hidden">
        <Text className="text-[#EFF6FF] text-3xl tracking-widest font-thin" numberOfLines={1}>
          ~/\~/\/\_/\~/\_/\~/\~/\/\_/\~/\_/\~/\/\_/\~
        </Text>
      </View>

      {/* CHAT DE MENSAJES */}
      <ScrollView 
        ref={scrollViewRef}
        className="flex-1 px-4 py-4"
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {chatMessages.map((msg) => (
          <View 
            key={msg.id}
            className={`flex-row items-end gap-2 mb-4 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "ai" && (
              <View className="w-8 h-8 rounded-full overflow-hidden bg-[#1A2540] items-center justify-center mb-1">
                <Image 
                  source={robotImg} 
                  className="w-8 h-8"
                  resizeMode="cover"
                />
              </View>
            )}

            <View 
              className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                msg.sender === "user" ? "bg-[#1E3A8A]" : "bg-[#EFF6FF]"
              }`}
              style={{
                borderBottomLeftRadius: msg.sender === "ai" ? 4 : 16,
                borderBottomRightRadius: msg.sender === "user" ? 4 : 16,
              }}
            >
              <Text className={`text-[14px] leading-5 ${msg.sender === "user" ? "text-white" : "text-[#1E293B]"}`}>
                {msg.text}
              </Text>
              <Text className={`text-[10px] mt-1 text-right ${msg.sender === "user" ? "text-white/60" : "text-[#9CA3AF]"}`}>
                {msg.timestamp}
              </Text>
            </View>
          </View>
        ))}

        {/* ERROR DE RED O API */}
        {error ? (
          <View className="bg-red-50 p-3 rounded-xl border border-red-100 my-2">
            <Text className="text-[#EF4444] text-xs text-center font-medium">{error}</Text>
          </View>
        ) : null}

        {/* ESTADO CARGANDO / PROCESANDO ANÁLISIS */}
        {loading && (
          <View className="flex-row items-end gap-2 mb-4 justify-start">
            <View className="w-8 h-8 rounded-full overflow-hidden bg-[#1A2540] items-center justify-center mb-1">
              <Image 
                source={robotImg} 
                className="w-8 h-8"
                resizeMode="cover"
              />
            </View>
            <View className="bg-[#EFF6FF] rounded-2xl rounded-bl-sm px-4 py-3">
              <Text className="text-[#1E3A8A] text-xs font-semibold">Analizando...</Text>
            </View>
          </View>
        )}

        {/* LISTADO DE SÍNTOMAS DEL USUARIO COMO SUGERENCIAS RÁPIDAS */}
        {!loading && symptomList.length > 0 && (
          <View className="mt-4">
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
            >
              {symptomList.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => onAnalyze(s.id)}
                  className="bg-white border border-[#E5E7EB] rounded-full px-4 py-2 active:bg-gray-50 active:scale-95"
                >
                  <Text className="text-[#1E293B] text-[13px] font-medium">
                    {s.description}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* MENSAJE EN CASO DE NO CONTAR CON SÍNTOMAS REGISTRADOS */}
        {!loading && symptomList.length === 0 && (
          <View className="bg-white p-4 rounded-2xl border border-gray-100 items-center mt-4 mx-2">
            <Text className="text-center text-[#6B7280] text-xs leading-5">
              No tienes síntomas registrados actualmente. Registra uno nuevo para iniciar análisis específicos.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* INPUT BARRA DE CONSULTA INFERIOR */}
      <View className="absolute bottom-6 left-0 right-0 bg-white border-t border-[#F3F4F6] px-4 py-3 flex-row items-center gap-3">
        <View className="flex-1 bg-[#F3F4F6] border border-[#E5E7EB] rounded-full px-4 justify-center h-11">
          <TextInput
            value={inputText}
            onChangeText={setInputText}
            placeholder="Escribe tu consulta..."
            placeholderTextColor="#9CA3AF"
            className="text-sm text-[#1E293B]"
            onSubmitEditing={() => inputText.trim() && onAnalyze(undefined, inputText)}
          />
        </View>
        
        <Pressable
          onPress={() => inputText.trim() && onAnalyze(undefined, inputText)}
          disabled={loading || !inputText.trim()}
          className={`w-11 h-11 rounded-full items-center justify-center active:scale-95 ${
            inputText.trim() ? "bg-[#1E3A8A]" : "bg-gray-300"
          }`}
        >
          {/* Icono de Enviar (Triángulo estilizado) */}
          <Text className="text-white text-base font-bold">➔</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}