import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import { Card } from "@/components/UI";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

export default function CheckHome() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const webBottom = Platform.OS === "web" ? 84 : 100;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: webBottom + 20,
        }}
      >
        <View style={styles.header}>
          <Logo size={28} showText />
          <View style={{ flex: 1 }} />
          {user?.deepCheckAccess ? (
            <View style={[styles.proBadge, { backgroundColor: colors.accent + "18" }]}>
              <Feather name="award" size={12} color={colors.accent} />
              <Text style={{ color: colors.accent, fontFamily: "Inter_600SemiBold", fontSize: 11, marginLeft: 4 }}>
                PRO
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.greet, { color: colors.foreground }]}>
          Hi {user?.fullName?.split(" ")[0] || "there"} 👋
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Run a visa check to see your approval probability instantly.
        </Text>

        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push("/basic-check")} style={{ marginTop: 24 }}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientMid]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroIconWrap}>
              <Feather name="zap" size={24} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>Basic Visa Check</Text>
            <Text style={styles.heroDesc}>
              Quick AI assessment based on your nationality, destination & travel plan.
            </Text>
            <View style={styles.heroFooter}>
              <Text style={styles.heroCta}>Start free check</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => router.push("/deep-check")} style={{ marginTop: 16 }}>
          <Card style={{ borderColor: colors.accent + "40", borderWidth: 1.5 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={[
                  styles.deepIconWrap,
                  { backgroundColor: colors.accent + "12" },
                ]}
              >
                <Feather name="award" size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontFamily: "Inter_700Bold", fontSize: 17, color: colors.foreground }}>
                    Deep Visa Check
                  </Text>
                  <View
                    style={{
                      backgroundColor: colors.accent,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                      borderRadius: 6,
                      marginLeft: 8,
                    }}
                  >
                    <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 9 }}>PRO</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginTop: 4 }}>
                  Comprehensive analysis with employment, finances, history & action plan.
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
            </View>
          </Card>
        </TouchableOpacity>

        <View style={{ marginTop: 28 }}>
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: 17, color: colors.foreground, marginBottom: 12 }}>
            Quick links
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <QuickLink
              icon="clock"
              label="History"
              color={colors.primary}
              onPress={() => router.push("/(tabs)/history")}
            />
            <QuickLink
              icon="user"
              label="Profile"
              color={colors.accent}
              onPress={() => router.push("/(tabs)/profile")}
            />
            <QuickLink
              icon="settings"
              label="Account"
              color={colors.secondary}
              onPress={() => router.push("/(tabs)/account")}
            />
          </View>
        </View>

        {!user?.deepCheckAccess ? (
          <Card style={{ marginTop: 24, backgroundColor: colors.muted }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Feather name="info" size={18} color={colors.primary} />
              <Text style={{ marginLeft: 8, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>
                {user?.freeChecksRemaining ?? 1} free check{(user?.freeChecksRemaining ?? 1) === 1 ? "" : "s"} remaining
              </Text>
            </View>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground, marginTop: 6 }}>
              Upgrade to Deep Check for unlimited access and full action plans.
            </Text>
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

function QuickLink({
  icon,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          backgroundColor: color + "18",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={{ marginTop: 8, fontFamily: "Inter_500Medium", fontSize: 12, color: colors.foreground }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  proBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  greet: { fontFamily: "Inter_700Bold", fontSize: 26, marginTop: 12 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 4 },
  heroCard: { borderRadius: 22, padding: 22, overflow: "hidden" },
  heroIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  heroTitle: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 22 },
  heroDesc: { color: "rgba(255,255,255,0.85)", fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 6 },
  heroFooter: { flexDirection: "row", alignItems: "center", marginTop: 18 },
  heroCta: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14, marginRight: 8 },
  deepIconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 14 },
});
