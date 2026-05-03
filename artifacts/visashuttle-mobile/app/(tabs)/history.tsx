import { ActivityIndicator, FlatList, Platform, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ScreenHeader, PrimaryButton } from "@/components/UI";
import { apiGet } from "@/lib/api";
import { useColors } from "@/hooks/useColors";

interface VisaCheck {
  id: string;
  checkType: string;
  formData: Record<string, string>;
  approvalChance: number | null;
  statusLabel: string | null;
  createdAt: string;
}

interface ColorPalette {
  mutedForeground: string;
  success: string;
  primary: string;
  warning: string;
  destructive: string;
}

function scoreColor(score: number | null, palette: ColorPalette) {
  if (score === null) return palette.mutedForeground;
  if (score >= 80) return palette.success;
  if (score >= 60) return palette.primary;
  if (score >= 40) return palette.warning;
  return palette.destructive;
}

export default function History() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webBottom = Platform.OS === "web" ? 84 : 100;

  const { data, isLoading, refetch, isRefetching } = useQuery<VisaCheck[]>({
    queryKey: ["b2c", "checks"],
    queryFn: () => apiGet<VisaCheck[]>("/api/b2c/checks"),
  });

  const checks = data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: webBottom + 20,
        }}
        data={checks}
        keyExtractor={(it) => it.id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        ListHeaderComponent={
          <ScreenHeader
            title="Check history"
            subtitle={
              isLoading
                ? "Loading…"
                : `${checks.length} check${checks.length === 1 ? "" : "s"} completed`
            }
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingVertical: 60, alignItems: "center" }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View
              style={{
                borderRadius: 18,
                borderWidth: 2,
                borderStyle: "dashed",
                borderColor: colors.border,
                padding: 32,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: colors.primary + "14",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <Feather name="zap" size={24} color={colors.primary} />
              </View>
              <Text style={{ fontFamily: "Inter_700Bold", fontSize: 17, color: colors.foreground, marginBottom: 6 }}>
                No checks yet
              </Text>
              <Text
                style={{
                  fontFamily: "Inter_400Regular",
                  fontSize: 14,
                  color: colors.mutedForeground,
                  textAlign: "center",
                  marginBottom: 20,
                }}
              >
                Run your first visa check to see your results here.
              </Text>
              <View style={{ width: "100%" }}>
                <PrimaryButton title="Start a check" onPress={() => router.push("/basic-check")} icon="zap" />
              </View>
            </View>
          )
        }
        renderItem={({ item }) => {
          const fd = item.formData || {};
          const tone = scoreColor(item.approvalChance, colors);
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: "/history/[id]", params: { id: item.id } })}
              style={{
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: 16,
                padding: 14,
                marginBottom: 12,
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  backgroundColor: tone + "18",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 14,
                }}
              >
                {item.approvalChance !== null ? (
                  <>
                    <Text style={{ color: tone, fontFamily: "Inter_700Bold", fontSize: 16 }}>
                      {item.approvalChance}%
                    </Text>
                  </>
                ) : (
                  <Feather name="clock" size={20} color={colors.mutedForeground} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 15, color: colors.foreground }} numberOfLines={1}>
                  {fd["visaType"] || "Visa Check"} → {fd["destinationCountry"] || "—"}
                </Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 12, color: colors.mutedForeground, marginTop: 2 }} numberOfLines={1}>
                  {fd["nationality"] || ""} • {item.checkType === "deep" ? "Deep check" : "Basic check"}
                </Text>
                <Text style={{ fontFamily: "Inter_400Regular", fontSize: 11, color: colors.mutedForeground, marginTop: 4 }}>
                  {new Date(item.createdAt).toLocaleDateString()} •{" "}
                  {item.statusLabel || (item.approvalChance === null ? "Pending" : "Result ready")}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const _styles = StyleSheet.create({});
