import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Shield, Sparkles, Save, Percent, ArrowRight, Ticket, Layers, Plus, Trash2, Landmark
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { B2cPlansCard, B2cCouponsCard } from "@/pages/admin/settings";

interface PremiumBand {
  min: number;
  max: number;
  percent: number;
}

const DEFAULT_BANDS: PremiumBand[] = [
  { min: 70, max: 79.99, percent: 22 },
  { min: 80, max: 89.99, percent: 18 },
  { min: 90, max: 94.99, percent: 14 },
  { min: 95, max: 100, percent: 10 },
];

const DEFAULT_RISK: Record<string, number> = {
  "United States": 1.35,
  "Schengen Area": 1.25,
  "United Kingdom": 1.15,
  "Australia": 1.05,
  "Canada": 1.0,
  "New Zealand": 0.95,
  "Ireland": 0.95,
  "United Arab Emirates": 0.85,
};

const DEFAULT_FX: Record<string, number> = {
  INR: 1,
  USD: 84,
  EUR: 92,
  GBP: 105,
  CAD: 62,
  AUD: 57,
  NZD: 52,
  AED: 23,
};

function bandLabel(band: PremiumBand): string {
  const min = Math.floor(band.min);
  const max = band.max >= 100 ? 100 : Math.floor(band.max);
  return `${min}\u2013${max}%`;
}

