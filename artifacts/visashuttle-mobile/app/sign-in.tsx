import { useState } from "react";
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { AnimatedOrbs } from "@/components/AnimatedOrbs";
import { Field, PrimaryButton } from "@/components/UI";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W } = Dimensions.get("window");

export default function SignIn() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  async function submit() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Enter a valid email";
    if (!password) e.password = "Password is required";
    setErrors(e);
    if (Object.keys(e).length) return;

    setLoading(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
      router.replace("/(tabs)");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid credentials";
      Alert.alert("Sign in failed", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Animated gradient header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <AnimatedOrbs variant="header" />
        <View style={[styles.headerInner, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
            <Feather name="x" size={20} color="#fff" />
          </TouchableOpacity>

          <Animated.View entering={FadeInDown.duration(500)} style={styles.brandRow}>
            <View style={styles.logoChip}>
              <Image
                source={require("@/assets/brand/logo-white.png")}
                style={{ width: 30, height: 30 }}
                contentFit="contain"
              />
            </View>
            <Text style={styles.brandText}>VisaShuttle</Text>
          </Animated.View>

          <Animated.Text entering={FadeInDown.duration(600).delay(100)} style={styles.headline}>
            Welcome back
          </Animated.Text>
          <Animated.Text entering={FadeInDown.duration(600).delay(200)} style={styles.headlineSub}>
            Pick up where you left off and check more visas.
          </Animated.Text>
        </View>
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40, paddingTop: 22 }}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          entering={FadeInUp.duration(600).delay(150)}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            testID="signin-email"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            error={errors.password}
            testID="signin-password"
          />
          <PrimaryButton title="Sign in" onPress={submit} loading={loading} icon="log-in" />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(250)} style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(350)}>
          <TouchableOpacity
            onPress={() => router.replace("/join")}
            activeOpacity={0.8}
            style={[styles.signupCard, { borderColor: colors.border, backgroundColor: colors.muted }]}
          >
            <View style={[styles.signupIcon, { backgroundColor: colors.primary + "1a" }]}>
              <Feather name="user-plus" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>
                New to VisaShuttle?
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 }}>
                Create a free account · 1 free AI check included
              </Text>
            </View>
            <Feather name="arrow-right" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 280,
    width: SCREEN_W,
    overflow: "hidden",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerInner: { flex: 1, paddingHorizontal: 22 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  brandRow: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  logoChip: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    marginRight: 12,
  },
  brandText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: 0.2 },
  headline: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 30, marginTop: 18, letterSpacing: -0.4 },
  headlineSub: { color: "rgba(255,255,255,0.88)", fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 6 },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginTop: -28,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  dividerRow: { flexDirection: "row", alignItems: "center", marginTop: 22, gap: 10 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  signupCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderRadius: 16,
    gap: 12,
  },
  signupIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
