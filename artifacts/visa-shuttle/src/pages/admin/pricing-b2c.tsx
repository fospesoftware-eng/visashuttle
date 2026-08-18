import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Shield, Sparkles, Save, Crown, Percent, CheckCircle, AlertCircle, ArrowRight, DollarSign, Ticket, Layers, HelpCircle
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

export default function AdminB2cPricingPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    deepCheckBasePrices: { USD: 15, GBP: 11, EUR: 12, INR: 1000, AED: 55 },
    visaProtectionFeePercent: 20,
    visaProtectionMinScore: 80,
    officialVisaFees: {
      "United States": 185,
      "Schengen Area": 98,
      "United Kingdom": 148,
      "Canada": 75,
      "Australia": 125,
    },
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

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/saas-pricing-settings"],
  });

  useEffect(() => {
    if (data) {
      setForm(prev => ({
        ...prev,
        ...data,
        deepCheckBasePrices: { ...prev.deepCheckBasePrices, ...(data.deepCheckBasePrices || {}) },
        officialVisaFees: { ...prev.officialVisaFees, ...(data.officialVisaFees || {}) },
      }));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("PUT", "/api/admin/saas-pricing-settings", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/saas-pricing-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/saas-pricing-settings"] });
      toast({ title: "B2C Settings Saved", description: "All pricing and Visa Protection parameters have been updated live." });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message || "Failed to save pricing", variant: "destructive" }),
  });

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
              Manage website checkout prices, multi-currency conversion rates, Visa Protection Plan refund rules, and promo coupons.
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
              {form.visaProtectionFeePercent}% Fee &rarr; 100% Refund
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Cost is {form.visaProtectionFeePercent}% of embassy fee. Requires Deep Check score &ge; {form.visaProtectionMinScore}%.
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
              <Shield className="w-4 h-4" /> Visa Protection Plan Settings
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

          {/* ── TAB 1: Visa Protection Plan Settings ──────────────────────── */}
          <TabsContent value="visa-protection" className="space-y-6">
            <Card className="border-emerald-500/30 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white rounded-t-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2 text-white">
                      <Shield className="w-5 h-5 text-emerald-400" />
                      Visa Protection Plan (Refund Add-On)
                    </CardTitle>
                    <CardDescription className="text-emerald-100/80">
                      If an applicant score is &ge; {form.visaProtectionMinScore}%, they can purchase protection. If rejected by embassy, visa fees are 100% refunded.
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
                {/* 1. Key Protection Rules */}
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <Label className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Protection Add-On Cost (% of Official Embassy Visa Fee)
                    </Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={form.visaProtectionFeePercent}
                        onChange={e => setForm(f => ({ ...f, visaProtectionFeePercent: Number(e.target.value) || 0 }))}
                        className="font-mono font-extrabold text-lg text-emerald-600 dark:text-emerald-400 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Example: If US visa fee is $185, applicant pays 20% ($37) for protection.
                    </p>
                  </div>

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
                      Protection is only offered to low-risk applicants scoring at or above this score.
                    </p>
                  </div>
                </div>

                {/* 2. Official Embassy Visa Fee Matrix */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Official Embassy Visa Fees (Base USD per Country / Destination)</h4>
                      <p className="text-xs text-muted-foreground">Used to calculate exact protection plan cost (20% of official fee).</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.keys(form.officialVisaFees).map(country => (
                      <div key={country} className="p-3.5 rounded-xl border bg-background space-y-1.5">
                        <span className="text-xs font-bold block truncate text-slate-700 dark:text-slate-300">{country}</span>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                          <Input
                            type="number"
                            value={form.officialVisaFees[country as keyof typeof form.officialVisaFees]}
                            onChange={e => setForm(f => ({
                              ...f,
                              officialVisaFees: { ...f.officialVisaFees, [country]: Number(e.target.value) || 0 }
                            }))}
                            className="font-mono pl-6 font-bold text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
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
