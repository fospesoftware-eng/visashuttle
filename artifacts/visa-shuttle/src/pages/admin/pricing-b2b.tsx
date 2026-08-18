import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Zap, Key, Save, ArrowLeft, Database, Building2, Shield, Check, Sparkles, Layers
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AdminB2bPricingPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    b2bPlans: {
      starter: { USD: 49, GBP: 39, EUR: 45, INR: 3999, AED: 180 },
      growth: { USD: 149, GBP: 119, EUR: 139, INR: 11999, AED: 549 },
      enterprise: { USD: 499, GBP: 399, EUR: 459, INR: 39999, AED: 1830 },
    },
    b2bAnnualDiscountPercent: 20,
    extraSeatMonthlyUsd: 15,
    apiPlatformPricing: {
      deepCheckApiPriceUsd: 1.99,
      visaRequirementsApiPriceUsd: 0.25,
      passportScanApiPriceUsd: 0.50,
    },
    defaultQuotas: {
      defaultAIQuota: 50,
      defaultStorageQuota: 5,
      defaultCaseLimit: 50,
    }
  });

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/admin/saas-pricing-settings"],
  });

  useEffect(() => {
    if (data) {
      setForm(prev => ({
        ...prev,
        ...data,
        b2bPlans: {
          starter: { ...prev.b2bPlans.starter, ...(data.b2bPlans?.starter || {}) },
          growth: { ...prev.b2bPlans.growth, ...(data.b2bPlans?.growth || {}) },
          enterprise: { ...prev.b2bPlans.enterprise, ...(data.b2bPlans?.enterprise || {}) },
        },
        apiPlatformPricing: { ...prev.apiPlatformPricing, ...(data.apiPlatformPricing || {}) },
      }));
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("PUT", "/api/admin/saas-pricing-settings", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/saas-pricing-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/saas-pricing-settings"] });
      toast({ title: "B2B SaaS Pricing Saved", description: "Agency plan fees and API platform pricing updated live." });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message || "Failed to save B2B pricing", variant: "destructive" }),
  });

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Navigation Sub-Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">
              <Zap className="w-4 h-4 text-purple-600" /> Agency SaaS &amp; API Control
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">B2B SaaS Agency &amp; API Platform Pricing</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage multi-currency monthly/annual rates for Starter, Growth, &amp; Enterprise travel agency tiers, plus pay-per-call API fees.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/pricing/b2c">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to B2C Pricing &amp; Protection
              </Button>
            </Link>
          </div>
        </div>

        {/* 1. B2B SaaS Agency Subscription Plans Matrix */}
        <Card className="border-purple-500/30 shadow-md">
          <CardHeader className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white rounded-t-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Building2 className="w-5 h-5 text-purple-400" />
                  Agency SaaS Plan Prices (Monthly per Currency)
                </CardTitle>
                <CardDescription className="text-purple-200/80">
                  Set prices for travel agencies subscribing to Visa Shuttle platform tools across all supported currencies.
                </CardDescription>
              </div>
              <Button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || isLoading}
                className="bg-purple-500 hover:bg-purple-600 text-slate-950 font-bold gap-2 flex-shrink-0"
              >
                {saveMutation.isPending ? <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save Agency Rates
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {(["starter", "growth", "enterprise"] as const).map(planKey => (
              <div key={planKey} className="p-4.5 rounded-xl border bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold uppercase text-xs tracking-wider text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> {planKey} Plan
                  </span>
                  <Badge variant="outline" className="text-[10px] uppercase border-purple-300 text-purple-600">
                    {planKey === "starter" ? "Base Tier" : planKey === "growth" ? "Popular" : "Full Suite"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {(["USD", "INR", "GBP", "EUR", "AED"] as const).map(curr => (
                    <div key={curr} className="space-y-1">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">{curr} Monthly Price</span>
                      <Input
                        type="number"
                        value={form.b2bPlans[planKey][curr]}
                        onChange={e => setForm(f => ({
                          ...f,
                          b2bPlans: {
                            ...f.b2bPlans,
                            [planKey]: { ...f.b2bPlans[planKey], [curr]: Number(e.target.value) || 0 }
                          }
                        }))}
                        className="font-mono font-extrabold text-base"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 2. B2B API Platform Per-Call Pricing */}
        <Card className="border-blue-500/30 shadow-md">
          <CardHeader className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-t-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Key className="w-5 h-5 text-blue-400" />
                  B2B API Platform Usage Pricing (USD per API Call)
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Agencies and external travel developers calling Visa Shuttle APIs are charged per call based on these rates.
                </CardDescription>
              </div>
              <Button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending}
                className="bg-blue-500 hover:bg-blue-600 text-slate-950 font-bold gap-2 flex-shrink-0"
              >
                {saveMutation.isPending ? <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save API Rates
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border bg-background space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Deep Check AI API ($/call)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.apiPlatformPricing.deepCheckApiPriceUsd}
                    onChange={e => setForm(f => ({
                      ...f,
                      apiPlatformPricing: { ...f.apiPlatformPricing, deepCheckApiPriceUsd: Number(e.target.value) || 0 }
                    }))}
                    className="font-mono font-bold text-base pl-7"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Full AI visa approval score, risk audit, and embassy checklist generation.</p>
              </div>

              <div className="p-4 rounded-xl border bg-background space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Visa Requirements API ($/call)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.apiPlatformPricing.visaRequirementsApiPriceUsd}
                    onChange={e => setForm(f => ({
                      ...f,
                      apiPlatformPricing: { ...f.apiPlatformPricing, visaRequirementsApiPriceUsd: Number(e.target.value) || 0 }
                    }))}
                    className="font-mono font-bold text-base pl-7"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Real-time embassy rules, passport validity, and visa exemption queries.</p>
              </div>

              <div className="p-4 rounded-xl border bg-background space-y-2">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Passport OCR Scan API ($/call)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.apiPlatformPricing.passportScanApiPriceUsd}
                    onChange={e => setForm(f => ({
                      ...f,
                      apiPlatformPricing: { ...f.apiPlatformPricing, passportScanApiPriceUsd: Number(e.target.value) || 0 }
                    }))}
                    className="font-mono font-bold text-base pl-7"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Automated MRZ passport parsing &amp; identity document verification.</p>
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending}
                size="lg"
                className="bg-[#4055FF] hover:bg-[#3044EE] text-white font-bold gap-2 px-8"
              >
                {saveMutation.isPending ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                Save All B2B Pricing
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
