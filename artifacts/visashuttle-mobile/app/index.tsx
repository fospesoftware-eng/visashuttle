import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/UI";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

export default function Welcome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const colors = useColors();

  useEffect(() => {
    if (!loading && user) router.replace("/(tabs)");
  }, [loading, user, router]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.bg}
    >
      <View style={styles.top}>
        <Logo size={44} variant="white" showText />
      </View>

      <View style={styles.center}>
        <View style={styles.badge}>
          <Feather name="zap" size={12} color="#fff" />
          <Text style={styles.badgeText}>AI-powered visa checks</Text>
        </View>
        <Text style={styles.title}>Know your visa{"\n"}chances before you apply.</Text>
        <Text style={styles.sub}>
          Get a personalized AI assessment of your approval probability in under 60 seconds.
        </Text>

        <View style={styles.features}>
          {[
            { icon: "check-circle", text: "1 free AI check — no card needed" },
            { icon: "globe", text: "100+ nationalities & destinations" },
            { icon: "shield", text: "Private and secure" },
          ].map((f) => (
            <View key={f.text} style={styles.feature}>
              <Feather name={f.icon as any} size={16} color="#fff" />
              <Text style={styles.featureText}>{f.text}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={{ backgroundColor: "#fff", borderRadius: 16, overflow: "hidden" }}>
          <PrimaryButton title="Create free account" onPress={() => router.push("/join")} />
        </View>
        <View style={{ height: 12 }} />
        <PrimaryButton title="I already have an account" onPress={() => router.push("/sign-in")} variant="ghost" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 },
  top: { alignItems: "flex-start", marginBottom: 24 },
  center: { flex: 1, justifyContent: "center" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 16,
  },
  badgeText: { color: "#fff", fontFamily: "Inter_500Medium", fontSize: 12, marginLeft: 6 },
  title: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 34, lineHeight: 40 },
  sub: { color: "rgba(255,255,255,0.85)", fontFamily: "Inter_400Regular", fontSize: 16, marginTop: 14, lineHeight: 22 },
  features: { marginTop: 32 },
  feature: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  featureText: { color: "rgba(255,255,255,0.95)", fontFamily: "Inter_500Medium", fontSize: 14, marginLeft: 10 },
  bottom: {},
});
