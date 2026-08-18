import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Shield, Sparkles, Save, Crown, Percent, RefreshCw, CheckCircle, AlertCircle, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Import existing B2cPlansCard and B2cCouponsCard from settings page
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
      toast({ title: "B2C Pricing Saved", description: "Visa Protection Plan & B2C prices updated live." });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message || "Failed to save pricing", variant: "destructive" }),
  });

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Navigation Sub-Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-1">
              <Shield className="w-4 h-4 text-emerald-600" /> Platform Pricing Management
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">B2C Pricing &amp; Visa Protection</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Configure Deep Check prices, Visa Protection Plan add-on rules, official visa fee estimates, and discount coupons.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/pricing/b2b">
              <Button variant="outline" size="sm" className="gap-1.5">
                Switch to B2B SaaS Pricing <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* 1. Visa Protection Plan Control Center Card */}
        <Card className="border-emerald-500/30 shadow-md">
          <CardHeader className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white rounded-t-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  Visa Protection Plan (100% Visa Fee Refund Guarantee)
                </CardTitle>
                <CardDescription className="text-emerald-100/80">
                  Applicants with Deep Check score &ge; {form.visaProtectionMinScore}% can add Visa Protection to get 100% visa fee refund if rejected.
                </CardDescription>
              </div>
              <Button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || isLoading}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold gap-2 flex-shrink-0"
              >
                {saveMutation.isPending ? <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save Protection Settings
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Protection Fee % (Calculated on Official Embassy Visa Fee)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={form.visaProtectionFeePercent}
                    onChange={e => setForm(f => ({ ...f, visaProtectionFeePercent: Number(e.target.value) || 0 }))}
                    className="font-mono font-extrabold text-lg pr-8 text-emerald-600 dark:text-emerald-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Default 20%. For example, if Schengen official visa fee is $98 (€90), applicant pays 20% = $19.60 for full refund coverage.
                </p>
              </div>

              <div className="space-y-1.5 p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                <Label className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Min. Deep Check Score Qualification Threshold (%)
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={form.visaProtectionMinScore}
                    onChange={e => setForm(f => ({ ...f, visaProtectionMinScore: Number(e.target.value) || 0 }))}
                    className="font-mono font-extrabold text-lg pr-8 text-emerald-600 dark:text-emerald-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Default 80%. Only applicants scoring at or above this AI Deep Check score qualify to purchase protection.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Official Embassy Visa Fees (Base USD per Country / Destination)
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.keys(form.officialVisaFees).map(country => (
                  <div key={country} className="p-3.5 rounded-xl border bg-background space-y-1">
                    <span className="text-xs font-semibold block truncate text-slate-700 dark:text-slate-300">{country}</span>
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

        {/* 2. B2C Deep Check Multi-Currency Matrix */}
        <Card className="border-[#4055FF]/20 shadow-md">
          <CardHeader className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-t-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2 text-white">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  B2C Deep Check Base Prices (Multi-Currency)
                </CardTitle>
                <CardDescription className="text-slate-300">
                  Set prices for standalone Deep Check reports across all 5 active currencies.
                </CardDescription>
              </div>
              <Button
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || isLoading}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-2 flex-shrink-0"
              >
                {saveMutation.isPending ? <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                Save Prices
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
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
                    className="font-mono font-extrabold text-base"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 3. B2C Plan Conditions & Coupons */}
        <B2cPlansCard />
        <B2cCouponsCard />
      </div>
    </DashboardLayout>
  );
}
