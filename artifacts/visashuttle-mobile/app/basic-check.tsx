import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import { Card, Field, Picker, PrimaryButton } from "@/components/UI";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { apiPost } from "@/lib/api";
import { COUNTRIES, PURPOSES, TRIP_DURATIONS, VISA_TYPES, EMPLOYMENT_STATUSES, INCOME_RANGES } from "@/lib/data";
import { useColors } from "@/hooks/useColors";

interface BasicForm {
  nationality: string;
  destinationCountry: string;
  visaType: string;
  purposeOfTravel: string;
  tripDuration: string;
  employmentStatus: string;
  monthlyIncome: string;
  hasPassport: string;
  hasBankStatement: string;
  travelHistory: string;
}

const EMPTY: BasicForm = {
  nationality: "", destinationCountry: "", visaType: "", purposeOfTravel: "",
  tripDuration: "", employmentStatus: "", monthlyIncome: "",
  hasPassport: "", hasBankStatement: "", travelHistory: "",
};

const STEPS = [
  { title: "Travel", icon: "map" as const },
  { title: "Profile", icon: "user" as const },
  { title: "Documents", icon: "file-text" as const },
];

const YES_NO = ["Yes", "No"];

export default function BasicCheck() {
  const colors = useColors();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<BasicForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const set = <K extends keyof BasicForm>(k: K) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const stepValid = useMemo(() => {
    if (step === 1) return form.nationality && form.destinationCountry && form.visaType && form.purposeOfTravel && form.tripDuration;
    if (step === 2) return form.employmentStatus && form.monthlyIncome;
    if (step === 3) return form.hasPassport && form.hasBankStatement && form.travelHistory;
    return false;
  }, [form, step]);

  async function submit() {
    setSubmitting(true);
    try {
      const res = await apiPost<{ check: any; result: any }>("/api/b2c/check", {
        checkType: "basic",
        formData: form,
      });
      setResult(res);
    } catch (e: any) {
      setResult({ error: e?.message || "Check failed" });
    } finally {
      setSubmitting(false);
    }
  }

  if (result && !result.error) {
    const r = result.result || {};
    const score = r.approvalChance ?? 0;
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientMid]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.resultHero}
        >
          <Text style={{ color: "rgba(255,255,255,0.85)", fontFamily: "Inter_500Medium", fontSize: 13 }}>
            Your approval probability
          </Text>
          <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 64, marginTop: 4 }}>
            {score}%
          </Text>
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16, marginTop: 4 }}>
            {r.statusLabel || (score >= 60 ? "Good chance" : "Improve your profile")}
          </Text>
        </LinearGradient>

        {r.summary ? (
          <Card style={{ marginTop: 16 }}>
            <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 6 }}>Summary</Text>
            <Text style={{ fontFamily: "Inter_400Regular", color: colors.foreground, lineHeight: 21 }}>
              {r.summary}
            </Text>
          </Card>
        ) : null}

        {Array.isArray(r.strengths) && r.strengths.length > 0 ? (
          <Card style={{ marginTop: 12 }}>
            <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 8 }}>Strengths</Text>
            {r.strengths.map((s: string, i: number) => (
              <View key={i} style={styles.bulletRow}>
                <Feather name="check-circle" size={16} color={colors.success} />
                <Text style={[styles.bulletText, { color: colors.foreground }]}>{s}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {Array.isArray(r.riskFactors) && r.riskFactors.length > 0 ? (
          <Card style={{ marginTop: 12 }}>
            <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 8 }}>Watch out for</Text>
            {r.riskFactors.map((s: string, i: number) => (
              <View key={i} style={styles.bulletRow}>
                <Feather name="alert-circle" size={16} color={colors.warning} />
                <Text style={[styles.bulletText, { color: colors.foreground }]}>{s}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        {Array.isArray(r.nextSteps) && r.nextSteps.length > 0 ? (
          <Card style={{ marginTop: 12 }}>
            <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 8 }}>Next steps</Text>
            {r.nextSteps.map((s: string, i: number) => (
              <View key={i} style={styles.bulletRow}>
                <Feather name="arrow-right-circle" size={16} color={colors.primary} />
                <Text style={[styles.bulletText, { color: colors.foreground }]}>{s}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <View style={{ height: 16 }} />
        <PrimaryButton title="Run another check" icon="refresh-ccw" onPress={() => { setResult(null); setForm(EMPTY); setStep(1); }} />
        <View style={{ height: 12 }} />
        <PrimaryButton title="Back to home" onPress={() => router.replace("/(tabs)")} variant="ghost" />
      </ScrollView>
    );
  }

  if (result?.error) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: colors.background }}>
        <Feather name="alert-triangle" size={36} color={colors.destructive} />
        <Text style={{ marginTop: 12, fontFamily: "Inter_700Bold", fontSize: 18, color: colors.foreground }}>Check failed</Text>
        <Text style={{ marginTop: 6, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" }}>
          {result.error}
        </Text>
        <View style={{ height: 16, width: "100%" }} />
        <PrimaryButton title="Try again" onPress={() => setResult(null)} icon="refresh-ccw" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.steps}>
          {STEPS.map((s, idx) => {
            const n = idx + 1;
            const active = n === step;
            const done = n < step;
            const tint = done ? colors.success : active ? colors.primary : colors.mutedForeground;
            return (
              <View key={s.title} style={[styles.stepPill, { backgroundColor: tint + "18" }]}>
                <Feather name={done ? "check" : s.icon} size={12} color={tint} />
                <Text style={{ marginLeft: 6, fontFamily: "Inter_600SemiBold", color: tint, fontSize: 11 }}>
                  {s.title}
                </Text>
              </View>
            );
          })}
        </View>
        <View style={{ height: 4, backgroundColor: colors.muted, borderRadius: 2, overflow: "hidden", marginBottom: 18 }}>
          <LinearGradient
            colors={[colors.gradientStart, colors.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: "100%", width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </View>

        <Card>
          {step === 1 && (
            <>
              <Picker label="Your nationality" value={form.nationality} options={COUNTRIES} onChange={set("nationality")} placeholder="Search passport country" />
              <Picker label="Destination country" value={form.destinationCountry} options={COUNTRIES} onChange={set("destinationCountry")} placeholder="Where are you going?" />
              <Picker label="Visa type" value={form.visaType} options={VISA_TYPES} onChange={set("visaType")} placeholder="Select visa type" searchable={false} />
              <Picker label="Purpose of travel" value={form.purposeOfTravel} options={PURPOSES} onChange={set("purposeOfTravel")} searchable={false} />
              <Picker label="Trip duration" value={form.tripDuration} options={TRIP_DURATIONS} onChange={set("tripDuration")} searchable={false} />
            </>
          )}
          {step === 2 && (
            <>
              <Picker label="Employment status" value={form.employmentStatus} options={EMPLOYMENT_STATUSES} onChange={set("employmentStatus")} searchable={false} />
              <Picker label="Monthly income" value={form.monthlyIncome} options={INCOME_RANGES} onChange={set("monthlyIncome")} searchable={false} />
            </>
          )}
          {step === 3 && (
            <>
              <Picker label="Valid passport (6+ months)?" value={form.hasPassport} options={YES_NO} onChange={set("hasPassport")} searchable={false} />
              <Picker label="Recent bank statements?" value={form.hasBankStatement} options={YES_NO} onChange={set("hasBankStatement")} searchable={false} />
              <Field
                label="Past travel history"
                value={form.travelHistory}
                onChangeText={set("travelHistory")}
                placeholder="e.g. Visited 3 Schengen countries in 2023…"
                multiline
              />
            </>
          )}
        </Card>

        <View style={{ height: 18 }} />
        <View style={{ flexDirection: "row", gap: 12 }}>
          {step > 1 && (
            <View style={{ flex: 1 }}>
              <PrimaryButton title="Back" onPress={() => setStep(step - 1)} variant="ghost" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            {step < STEPS.length ? (
              <PrimaryButton title="Next" icon="arrow-right" onPress={() => setStep(step + 1)} disabled={!stepValid} />
            ) : (
              <PrimaryButton title={submitting ? "Analyzing…" : "Run check"} icon="zap" onPress={submit} loading={submitting} disabled={!stepValid} />
            )}
          </View>
        </View>

        {submitting && (
          <View style={{ alignItems: "center", marginTop: 18 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ marginTop: 8, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
              AI is analyzing your profile…
            </Text>
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: "row", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  stepPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  resultHero: { borderRadius: 22, padding: 26, alignItems: "center" },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  bulletText: { flex: 1, marginLeft: 8, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
