import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { palette } from "@/constants/puntualmed";
import { useAuth } from "@/contexts/auth";
import { aiChat } from "@/lib/api";

const prompts = [
  "Resume la adherencia de esta semana",
  "Analiza sintomas historicos",
  "Revisa posibles efectos secundarios",
];

export default function AIScreen() {
  const { session } = useAuth();
  const token = session?.access_token ?? "";
  const tabBarHeight = useBottomTabBarHeight();

  const [messages, setMessages] = useState<{ role: string; content: string }[]>([
    {
      role: "ai",
      content:
        "Puedo ayudarte a leer recetas con OCR, revisar adherencia, sintomas y posibles efectos secundarios. Ante una urgencia, contacta a un profesional de salud.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend(msg?: string) {
    const text = msg || input.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await aiChat(token, text);
      setMessages((prev) => [...prev, { role: "ai", content: res.answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Error al comunicarse con la IA. Intenta de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={[styles.container, { paddingBottom: tabBarHeight + 10 }]}>
        <View style={styles.header}>
          <View style={styles.botIcon}>
            <Ionicons name="sparkles" size={24} color={palette.white} />
          </View>
          <View>
            <Text style={styles.kicker}>Agente clinico</Text>
            <Text style={styles.title}>PuntualMed IA</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.chat}>
          {messages.map((msg, i) => (
            <View
              key={i}
              style={[msg.role === "ai" ? styles.messageAi : styles.messageUser]}
            >
              <Text
                style={[
                  msg.role === "ai" ? styles.messageAiText : styles.messageUserText,
                ]}
              >
                {msg.content}
              </Text>
            </View>
          ))}
          {loading && (
            <View style={styles.messageAi}>
              <ActivityIndicator color={palette.navy} />
            </View>
          )}
          {messages.length === 1 &&
            prompts.map((prompt) => (
              <Pressable
                key={prompt}
                style={styles.prompt}
                onPress={() => handleSend(prompt)}
              >
                <Ionicons name="chevron-forward" size={18} color={palette.navy} />
                <Text style={styles.promptText}>{prompt}</Text>
              </Pressable>
            ))}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            placeholder="Pregunta sobre sintomas o tratamiento"
            placeholderTextColor={palette.grayLight}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend()}
          />
          <Pressable
            style={[styles.send, loading && { opacity: 0.6 }]}
            onPress={() => handleSend()}
            disabled={loading}
          >
            <Ionicons name="send" size={18} color={palette.white} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.bg },
  container: { flex: 1, padding: 20 },
  header: { alignItems: "center", flexDirection: "row", gap: 12 },
  botIcon: {
    alignItems: "center",
    backgroundColor: palette.navy,
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  kicker: { color: palette.gray, fontSize: 13 },
  title: { color: palette.slate, fontSize: 26, fontWeight: "900" },
  chat: { gap: 12, paddingVertical: 20 },
  messageAi: {
    alignSelf: "flex-start",
    backgroundColor: palette.white,
    borderRadius: 18,
    maxWidth: "92%",
    padding: 16,
  },
  messageAiText: { color: palette.slate, fontSize: 15, lineHeight: 22 },
  messageUser: {
    alignSelf: "flex-end",
    backgroundColor: palette.navy,
    borderRadius: 18,
    maxWidth: "92%",
    padding: 16,
  },
  messageUserText: { color: palette.white, fontSize: 15, lineHeight: 22 },
  prompt: {
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 14,
  },
  promptText: { color: palette.navy, flex: 1, fontWeight: "800" },
  composer: {
    alignItems: "center",
    backgroundColor: palette.white,
    borderRadius: 20,
    flexDirection: "row",
    gap: 10,
    padding: 8,
  },
  input: {
    color: palette.slate,
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  send: {
    alignItems: "center",
    backgroundColor: palette.navy,
    borderRadius: 16,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
});
