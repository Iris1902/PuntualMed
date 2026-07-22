import { router } from "expo-router";
import * as ExpoSplashScreen from "expo-splash-screen";
import { useEffect, useRef } from "react";
import { Animated, Image, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { palette } from "@/constants/puntualmed";
import { useAuth } from "@/contexts/auth";

export default function SplashScreen() {
  const { session, isLoading } = useAuth();

  useEffect(() => {
    ExpoSplashScreen.hideAsync();
  }, []);

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.1)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslateY = useRef(new Animated.Value(24)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 4,
        tension: 35,
        useNativeDriver: true,
      }),
    ]).start();

    const t1 = setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(titleTranslateY, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 700);

    const t2 = setTimeout(() => {
      Animated.timing(taglineOpacity, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, 1300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => {
        router.replace(session ? "/(tabs)" : "/login");
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [isLoading, session]);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={palette.navy} />
      <View style={styles.container}>
        <Animated.View style={[styles.logoRing, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <Image
            source={require("../assets/images/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.Text style={[styles.title, { opacity: titleOpacity, transform: [{ translateY: titleTranslateY }] }]}>
          PuntualMed
        </Animated.Text>

        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          Recordatorios médicos para pacientes y familiares.
        </Animated.Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.navy,
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoRing: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 36,
    height: 110,
    justifyContent: "center",
    marginBottom: 24,
    width: 110,
  },
  logo: {
    height: 100,
    width: 100,
  },
  title: {
    color: palette.white,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 1,
  },
  tagline: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
    textAlign: "center",
  },
});
