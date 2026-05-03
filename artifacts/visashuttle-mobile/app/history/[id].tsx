import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import { Card, PrimaryButton } from "@/components/UI";
import { apiGet } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

interface VisaCheck {
  id: string;
  checkType: string;
  formData: Record<string, string>;
  approvalChance: number | null;
  statusLabel: string | null;
  aiResponse: any;
  createdAt: string;
}

export default function HistoryDetail() {
  const colors = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading, error } = useQuery<VisaCheck>({
    queryKey: ["b2c", "checks", id],
    queryFn: () => apiGet<VisaCheck>(`/api/b2c/checks/${id}`),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (error || !data) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.background }}>
        <Feather name="alert-triangle" size={32} color={colors.destructive} />
        <Text style={{ marginTop: 8, color: colors.foreground, fontFamily: "Inter_700Bold" }}>Check not found</Text>
        <View style={{ height: 12, width: "100%" }} />
        <PrimaryButton title="Back to history" onPress={() => router.replace("/(tabs)/history")} variant="ghost" />
      </View>
    );
  }

  const score = data.approvalChance ?? 0;
  const fd = data.formData || {};
  const r = data.aiResponse || {};
  const strengths: string[] = r.strengths || [];
  const weaknesses: string[] = r.weaknesses || r.risks || [];
  const recommendations: string[] = r.recommendations || (r.actionPlan ? r.actionPlan.map((a: any) => a.title || a) : []);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientMid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={{ color: "rgba(255,255,255,0.85)", fontFamily: "Inter_500Medium", fontSize: 13 }}>
          {data.checkType === "deep" ? "Deep check result" : "Basic check result"}
        </Text>
        <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 56, marginTop: 4 }}>{score}%</Text>
        <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 15, marginTop: 4 }}>
          {data.statusLabel || (score >= 60 ? "Good chance" : "Improve your profile")}
        </Text>
      </LinearGradient>

      <Card style={{ marginTop: 16 }}>
        <Text style={[styles.h, { color: colors.foreground }]}>Application</Text>
        <Row label="Nationality" value={fd["nationality"]} />
        <Row label="Destination" value={fd["destinationCountry"]} />
        <Row label="Visa type" value={fd["visaType"]} />
        <Row label="Purpose" value={fd["purposeOfTravel"]} />
        <Row label="Duration" value={fd["tripDuration"]} />
        <Row label="Date" value={new Date(data.createdAt).toLocaleString()} />
      </Card>

      {r.summary ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={[styles.h, { color: colors.foreground }]}>Summary</Text>
          <Text style={{ fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 21 }}>{r.summary}</Text>
        </Card>
      ) : null}

      {strengths.length > 0 && (
        <Card style={{ marginTop: 12 }}>
          <Text style={[styles.h, { color: colors.foreground }]}>Strengths</Text>
          {strengths.map((s, i) => (
            <View key={i} style={styles.bullet}>
              <Feather name="check-circle" size={16} color={colors.success} />
              <Text style={[styles.bulletText, { color: colors.foreground }]}>{s}</Text>
            </View>
          ))}
        </Card>
      )}

      {weaknesses.length > 0 && (
        <Card style={{ marginTop: 12 }}>
          <Text style={[styles.h, { color: colors.foreground }]}>Watch out for</Text>
          {weaknesses.map((s, i) => (
            <View key={i} style={styles.bullet}>
              <Feather name="alert-circle" size={16} color={colors.warning} />
              <Text style={[styles.bulletText, { color: colors.foreground }]}>{s}</Text>
            </View>
          ))}
        </Card>
      )}

      {recommendations.length > 0 && (
        <Card style={{ marginTop: 12 }}>
          <Text style={[styles.h, { color: colors.foreground }]}>Recommendations</Text>
          {recommendations.map((s, i) => (
            <View key={i} style={styles.bullet}>
              <Feather name="arrow-right-circle" size={16} color={colors.primary} />
              <Text style={[styles.bulletText, { color: colors.foreground }]}>{s}</Text>
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_500Medium", fontSize: 13 }}>{label}</Text>
      <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold", fontSize: 13, flex: 1, textAlign: "right" }} numberOfLines={1}>
        {value || "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 22, padding: 22, alignItems: "center" },
  h: { fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6, gap: 16 },
  bullet: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  bulletText: { flex: 1, marginLeft: 8, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
