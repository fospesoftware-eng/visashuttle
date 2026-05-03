import { useState } from "react";
import { Alert, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { AnimatedOrbs } from "@/components/AnimatedOrbs";
import { Starfield } from "@/components/Starfield";
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
      {/* Soft gradient watermark behind body so the brand color bleeds into the form area */}
      <LinearGradient
        colors={[colors.primary + "14", colors.background, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, { top: 240 }]}
        pointerEvents="none"
      />

      {/* Animated gradient header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <AnimatedOrbs variant="header" />
        <Starfield count={18} seed={3} />
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
            icon="mail"
            testID="signin-email"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            secureTextEntry
            error={errors.password}
            icon="lock"
            testID="signin-password"
          />
          <PrimaryButton title="Sign in" onPress={submit} loading={loading} icon="log-in" />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(220)} style={styles.trustRow}>
          {[
            { icon: "shield", label: "Bank-grade\nencryption" },
            { icon: "zap", label: "Results in\n<60 seconds" },
            { icon: "users", label: "Trusted by\n10k+ users" },
          ].map((t) => (
            <View key={t.label} style={[styles.trustItem, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <View style={[styles.trustIcon, { backgroundColor: colors.primary + "14" }]}>
                <Feather name={t.icon as keyof typeof Feather.glyphMap} size={14} color={colors.primary} />
              </View>
              <Text style={[styles.trustLabel, { color: colors.foreground }]}>{t.label}</Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(280)} style={styles.dividerRow}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={[styles.dividerDiamond, { backgroundColor: colors.primary }]}>
            <Feather name="star" size={10} color="#fff" />
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(350)}>
          <TouchableOpacity
            onPress={() => router.replace("/join")}
            activeOpacity={0.85}
            style={[styles.signupCard, { borderColor: colors.primary + "30", backgroundColor: colors.card }]}
          >
            <LinearGradient
              colors={[colors.gradientStart, colors.gradientMid]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.signupIcon}
            >
              <Feather name="user-plus" size={18} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontFamily: "Inter_700Bold", fontSize: 14 }}>
                New to VisaShuttle?
              </Text>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 }}>
                Create a free account · 1 free AI check
              </Text>
            </View>
            <View style={[styles.signupArrow, { backgroundColor: colors.primary + "12" }]}>
              <Feather name="arrow-right" size={16} color={colors.primary} />
            </View>
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
  headlineSub: { color: "rgba(255,255,255,0.92)", fontFamily: "Inter_500Medium", fontSize: 14, marginTop: 6 },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginTop: -32,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },
  trustRow: { flexDirection: "row", gap: 10, marginTop: 18 },
  trustItem: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 8,
  },
  trustIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  trustLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 14,
  },
  dividerRow: { flexDirection: "row", alignItems: "center", marginTop: 22, gap: 10 },
  divider: { flex: 1, height: 1 },
  dividerDiamond: {
    width: 22,
    height: 22,
    borderRadius: 6,
    transform: [{ rotate: "45deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  signupCard: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1.5,
    borderRadius: 18,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  signupIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  signupArrow: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
});
