import { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, Field, Picker, PrimaryButton, ScreenHeader } from "@/components/UI";
import { apiGet, apiPut } from "@/lib/api";
import { COUNTRIES, EMPLOYMENT_STATUSES, GENDERS, INCOME_RANGES, BANK_BALANCE_RANGES } from "@/lib/data";
import { useColors } from "@/hooks/useColors";

interface SavedProfile {
  fullName: string | null;
  nationality: string | null;
  countryOfResidence: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  employmentStatus: string | null;
  monthlyIncome: string | null;
  bankBalance: string | null;
  hasPassport: boolean | null;
  hasBankStatement: boolean | null;
  hasIncomeProof: boolean | null;
  hasTaxReturn: boolean | null;
}

const EMPTY: SavedProfile = {
  fullName: "", nationality: "", countryOfResidence: "", dateOfBirth: "", gender: "",
  employmentStatus: "", monthlyIncome: "", bankBalance: "",
  hasPassport: false, hasBankStatement: false, hasIncomeProof: false, hasTaxReturn: false,
};

export default function Profile() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const webBottom = Platform.OS === "web" ? 84 : 100;

  const { data, isLoading } = useQuery<SavedProfile>({
    queryKey: ["b2c", "profile"],
    queryFn: () => apiGet<SavedProfile>("/api/b2c/profile"),
  });

  const [form, setForm] = useState<SavedProfile>(EMPTY);

  useEffect(() => {
    if (data) setForm({ ...EMPTY, ...data });
  }, [data]);

  const mut = useMutation({
    mutationFn: (payload: SavedProfile) => apiPut("/api/b2c/profile", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["b2c", "profile"] });
      Alert.alert("Profile saved", "Your saved details will pre-fill future checks.");
    },
    onError: (e: any) => Alert.alert("Save failed", e?.message || "Please try again"),
  });

  const set = <K extends keyof SavedProfile>(k: K, v: SavedProfile[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 20,
          paddingBottom: webBottom + 20,
        }}
      >
        <ScreenHeader title="Saved profile" subtitle="Pre-fills your visa checks for faster results." />

        <Card>
          <Text style={[styles.section, { color: colors.foreground }]}>Personal</Text>
          <Field label="Full name" value={form.fullName ?? ""} onChangeText={(v) => set("fullName", v)} placeholder="As per passport" />
          <Picker label="Nationality" value={form.nationality ?? ""} options={COUNTRIES} onChange={(v) => set("nationality", v)} placeholder="Select country" />
          <Picker label="Country of residence" value={form.countryOfResidence ?? ""} options={COUNTRIES} onChange={(v) => set("countryOfResidence", v)} placeholder="Select country" />
          <Field label="Date of birth" value={form.dateOfBirth ?? ""} onChangeText={(v) => set("dateOfBirth", v)} placeholder="YYYY-MM-DD" />
          <Picker label="Gender" value={form.gender ?? ""} options={GENDERS} onChange={(v) => set("gender", v)} searchable={false} placeholder="Select" />
        </Card>

        <View style={{ height: 14 }} />

        <Card>
          <Text style={[styles.section, { color: colors.foreground }]}>Employment & finances</Text>
          <Picker label="Employment status" value={form.employmentStatus ?? ""} options={EMPLOYMENT_STATUSES} onChange={(v) => set("employmentStatus", v)} searchable={false} placeholder="Select" />
          <Picker label="Monthly income" value={form.monthlyIncome ?? ""} options={INCOME_RANGES} onChange={(v) => set("monthlyIncome", v)} searchable={false} placeholder="Select" />
          <Picker label="Bank balance" value={form.bankBalance ?? ""} options={BANK_BALANCE_RANGES} onChange={(v) => set("bankBalance", v)} searchable={false} placeholder="Select" />
        </Card>

        <View style={{ height: 14 }} />

        <Card>
          <Text style={[styles.section, { color: colors.foreground }]}>Documents on hand</Text>
          {[
            { k: "hasPassport", label: "Valid passport (6+ months)" },
            { k: "hasBankStatement", label: "Recent bank statements (6 months)" },
            { k: "hasIncomeProof", label: "Income proof / payslips" },
            { k: "hasTaxReturn", label: "Tax returns" },
          ].map((row) => (
            <View key={row.k} style={styles.toggleRow}>
              <Text style={{ flex: 1, fontFamily: "Inter_500Medium", color: colors.foreground }}>{row.label}</Text>
              <Switch
                value={!!(form as any)[row.k]}
                onValueChange={(v) => set(row.k as any, v as any)}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </Card>

        <View style={{ height: 20 }} />
        <PrimaryButton
          title="Save profile"
          icon="save"
          onPress={() => mut.mutate(form)}
          loading={mut.isPending || isLoading}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 14 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
});
