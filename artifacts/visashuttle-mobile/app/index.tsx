import { useEffect } from "react";
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { AnimatedOrbs } from "@/components/AnimatedOrbs";
import { FlyingPlane } from "@/components/FlyingPlane";
import { Starfield } from "@/components/Starfield";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W } = Dimensions.get("window");

const DESTINATIONS = [
  { flag: "🇺🇸", name: "USA" },
  { flag: "🇬🇧", name: "UK" },
  { flag: "🇨🇦", name: "Canada" },
  { flag: "🇦🇺", name: "Australia" },
  { flag: "🇪🇺", name: "Schengen" },
  { flag: "🇯🇵", name: "Japan" },
  { flag: "🇦🇪", name: "UAE" },
  { flag: "🇸🇬", name: "Singapore" },
];

export default function Welcome() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const logoScale = useSharedValue(0.6);
  const logoRot = useSharedValue(0);
  const ringPulse = useSharedValue(0);
  const orbitRot = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withSequence(
      withTiming(1.08, { duration: 700, easing: Easing.out(Easing.back(1.6)) }),
      withTiming(1, { duration: 350, easing: Easing.inOut(Easing.quad) }),
    );
    logoRot.value = withRepeat(
      withSequence(
        withTiming(2, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
        withTiming(-2, { duration: 3000, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    ringPulse.value = withDelay(
      400,
      withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false),
    );
    orbitRot.value = withRepeat(
      withTiming(360, { duration: 18000, easing: Easing.linear }),
      -1,
      false,
    );
  }, [logoScale, logoRot, ringPulse, orbitRot]);

  useEffect(() => {
    if (!loading && user) router.replace("/(tabs)");
  }, [loading, user, router]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }, { rotate: `${logoRot.value}deg` }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ringPulse.value, [0, 0.5, 1], [0.55, 0.25, 0]),
    transform: [{ scale: interpolate(ringPulse.value, [0, 1], [0.7, 1.7]) }],
  }));

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${orbitRot.value}deg` }],
  }));

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
      start={{ x: 0.05, y: 0 }}
      end={{ x: 0.95, y: 1 }}
      style={styles.root}
    >
      <AnimatedOrbs variant="hero" />
      <Starfield count={28} seed={11} />
      <FlyingPlane width={SCREEN_W} />

      {loading ? (
        <Animated.View entering={FadeIn.duration(300)} style={styles.loadingFill}>
          <Image
            source={require("@/assets/brand/logo-white.png")}
            style={{ width: 84, height: 84 }}
            contentFit="contain"
          />
          <ActivityIndicator color="#fff" style={{ marginTop: 18 }} />
        </Animated.View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.container,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 28 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(600)} style={styles.logoBlock}>
            <View style={styles.logoStage}>
              <Animated.View style={[styles.orbit, orbitStyle]}>
                <View style={[styles.orbitDot, { top: 0, left: "50%", marginLeft: -4 }]} />
                <View style={[styles.orbitDotSm, { top: "50%", right: 0, marginTop: -3 }]} />
                <View style={[styles.orbitDot, { bottom: 0, left: "50%", marginLeft: -4 }]} />
                <View style={[styles.orbitDotSm, { top: "50%", left: 0, marginTop: -3 }]} />
              </Animated.View>
              <Animated.View style={[styles.ring, ringStyle]} />
              <Animated.View style={[styles.logoWrap, logoStyle]}>
                <Image
                  source={require("@/assets/brand/logo-white.png")}
                  style={{ width: 64, height: 64 }}
                  contentFit="contain"
                />
              </Animated.View>
            </View>
            <Text style={styles.brand}>VisaShuttle</Text>
            <Text style={styles.brandSub}>AI-powered visa approval</Text>
          </Animated.View>

          <View style={styles.middle}>
            <Animated.View entering={FadeInUp.duration(700).delay(200)} style={styles.badge}>
              <Feather name="zap" size={12} color="#fff" />
              <Text style={styles.badgeText}>1 free check · no card</Text>
            </Animated.View>

            <Animated.Text entering={FadeInUp.duration(700).delay(350)} style={styles.title}>
              Know your visa{"\n"}chances{" "}
              <Text style={styles.titleAccent}>in seconds.</Text>
            </Animated.Text>

            <Animated.Text entering={FadeInUp.duration(700).delay(500)} style={styles.sub}>
              Personalized AI assessment of your approval probability — for any nationality, any destination.
            </Animated.Text>

            <Animated.View entering={FadeInUp.duration(600).delay(650)} style={styles.chipRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingRight: 24 }}
              >
                {DESTINATIONS.map((d) => (
                  <View key={d.name} style={styles.chip}>
                    <Text style={styles.chipFlag}>{d.flag}</Text>
                    <Text style={styles.chipText}>{d.name}</Text>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>

            <View style={styles.features}>
              {[
                { icon: "globe", text: "100+ nationalities & destinations" },
                { icon: "shield", text: "Private and bank-grade secure" },
                { icon: "clock", text: "Results in under 60 seconds" },
              ].map((f, i) => (
                <Animated.View
                  key={f.text}
                  entering={FadeInUp.duration(500).delay(800 + i * 120)}
                  style={styles.feature}
                >
                  <View style={styles.featureIcon}>
                    <Feather name={f.icon as keyof typeof Feather.glyphMap} size={14} color="#fff" />
                  </View>
                  <Text style={styles.featureText}>{f.text}</Text>
                </Animated.View>
              ))}
            </View>
          </View>

          <Animated.View entering={FadeInUp.duration(700).delay(1200)} style={styles.bottom}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/join");
              }}
              style={({ pressed }) => [styles.primaryBtn, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <Text style={styles.primaryBtnText}>Create free account</Text>
              <View style={styles.primaryBtnArrow}>
                <Feather name="arrow-right" size={18} color={colors.gradientMid} />
              </View>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push("/sign-in");
              }}
              style={styles.ghostBtn}
            >
              <Text style={styles.ghostBtnText}>I already have an account</Text>
            </Pressable>

            <View style={styles.legal}>
              <Feather name="lock" size={11} color="rgba(255,255,255,0.7)" />
              <Text style={styles.legalText}>End-to-end encrypted · No spam</Text>
            </View>
          </Animated.View>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#1B1F4A" },
  loadingFill: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { flexGrow: 1, paddingHorizontal: 24, justifyContent: "space-between", minHeight: "100%" },
  logoBlock: { alignItems: "center", marginTop: 8 },
  logoStage: { width: 140, height: 140, alignItems: "center", justifyContent: "center" },
  orbit: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderStyle: "dashed",
  },
  orbitDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    shadowColor: "#fff",
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  orbitDotSm: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  ring: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  brand: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 28, marginTop: 18, letterSpacing: 0.3 },
  brandSub: {
    color: "rgba(255,255,255,0.85)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 6,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  middle: { marginTop: 22 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  badgeText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12, marginLeft: 6 },
  title: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 36, lineHeight: 42, letterSpacing: -0.5 },
  titleAccent: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 36, lineHeight: 42, fontStyle: "italic" },
  sub: { color: "rgba(255,255,255,0.9)", fontFamily: "Inter_400Regular", fontSize: 15, marginTop: 14, lineHeight: 22 },
  chipRow: { marginTop: 18, marginHorizontal: -24, paddingLeft: 24 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  chipFlag: { fontSize: 14 },
  chipText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 12 },
  features: { marginTop: 22, gap: 10 },
  feature: { flexDirection: "row", alignItems: "center" },
  featureIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  featureText: { color: "rgba(255,255,255,0.95)", fontFamily: "Inter_500Medium", fontSize: 14 },
  bottom: { marginTop: 28 },
  primaryBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  primaryBtnText: { color: "#1F2330", fontFamily: "Inter_700Bold", fontSize: 16 },
  primaryBtnArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(144,51,245,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },
  ghostBtn: {
    marginTop: 10,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  ghostBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  legal: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 14, gap: 6 },
  legalText: { color: "rgba(255,255,255,0.7)", fontFamily: "Inter_500Medium", fontSize: 11 },
});
