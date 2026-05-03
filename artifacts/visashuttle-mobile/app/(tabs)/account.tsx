import { Alert, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { Card, ScreenHeader } from "@/components/UI";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

export default function Account() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const webBottom = Platform.OS === "web" ? 84 : 100;

  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/");
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: webBottom + 20,
        }}
      >
        <ScreenHeader title="Account" />

        <Card>
          <View style={styles.profileRow}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.primary + "18",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 22 }}>
                {(user?.fullName || user?.email || "?").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 17, color: colors.foreground }} numberOfLines={1}>
                {user?.fullName || "VisaShuttle user"}
              </Text>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.mutedForeground }} numberOfLines={1}>
                {user?.email}
              </Text>
              {user?.phone ? (
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 2 }} numberOfLines={1}>
                  {user.phone}
                </Text>
              ) : null}
            </View>
          </View>
        </Card>

        <View style={{ height: 14 }} />

        <Card>
          <Row icon="award" label={user?.deepCheckAccess ? "Deep Check access" : "Free plan"} value={user?.deepCheckAccess ? "Active" : `${user?.freeChecksRemaining ?? 1} check left`} colorTone={user?.deepCheckAccess ? colors.accent : colors.primary} />
          <Divider />
          <Row
            icon="user"
            label="Edit saved profile"
            onPress={() => router.push("/(tabs)/profile")}
            chevron
          />
          <Divider />
          <Row
            icon="clock"
            label="Check history"
            onPress={() => router.push("/(tabs)/history")}
            chevron
          />
        </Card>

        <View style={{ height: 14 }} />

        <Card>
          <Row
            icon="globe"
            label="Open web app"
            onPress={() => {
              const domain = process.env.EXPO_PUBLIC_DOMAIN;
              if (domain) Linking.openURL(`https://${domain}`);
            }}
            chevron
          />
          <Divider />
          <Row icon="info" label="About VisaShuttle" onPress={() => Alert.alert("VisaShuttle", "AI-powered visa approval checks. © VisaShuttle.")} chevron />
        </Card>

        <View style={{ height: 18 }} />
        <TouchableOpacity onPress={confirmSignOut} style={[styles.signOut, { borderColor: colors.destructive + "40" }]}>
          <Feather name="log-out" size={18} color={colors.destructive} />
          <Text style={{ color: colors.destructive, fontFamily: "Inter_600SemiBold", marginLeft: 8 }}>Sign out</Text>
        </TouchableOpacity>

        <View style={{ alignItems: "center", marginTop: 28 }}>
          <Logo size={20} />
          <Text style={{ marginTop: 6, color: colors.mutedForeground, fontFamily: "Inter_400Regular", fontSize: 12 }}>
            VisaShuttle Mobile
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  chevron,
  colorTone,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  chevron?: boolean;
  colorTone?: string;
}) {
  const colors = useColors();
  const tone = colorTone ?? colors.foreground;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      style={styles.row}
    >
      <Feather name={icon} size={18} color={tone} />
      <Text style={{ flex: 1, marginLeft: 12, fontFamily: "Inter_500Medium", color: colors.foreground }}>{label}</Text>
      {value ? (
        <Text style={{ fontFamily: "Inter_600SemiBold", color: tone, marginRight: chevron ? 6 : 0 }}>{value}</Text>
      ) : null}
      {chevron ? <Feather name="chevron-right" size={18} color={colors.mutedForeground} /> : null}
    </TouchableOpacity>
  );
}

function Divider() {
  const colors = useColors();
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 2 }} />;
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: "row", alignItems: "center" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  signOut: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
