import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

import { AnimatedOrbs } from "@/components/AnimatedOrbs";
import { Field, PrimaryButton } from "@/components/UI";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W } = Dimensions.get("window");

type Step = "info" | "otp";

export default function Join() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refresh } = useAuth();

  const [step, setStep] = useState<Step>("info");
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [resendIn, setResendIn] = useState(0);
  const [loading, setLoading] = useState(false);
  const otpRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  function validate() {
    const e: Record<string, string> = {};
    if (!form.fullName.trim()) e.fullName = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email";
    const digits = form.phone.replace(/\D/g, "");
    if (!digits) e.phone = "Phone is required";
    else if (digits.length < 7) e.phone = "Enter a valid phone";
    if (!form.password) e.password = "Password required";
    else if (form.password.length < 8) e.password = "At least 8 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function fullPhone() {
    const d = form.phone.replace(/\D/g, "");
    return d.startsWith("+") ? d : `+${d}`;
  }

  async function sendOtp() {
    if (!validate()) return;
    setLoading(true);
    try {
      await apiPost("/api/b2c/otp/send", { phone: fullPhone(), email: form.email });
      setStep("otp");
      setResendIn(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 200);
      Alert.alert("Demo code", "Use 1234 to verify (no SMS sent in demo).");
    } catch (e) {
      Alert.alert("Failed to send code", e instanceof Error ? e.message : "Please try again");
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (resendIn > 0) return;
    setLoading(true);
    try {
      await apiPost("/api/b2c/otp/send", { phone: fullPhone(), email: form.email });
      setOtp(["", "", "", ""]);
      setResendIn(60);
      otpRefs.current[0]?.focus();
    } catch (e) {
      Alert.alert("Failed", e instanceof Error ? e.message : "Please try again");
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    const code = otp.join("");
    if (code.length < 4) {
      Alert.alert("Enter the full code", "Please enter all 4 digits");
      return;
    }
    setLoading(true);
    try {
      await apiPost("/api/b2c/otp/verify", { phone: fullPhone(), otp: code });
      await apiPost("/api/b2c/auth/register", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        fullName: form.fullName,
        phone: fullPhone(),
        otp: code,
      });
      await refresh();
      router.replace("/(tabs)");
    } catch (e) {
      Alert.alert("Verification failed", e instanceof Error ? e.message : "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  }

  function handleOtp(idx: number, v: string) {
    const digit = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 3) otpRefs.current[idx + 1]?.focus();
  }

  function handleOtpKey(idx: number, e: { nativeEvent: { key: string } }) {
    if (e.nativeEvent.key === "Backspace" && !otp[idx] && idx > 0) {
      otpRefs.current[idx - 1]?.focus();
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
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
            {step === "info" ? "Create your account" : "Verify your number"}
          </Animated.Text>
          <Animated.Text entering={FadeInDown.duration(600).delay(200)} style={styles.headlineSub}>
            {step === "info"
              ? "1 free AI visa check · no credit card required"
              : "We sent a 4-digit code · demo code is 1234"}
          </Animated.Text>
        </View>
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40, paddingTop: 22 }}
        keyboardShouldPersistTaps="handled"
      >
        {step === "info" ? (
          <>
            <Animated.View
              entering={FadeInUp.duration(600).delay(150)}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Field
                label="Full name"
                value={form.fullName}
                onChangeText={(v) => setForm({ ...form, fullName: v })}
                placeholder="John Smith"
                error={errors.fullName}
              />
              <Field
                label="Email"
                value={form.email}
                onChangeText={(v) => setForm({ ...form, email: v })}
                placeholder="you@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />
              <Field
                label="Phone (with country code)"
                value={form.phone}
                onChangeText={(v) => setForm({ ...form, phone: v })}
                placeholder="+1 555 123 4567"
                keyboardType="phone-pad"
                error={errors.phone}
              />
              <Field
                label="Password"
                value={form.password}
                onChangeText={(v) => setForm({ ...form, password: v })}
                placeholder="At least 8 characters"
                secureTextEntry
                error={errors.password}
              />
              <PrimaryButton title="Send verification code" onPress={sendOtp} loading={loading} icon="send" />
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(600).delay(250)} style={styles.footerRow}>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 14 }}>
                Already have an account?{" "}
              </Text>
              <TouchableOpacity onPress={() => router.replace("/sign-in")}>
                <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 }}>Sign in</Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        ) : (
          <Animated.View
            entering={FadeInUp.duration(600).delay(150)}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13, marginBottom: 12 }}>
              Sent to {fullPhone()}
            </Text>
            <View style={styles.otpRow}>
              {otp.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(r) => {
                    otpRefs.current[i] = r;
                  }}
                  value={d}
                  onChangeText={(v) => handleOtp(i, v)}
                  onKeyPress={(e) => handleOtpKey(i, e)}
                  keyboardType="number-pad"
                  maxLength={1}
                  style={[
                    styles.otpInput,
                    {
                      borderColor: d ? colors.primary : colors.border,
                      backgroundColor: colors.muted,
                      color: colors.foreground,
                    },
                  ]}
                />
              ))}
            </View>

            <PrimaryButton title="Verify & create account" onPress={verify} loading={loading} icon="check" />
            <View style={{ height: 10 }} />
            <PrimaryButton
              title={resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
              onPress={resend}
              loading={false}
              disabled={resendIn > 0}
              variant="ghost"
            />
            <TouchableOpacity onPress={() => setStep("info")} style={{ marginTop: 14, alignItems: "center" }}>
              <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium" }}>← Edit details</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 260,
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
  brandRow: { flexDirection: "row", alignItems: "center", marginTop: 16 },
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
  brandText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 18 },
  headline: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 26, marginTop: 16, letterSpacing: -0.3 },
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
  footerRow: { flexDirection: "row", justifyContent: "center", marginTop: 22 },
  otpRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 18 },
  otpInput: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 2,
    textAlign: "center",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
});
