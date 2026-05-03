import { useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

import { Card, Field, Picker, PrimaryButton } from "@/components/UI";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { apiPost } from "@/lib/api";
import {
  COUNTRIES, PURPOSES, TRIP_DURATIONS, VISA_TYPES,
  EMPLOYMENT_STATUSES, INCOME_RANGES, BANK_BALANCE_RANGES, GENDERS,
} from "@/lib/data";
import { actionPlanToStrings, type CheckSubmitResponse, type VisaCheckResult } from "@/lib/types";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

type DeepResultState =
  | { ok: true; result: VisaCheckResult }
  | { ok: false; error: string }
  | null;

const YES_NO = ["Yes", "No"];
const YES_NO_MAYBE = ["Yes", "No", "Planning to get"];

interface DeepForm {
  fullName: string; nationality: string; countryOfResidence: string; dateOfBirth: string; gender: string;
  destinationCountry: string; visaType: string; purposeOfTravel: string; tripDuration: string; sponsoredTrip: string;
  employmentStatus: string; monthlyIncome: string; bankBalance: string;
  hasPassport: string; hasBankStatement: string; hasIncomeProof: string; hasTaxReturn: string;
  travelHistory: string; previousVisaRefusals: string; familyTies: string;
}

const EMPTY: DeepForm = {
  fullName: "", nationality: "", countryOfResidence: "", dateOfBirth: "", gender: "",
  destinationCountry: "", visaType: "", purposeOfTravel: "", tripDuration: "", sponsoredTrip: "",
  employmentStatus: "", monthlyIncome: "", bankBalance: "",
  hasPassport: "", hasBankStatement: "", hasIncomeProof: "", hasTaxReturn: "",
  travelHistory: "", previousVisaRefusals: "", familyTies: "",
};

const STEPS = [
  { title: "Personal", icon: "user" as const, fields: ["fullName", "nationality", "countryOfResidence", "dateOfBirth", "gender"] },
  { title: "Travel", icon: "map" as const, fields: ["destinationCountry", "visaType", "purposeOfTravel", "tripDuration", "sponsoredTrip"] },
  { title: "Finances", icon: "credit-card" as const, fields: ["employmentStatus", "monthlyIncome", "bankBalance"] },
  { title: "Documents", icon: "file-text" as const, fields: ["hasPassport", "hasBankStatement", "hasIncomeProof", "hasTaxReturn"] },
  { title: "History & ties", icon: "globe" as const, fields: ["travelHistory", "previousVisaRefusals", "familyTies"] },
];

export default function DeepCheck() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<DeepForm>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<DeepResultState>(null);

  const set = <K extends keyof DeepForm>(k: K) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const required = useMemo(() => {
    const fields = STEPS[step - 1].fields as (keyof DeepForm)[];
    return fields.every((f) => {
      if (f === "travelHistory" || f === "familyTies") return true;
      return !!form[f];
    });
  }, [form, step]);

  if (!user?.deepCheckAccess) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 22, padding: 24, alignItems: "center" }}
        >
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" }}>
            <Feather name="award" size={26} color="#fff" />
          </View>
          <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 22, marginTop: 14 }}>Deep Check is Pro</Text>
          <Text style={{ color: "rgba(255,255,255,0.9)", fontFamily: "Inter_400Regular", fontSize: 14, marginTop: 8, textAlign: "center" }}>
            Unlock comprehensive AI analysis, personalized action plans, and unlimited checks.
          </Text>
        </LinearGradient>

        <Card style={{ marginTop: 18 }}>
          {[
            { icon: "check-circle", text: "Full 7-section profile review" },
            { icon: "trending-up", text: "Probability score with breakdown" },
            { icon: "clipboard", text: "Step-by-step action plan" },
            { icon: "refresh-ccw", text: "Unlimited re-runs" },
          ].map((b) => (
            <View key={b.text} style={styles.bulletRow}>
              <Feather name={b.icon as keyof typeof Feather.glyphMap} size={18} color={colors.primary} />
              <Text style={[styles.bulletText, { color: colors.foreground }]}>{b.text}</Text>
            </View>
          ))}
        </Card>

        <View style={{ height: 18 }} />
        <PrimaryButton
          title="Upgrade on the web"
          icon="external-link"
          onPress={() => {
            const domain = process.env.EXPO_PUBLIC_DOMAIN;
            if (domain) {
              import("expo-linking").then((Linking) => Linking.openURL(`https://${domain}/payment/deep-check`));
            }
          }}
        />
        <View style={{ height: 12 }} />
        <PrimaryButton title="Run a free Basic Check instead" onPress={() => router.replace("/basic-check")} variant="ghost" />
      </ScrollView>
    );
  }

  async function submit() {
    setSubmitting(true);
    try {
      const res = await apiPost<CheckSubmitResponse>("/api/b2c/deep-check", {
        checkType: "deep",
        formData: form,
      });
      setResult({ ok: true, result: res.result ?? {} });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Check failed";
      setResult({ ok: false, error: msg });
    } finally {
      setSubmitting(false);
    }
  }

  if (result && result.ok) {
    const r = result.result;
    const score = r.approvalChance ?? 0;
    const grade = r.grade ?? (score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D");
    const planItems = actionPlanToStrings(r.actionPlan);
    const items: string[] = planItems.length > 0
      ? planItems
      : (r.nextSteps ?? r.recommendations ?? []);
    return (
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: 20 }}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientMid, colors.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.resultHero}
        >
          <Text style={{ color: "rgba(255,255,255,0.85)", fontFamily: "Inter_500Medium", fontSize: 13 }}>
            Deep Check score
          </Text>
          <Text style={{ color: "#fff", fontFamily: "Inter_700Bold", fontSize: 64, marginTop: 4 }}>{score}%</Text>
          <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 16, marginTop: 4 }}>
            Grade {grade} • {r.statusLabel || "Detailed"}
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

        {items.length > 0 && (
          <Card style={{ marginTop: 12 }}>
            <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 8 }}>Action plan</Text>
            {items.map((it, i) => (
              <View key={i} style={styles.bulletRow}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.primary + "18", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold", fontSize: 11 }}>{i + 1}</Text>
                </View>
                <Text style={[styles.bulletText, { color: colors.foreground }]}>{it}</Text>
              </View>
            ))}
          </Card>
        )}

        <View style={{ height: 16 }} />
        <PrimaryButton title="Run another check" icon="refresh-ccw" onPress={() => { setResult(null); setForm(EMPTY); setStep(1); }} />
        <View style={{ height: 12 }} />
        <PrimaryButton title="Back to home" onPress={() => router.replace("/(tabs)")} variant="ghost" />
      </ScrollView>
    );
  }

  if (result && !result.ok) {
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

  const cur = STEPS[step - 1];

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
          <Text style={{ fontFamily: "Inter_700Bold", color: colors.foreground, fontSize: 16, marginBottom: 14 }}>
            Step {step} of {STEPS.length} • {cur.title}
          </Text>
          {step === 1 && (
            <>
              <Field label="Full name" value={form.fullName} onChangeText={set("fullName")} placeholder="As per passport" />
              <Picker label="Nationality" value={form.nationality} options={COUNTRIES} onChange={set("nationality")} />
              <Picker label="Country of residence" value={form.countryOfResidence} options={COUNTRIES} onChange={set("countryOfResidence")} />
              <Field label="Date of birth" value={form.dateOfBirth} onChangeText={set("dateOfBirth")} placeholder="YYYY-MM-DD" />
              <Picker label="Gender" value={form.gender} options={GENDERS} onChange={set("gender")} searchable={false} />
            </>
          )}
          {step === 2 && (
            <>
              <Picker label="Destination country" value={form.destinationCountry} options={COUNTRIES} onChange={set("destinationCountry")} />
              <Picker label="Visa type" value={form.visaType} options={VISA_TYPES} onChange={set("visaType")} searchable={false} />
              <Picker label="Purpose of travel" value={form.purposeOfTravel} options={PURPOSES} onChange={set("purposeOfTravel")} searchable={false} />
              <Picker label="Trip duration" value={form.tripDuration} options={TRIP_DURATIONS} onChange={set("tripDuration")} searchable={false} />
              <Picker label="Trip sponsored?" value={form.sponsoredTrip} options={YES_NO} onChange={set("sponsoredTrip")} searchable={false} />
            </>
          )}
          {step === 3 && (
            <>
              <Picker label="Employment status" value={form.employmentStatus} options={EMPLOYMENT_STATUSES} onChange={set("employmentStatus")} searchable={false} />
              <Picker label="Monthly income" value={form.monthlyIncome} options={INCOME_RANGES} onChange={set("monthlyIncome")} searchable={false} />
              <Picker label="Bank balance" value={form.bankBalance} options={BANK_BALANCE_RANGES} onChange={set("bankBalance")} searchable={false} />
            </>
          )}
          {step === 4 && (
            <>
              <Picker label="Valid passport" value={form.hasPassport} options={YES_NO_MAYBE} onChange={set("hasPassport")} searchable={false} />
              <Picker label="Bank statements (6 mo)" value={form.hasBankStatement} options={YES_NO} onChange={set("hasBankStatement")} searchable={false} />
              <Picker label="Income proof / payslips" value={form.hasIncomeProof} options={YES_NO} onChange={set("hasIncomeProof")} searchable={false} />
              <Picker label="Tax returns" value={form.hasTaxReturn} options={YES_NO} onChange={set("hasTaxReturn")} searchable={false} />
            </>
          )}
          {step === 5 && (
            <>
              <Field label="Past travel history" value={form.travelHistory} onChangeText={set("travelHistory")} placeholder="Countries you've visited" multiline />
              <Picker label="Previous visa refusals?" value={form.previousVisaRefusals} options={YES_NO} onChange={set("previousVisaRefusals")} searchable={false} />
              <Field label="Family / home ties" value={form.familyTies} onChangeText={set("familyTies")} placeholder="Spouse, children, property, business" multiline />
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
              <PrimaryButton title="Next" icon="arrow-right" onPress={() => setStep(step + 1)} disabled={!required} />
            ) : (
              <PrimaryButton title={submitting ? "Analyzing…" : "Run deep check"} icon="award" onPress={submit} loading={submitting} disabled={!required} />
            )}
          </View>
        </View>

        {submitting && (
          <View style={{ alignItems: "center", marginTop: 18 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ marginTop: 8, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>
              Running deep AI analysis…
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
  bulletRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12, gap: 10 },
  bulletText: { flex: 1, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