export default function AdminB2cPricingPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    deepCheckBasePrices: { USD: 15, GBP: 11, EUR: 12, INR: 1000, AED: 55 },
    visaProtectionMinScore: 70,
    visaProtectionMinProtectedFeeInr: 5000,
    visaProtectionPremiumBands: DEFAULT_BANDS as PremiumBand[],
    visaProtectionDestinationRisk: { ...DEFAULT_RISK } as Record<string, number>,
    visaFeeEngineFx: { ...DEFAULT_FX } as Record<string, number>,
    b2bPlans: {
      starter: { USD: 49, GBP: 39, EUR: 45, INR: 3999, AED: 180 },
      growth: { USD: 149, GBP: 119, EUR: 139, INR: 11999, AED: 549 },
      enterprise: { USD: 499, GBP: 399, EUR: 459, INR: 39999, AED: 1830 },
    },
    apiPlatformPricing: {
      deepCheckApiPriceUsd: 1.99,
      visaRequirementsApiPriceUsd: 0.25,
      passportScanApiPriceUsd: 0.50,
    },
  });
  const [newRiskEntry, setNewRiskEntry] = useState({ country: "", factor: 1 });
  const [newFxEntry, setNewFxEntry] = useState({ currency: "", rate: 84 });

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/saas-pricing-settings"],
  });

  useEffect(() => {
    if (data) {
      setForm(prev => ({
        ...prev,
        ...data,
        deepCheckBasePrices: { ...prev.deepCheckBasePrices, ...(data.deepCheckBasePrices || {}) },
        visaProtectionMinScore: Number(data.visaProtectionMinScore ?? prev.visaProtectionMinScore),
        visaProtectionMinProtectedFeeInr: Number(data.visaProtectionMinProtectedFeeInr ?? prev.visaProtectionMinProtectedFeeInr),
        visaProtectionPremiumBands: Array.isArray(data.visaProtectionPremiumBands) && data.visaProtectionPremiumBands.length
          ? data.visaProtectionPremiumBands
          : prev.visaProtectionPremiumBands,
        visaProtectionDestinationRisk: { ...prev.visaProtectionDestinationRisk, ...(data.visaProtectionDestinationRisk || {}) },
        visaFeeEngineFx: { ...prev.visaFeeEngineFx, ...(data.visaFeeEngineFx || {}) },
      }));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("PUT", "/api/admin/saas-pricing-settings", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/saas-pricing-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/saas-pricing-settings"] });
      toast({ title: "B2C Settings Saved", description: "All pricing, fee-engine and Visa Protection parameters have been updated live." });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message || "Failed to save pricing", variant: "destructive" }),
  });

  const updateBand = (index: number, patch: Partial<PremiumBand>) => {
    setForm(f => ({
      ...f,
      visaProtectionPremiumBands: f.visaProtectionPremiumBands.map((b, i) => (i === index ? { ...b, ...patch } : b)),
    }));
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Page Sub-Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-600 mb-1">
              <Shield className="w-4 h-4 text-emerald-600" /> B2C Consumer Pricing &amp; Protection
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">B2C Pricing Control Center</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage website checkout prices, the Visa Fee Engine (fees, FX, risk), Visa Protection Plan premium bands, and promo coupons.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/pricing/b2b">
              <Button variant="outline" size="sm" className="gap-1.5 font-semibold">
                Go to B2B SaaS Pricing <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Simple 3-Column Explanatory Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Shield className="w-4 h-4" /> 1. Visa Protection
              </span>
              <Badge className="bg-emerald-600 text-white text-[10px]">Active</Badge>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Score &ge; {form.visaProtectionMinScore}% &rarr; 100% Fee Refund
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Premium = score band % × destination risk. Min protected fee ₹{form.visaProtectionMinProtectedFeeInr.toLocaleString("en-IN")}.
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> 2. Deep Check Report
              </span>
              <Badge className="bg-blue-600 text-white text-[10px]">${form.deepCheckBasePrices.USD} USD</Badge>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Multi-Currency Rates
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              $15 USD / ₹1,000 / £11 / €12 / AED 55 per report.
            </p>
          </div>

          <div className="p-4 rounded-xl border bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                <Ticket className="w-4 h-4" /> 3. Coupons &amp; Plans
              </span>
              <Badge className="bg-purple-600 text-white text-[10px]">Discounts</Badge>
            </div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Promotions &amp; Subscriptions
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Configure promo discount codes &amp; user plan limits.
            </p>
          </div>
        </div>

        {/* Clean Tabbed Navigation for B2C Sections */}
        <Tabs defaultValue="visa-protection" className="space-y-6">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border">
            <TabsTrigger value="visa-protection" className="gap-2 font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <Shield className="w-4 h-4" /> Visa Protection &amp; Fee Engine
            </TabsTrigger>
            <TabsTrigger value="deep-check-prices" className="gap-2 font-bold data-[state=active]:bg-[#4055FF] data-[state=active]:text-white">
              <Sparkles className="w-4 h-4" /> Deep Check &amp; Currencies
            </TabsTrigger>
            <TabsTrigger value="b2c-plans" className="gap-2 font-bold data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Layers className="w-4 h-4" /> B2C Plans &amp; Quotas
            </TabsTrigger>
            <TabsTrigger value="coupons" className="gap-2 font-bold data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Ticket className="w-4 h-4" /> Promo Coupons
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Visa Protection Plan & Fee Engine ───────────────────── */}
          <TabsContent value="visa-protection" className="space-y-6">
            <Card className="border-emerald-500/30 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white rounded-t-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-white">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      Visa Protection Plan &amp; Visa Fee Engine
                    </CardTitle>
                    <CardDescription className="text-emerald-100/80">
                      Deep Check is the gateway: score &ge; {form.visaProtectionMinScore}% and protected government charges &ge; ₹{form.visaProtectionMinProtectedFeeInr.toLocaleString("en-IN")} unlock protection. Refused applications get a 100% refund of protected charges.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => saveMutation.mutate(form)}
                    disabled={saveMutation.isPending || isLoading}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold gap-2 flex-shrink-0"
                  >
                    {saveMutation.isPending ? <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Protection Settings
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                {/* 1. Eligibility Thresholds */}
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <Label className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Min. Deep Check Score Qualification Threshold (%)
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={form.visaProtectionMinScore}
                        onChange={e => setForm(f => ({ ...f, visaProtectionMinScore: Number(e.target.value) || 0 }))}
                        className="font-mono font-extrabold text-lg text-emerald-600 dark:text-emerald-400 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Customers below this AI score cannot purchase Visa Protection at all.
                    </p>
                  </div>

                  <div className="space-y-2 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <Label className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Min. Protected Government Charges (₹ INR)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">₹</span>
                      <Input
                        type="number"
                        value={form.visaProtectionMinProtectedFeeInr}
                        onChange={e => setForm(f => ({ ...f, visaProtectionMinProtectedFeeInr: Number(e.target.value) || 0 }))}
                        className="font-mono font-extrabold text-lg text-emerald-600 dark:text-emerald-400 pl-7"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Checked against protected charges (visa fee + biometric + mandatory levies), not just the headline fee. Below this, protection is unavailable.
                    </p>
                  </div>
                </div>

                {/* 2. Premium Score Bands */}
                <div className="space-y-3 pt-2">
                  <div className="border-b pb-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Premium Score Bands (% of Protected Charges)</h4>
                    <p className="text-xs text-muted-foreground">Base premium % applied to the protected government charges for each Deep Check score range. Final premium = band % × destination risk factor (clamped 5–40%).</p>
                  </div>

                  <div className="overflow-hidden rounded-xl border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-left">
                          <th className="px-4 py-2.5 text-xs font-bold uppercase text-slate-500">Score Range</th>
                          <th className="px-4 py-2.5 text-xs font-bold uppercase text-slate-500">Min %</th>
                          <th className="px-4 py-2.5 text-xs font-bold uppercase text-slate-500">Max %</th>
                          <th className="px-4 py-2.5 text-xs font-bold uppercase text-slate-500">Premium %</th>
                          <th className="px-4 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {form.visaProtectionPremiumBands.map((band, i) => (
                          <tr key={i}>
                            <td className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{bandLabel(band)}</td>
                            <td className="px-4 py-2.5">
                              <Input type="number" step="0.01" value={band.min} onChange={e => updateBand(i, { min: Number(e.target.value) || 0 })} className="font-mono w-24 h-8" />
                            </td>
                            <td className="px-4 py-2.5">
                              <Input type="number" step="0.01" value={band.max} onChange={e => updateBand(i, { max: Number(e.target.value) || 0 })} className="font-mono w-24 h-8" />
                            </td>
                            <td className="px-4 py-2.5">
                              <div className="relative w-24">
                                <Input type="number" value={band.percent} onChange={e => updateBand(i, { percent: Number(e.target.value) || 0 })} className="font-mono font-extrabold w-24 h-8 pr-6 text-emerald-600 dark:text-emerald-400" />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xs">%</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 w-8 p-0"
                                onClick={() => setForm(f => ({ ...f, visaProtectionPremiumBands: f.visaProtectionPremiumBands.filter((_, idx) => idx !== i) }))}
                                disabled={form.visaProtectionPremiumBands.length <= 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 font-semibold"
                    onClick={() => setForm(f => {
                      const last = f.visaProtectionPremiumBands[f.visaProtectionPremiumBands.length - 1];
                      const min = last ? Math.min(last.max >= 100 ? 100 : last.max + 0.01, 100) : 70;
                      return { ...f, visaProtectionPremiumBands: [...f.visaProtectionPremiumBands, { min, max: 100, percent: 10 }] };
                    })}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Band
                  </Button>
                </div>

                {/* 3. Destination Risk Factors */}
                <div className="space-y-3 pt-2">
                  <div className="border-b pb-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Destination Risk Factors (AI Approval Difficulty)</h4>
                    <p className="text-xs text-muted-foreground">Multiplies the band premium. Higher factor = harder destination (e.g. US 1.35) = higher premium. Factor 1.0 = neutral.</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(form.visaProtectionDestinationRisk).map(([country, factor]) => (
                      <div key={country} className="p-3.5 rounded-xl border bg-background space-y-1.5 relative">
                        <span className="text-xs font-bold block truncate pr-6 text-slate-700 dark:text-slate-300">{country}</span>
                        <Input
                          type="number"
                          step="0.05"
                          min="0.5"
                          max="3"
                          value={factor}
                          onChange={e => setForm(f => ({
                            ...f,
                            visaProtectionDestinationRisk: { ...f.visaProtectionDestinationRisk, [country]: Number(e.target.value) || 1 }
                          }))}
                          className="font-mono font-bold text-sm h-8"
                        />
                        <button
                          className="absolute right-2 top-2 text-slate-300 hover:text-red-500 transition"
                          onClick={() => setForm(f => {
                            const next = { ...f.visaProtectionDestinationRisk };
                            delete next[country];
                            return { ...f, visaProtectionDestinationRisk: next };
                          })}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <Input
                      placeholder="Country name"
                      value={newRiskEntry.country}
                      onChange={e => setNewRiskEntry(v => ({ ...v, country: e.target.value }))}
                      className="sm:max-w-[220px]"
                    />
                    <Input
                      type="number"
                      step="0.05"
                      min="0.5"
                      max="3"
                      placeholder="Risk factor"
                      value={newRiskEntry.factor}
                      onChange={e => setNewRiskEntry(v => ({ ...v, factor: Number(e.target.value) || 1 }))}
                      className="sm:max-w-[120px] font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 font-semibold"
                      disabled={!newRiskEntry.country.trim()}
                      onClick={() => {
                        if (!newRiskEntry.country.trim()) return;
                        setForm(f => ({ ...f, visaProtectionDestinationRisk: { ...f.visaProtectionDestinationRisk, [newRiskEntry.country.trim()]: newRiskEntry.factor } }));
                        setNewRiskEntry({ country: "", factor: 1 });
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Destination
                    </Button>
                  </div>
                </div>

                {/* 4. FX Rates → INR */}
                <div className="space-y-3 pt-2">
                  <div className="border-b pb-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-emerald-600" /> Exchange Rates (1 unit → INR)
                    </h4>
                    <p className="text-xs text-muted-foreground">Converts official foreign-currency government fees to INR for the ₹{form.visaProtectionMinProtectedFeeInr.toLocaleString("en-IN")} minimum check and premium calculation. Keep these aligned with your configured exchange-rate source.</p>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(form.visaFeeEngineFx).map(([currency, rate]) => (
                      <div key={currency} className="p-3.5 rounded-xl border bg-background space-y-1.5 relative">
                        <span className="text-xs font-bold block pr-6 text-slate-700 dark:text-slate-300">{currency}</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={rate}
                          onChange={e => setForm(f => ({
                            ...f,
                            visaFeeEngineFx: { ...f.visaFeeEngineFx, [currency]: Number(e.target.value) || 0 }
                          }))}
                          className="font-mono font-bold text-sm h-8"
                        />
                        {currency !== "INR" && (
                          <button
                            className="absolute right-2 top-2 text-slate-300 hover:text-red-500 transition"
                            onClick={() => setForm(f => {
                              const next = { ...f.visaFeeEngineFx };
                              delete next[currency];
                              return { ...f, visaFeeEngineFx: next };
                            })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <Input
                      placeholder="Currency code (e.g. CHF)"
                      value={newFxEntry.currency}
                      onChange={e => setNewFxEntry(v => ({ ...v, currency: e.target.value.toUpperCase().slice(0, 3) }))}
                      className="sm:max-w-[220px] font-mono"
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="INR rate"
                      value={newFxEntry.rate}
                      onChange={e => setNewFxEntry(v => ({ ...v, rate: Number(e.target.value) || 0 }))}
                      className="sm:max-w-[120px] font-mono"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 font-semibold"
                      disabled={newFxEntry.currency.length !== 3 || newFxEntry.rate <= 0}
                      onClick={() => {
                        if (newFxEntry.currency.length !== 3 || newFxEntry.rate <= 0) return;
                        setForm(f => ({ ...f, visaFeeEngineFx: { ...f.visaFeeEngineFx, [newFxEntry.currency]: newFxEntry.rate } }));
                        setNewFxEntry({ currency: "", rate: 84 });
                      }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Currency
                    </Button>
                  </div>
                </div>

                {/* 5. Refund Policy Note */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border text-xs text-muted-foreground space-y-1">
                  <p className="font-bold text-foreground flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-emerald-600" /> Fixed Refund Policy (non-editable)
                  </p>
                  <p>Visa REFUSED → 100% refund of protected government charges (visa fee + biometric + mandatory levies). Deep Check fee and Visa Protection premium are never refunded.</p>
                  <p>Official fee records (country × nationality × visa type, biometric, levies, effective dates, sources) are maintained in the Visa Fee Engine core module (<code className="font-mono">api-server/src/visa-fee-engine.ts</code>) with per-record verification dates.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 2: Deep Check & Multi-Currency Rates ───────────────────── */}
          <TabsContent value="deep-check-prices" className="space-y-6">
            <Card className="border-[#4055FF]/20 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-t-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-white">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                      Deep Check Report Prices (All 5 Currencies)
                    </CardTitle>
                    <CardDescription className="text-slate-300">
                      Set standalone checkout prices for single Deep Check reports when users switch currencies.
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => saveMutation.mutate(form)}
                    disabled={saveMutation.isPending || isLoading}
                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold gap-2 flex-shrink-0"
                  >
                    {saveMutation.isPending ? <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Prices
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {(["USD", "INR", "GBP", "EUR", "AED"] as const).map(curr => (
                    <div key={curr} className="space-y-1.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                      <Label className="text-xs font-bold uppercase text-slate-500">{curr} Deep Check Price</Label>
                      <Input
                        type="number"
                        value={form.deepCheckBasePrices[curr]}
                        onChange={e => setForm(f => ({
                          ...f,
                          deepCheckBasePrices: { ...f.deepCheckBasePrices, [curr]: Number(e.target.value) || 0 }
                        }))}
                        className="font-mono font-extrabold text-base text-[#4055FF] dark:text-blue-400"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 3: B2C Plans & Quotas ──────────────────────────────────── */}
          <TabsContent value="b2c-plans" className="space-y-6">
            <B2cPlansCard />
          </TabsContent>

          {/* ── TAB 4: Promo Coupons ───────────────────────────────────────── */}
          <TabsContent value="coupons" className="space-y-6">
            <B2cCouponsCard />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
