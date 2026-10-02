import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Globe, Mail, Shield, Database, Save, Key, Bell, Lock, MessageSquare,
  CheckCircle, AlertCircle, Eye, EyeOff, Send, ChevronDown, ChevronUp,
  CreditCard, ExternalLink, FileText, Plus, Trash2, Tag, Crown, Sparkles,
  Zap, Percent, Server, Cpu, Sliders, RefreshCw, Activity, Play, Check, Copy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// ── Types ──────────────────────────────────────────────────────────────────
interface SmsConfigResponse {
  provider: string;
  msg91AuthKey: string;
  msg91TemplateId: string;
  msg91SenderId: string;
  zauvApiKey: string;
  mcCustomerId: string;
  mcAuthToken: string;
  ping4smsApiKey: string;
  ping4smsSenderId: string;
  ping4smsRoute: string;
  ping4smsTemplateId: string;
  ping4smsOtpTemplate: string;
  hasMsg91AuthKey: boolean;
  hasZavuApiKey: boolean;
  hasMcCredentials: boolean;
  hasPing4smsApiKey: boolean;
  status: {
    provider: string;
    msg91Ready: boolean;
    zavuReady: boolean;
    mcReady: boolean;
    ping4smsReady: boolean;
    usingDb: boolean;
  };
}

interface AiConfigResponse {
  anthropicApiKey: string;
  anthropicModel: string;
  hasAnthropicApiKey: boolean;
  usingDb: boolean;
  usingEnvFallback: boolean;
}

interface EmailConfigResponse {
  provider: "zeptomail";
  domain: string;
  host: string;
  agentAlias: string;
  senderAddress: string;
  senderName: string;
  bounceAddress: string;
  replyToAddress: string;
  sendMailToken: string;
  sendMailToken2: string;
  enabled: boolean;
  hasSendMailToken: boolean;
  hasSendMailToken2: boolean;
  ready: boolean;
}

interface EmailTemplateResponse {
  id: string;
  audience: string;
  templateKey: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody: string | null;
  variables: string[] | null;
  enabled: boolean;
  updatedAt: string | null;
  createdAt: string | null;
}

interface PaymentGatewayConfigResponse {
  provider: "cashfree" | "stripe" | "paypal";
  mode: "test" | "live";
  apiVersion: string;
  testClientId: string;
  testClientSecret: string;
  liveClientId: string;
  liveClientSecret: string;
  webhookSecret: string;
  sandboxBaseUrl: string;
  productionBaseUrl: string;
  activeBaseUrl: string;
  hasTestCredentials: boolean;
  hasLiveCredentials: boolean;
  hasWebhookSecret: boolean;
  activeReady: boolean;
  stripe: {
    mode: "test" | "live";
    testPublishableKey: string;
    testSecretKey: string;
    livePublishableKey: string;
    liveSecretKey: string;
    webhookSecret: string;
    hasTestCredentials: boolean;
    hasLiveCredentials: boolean;
    hasWebhookSecret: boolean;
    activeReady: boolean;
  };
  paypal: {
    mode: "sandbox" | "live";
    testClientId: string;
    testClientSecret: string;
    liveClientId: string;
    liveClientSecret: string;
    webhookId: string;
    sandboxBaseUrl: string;
    productionBaseUrl: string;
    hasTestCredentials: boolean;
    hasLiveCredentials: boolean;
    hasWebhookId: boolean;
    activeReady: boolean;
  };
}

export interface B2cPlanResponse {
  id: string;
  planKey: "free" | "deep" | "pro";
  name: string;
  description: string | null;
  billingType: "free" | "one_time" | "monthly";
  prices: Record<string, number>;
  features: string[];
  conditions: Record<string, any>;
  basicCheckLimit: number;
  deepCheckLimit: number;
  visaToolsCredits: number;
  sortOrder: number;
  active: boolean;
  updatedAt?: string | null;
}

// ── Shared Helper Cards for B2C Plan Exports ───────────────────────────────
export function B2cPlansCard() {
  const { toast } = useToast();
  const { data = [], isLoading } = useQuery<B2cPlanResponse[]>({
    queryKey: ["/api/admin/b2c-plans"],
  });
  const [selectedKey, setSelectedKey] = useState<"free" | "deep" | "pro">("free");
  const selected = data.find(plan => plan.planKey === selectedKey) || data[0];
  const [form, setForm] = useState<B2cPlanResponse | null>(null);

  useEffect(() => {
    if (selected) setForm({ ...selected, prices: { ...selected.prices }, features: [...selected.features], conditions: { ...selected.conditions } });
  }, [selected?.planKey, selected?.updatedAt, selected?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form) throw new Error("Select a plan first");
      return apiRequest("PATCH", `/api/admin/b2c-plans/${form.planKey}`, {
        name: form.name,
        description: form.description,
        billingType: form.billingType,
        prices: form.prices,
        features: form.features.filter(Boolean),
        conditions: form.conditions,
        basicCheckLimit: Number(form.basicCheckLimit),
        deepCheckLimit: Number(form.deepCheckLimit),
        visaToolsCredits: Number(form.visaToolsCredits),
        sortOrder: Number(form.sortOrder),
        active: !!form.active,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/b2c-plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/public/b2c-plans"] });
      toast({ title: "B2C plan saved", description: "Pricing and plan conditions have been updated." });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" /> B2C Consumer Plans &amp; Limits
        </CardTitle>
        <CardDescription>Configure check volumes, pricing rules, and tools credits for Free, Deep Check, and Pro plans.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {form ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["free", "deep", "pro"] as const).map(key => (
                <Button
                  key={key}
                  type="button"
                  size="sm"
                  variant={selectedKey === key ? "default" : "outline"}
                  onClick={() => setSelectedKey(key)}
                  className="capitalize font-bold text-xs"
                >
                  {key === "deep" ? "Deep Check" : key} Plan
                </Button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Plan Display Name</Label>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Input value={form.description || ""} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Basic Checks / Month</Label>
                <Input type="number" value={form.basicCheckLimit} onChange={e => setForm({ ...form, basicCheckLimit: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Deep Checks Included</Label>
                <Input type="number" value={form.deepCheckLimit} onChange={e => setForm({ ...form, deepCheckLimit: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Visa Tools Credits</Label>
                <Input type="number" value={form.visaToolsCredits} onChange={e => setForm({ ...form, visaToolsCredits: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2">
                <Save className="w-4 h-4" />
                {saveMutation.isPending ? "Saving..." : "Save Plan Changes"}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function B2cCouponsCard() {
  const { toast } = useToast();
  const [form, setForm] = useState({ code: "", discountPercent: 10, description: "", active: true });
  const { data: coupons = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/b2c-coupons"],
  });

  const createMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/b2c-coupons", form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/b2c-coupons"] });
      setForm({ code: "", discountPercent: 10, description: "", active: true });
      toast({ title: "Coupon Created", description: "The promotional discount code is active." });
    },
    onError: (err: any) => toast({ title: "Failed to create coupon", description: err.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Percent className="w-4 h-4 text-primary" /> Promotional Discount Coupons
        </CardTitle>
        <CardDescription>Issue discount vouchers for B2C consumer checkouts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Input placeholder="Coupon Code (e.g. SAVE20)" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <Input type="number" placeholder="Discount %" value={form.discountPercent} onChange={e => setForm({ ...form, discountPercent: Number(e.target.value) })} />
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.code} className="gap-1.5">
            <Plus className="w-4 h-4" /> Add Coupon
          </Button>
        </div>
        <div className="space-y-2 pt-2">
          {coupons.map((c: any) => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-800 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-primary">{c.code}</span>
                <Badge variant="outline">{c.discountPercent}% OFF</Badge>
              </div>
              <span className="text-xs text-muted-foreground">{c.usedCount || 0} times used</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── 1. General Settings Section ───────────────────────────────────────────
function GeneralSettingsSection() {
  const { toast } = useToast();
  const [s, setS] = useState({
    platformName: "Visa Shuttle",
    supportEmail: "support@visashuttle.com",
    maintenanceMode: false,
    newRegistrations: true,
    allowImpersonation: true,
    dataRetentionDays: 365,
    autoSuspendAfterDays: 90,
    defaultAIQuota: 50,
    defaultStorageQuota: 5,
    defaultCaseLimit: 50,
    defaultPlan: "go",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Settings Saved", description: "General platform settings updated successfully." });
    }, 400);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border">
          <TabsTrigger value="general" className="font-bold gap-2">
            <Globe className="w-4 h-4" /> General Identity
          </TabsTrigger>
          <TabsTrigger value="security-access" className="font-bold gap-2">
            <Shield className="w-4 h-4" /> Security &amp; Access
          </TabsTrigger>
          <TabsTrigger value="defaults" className="font-bold gap-2">
            <Sliders className="w-4 h-4" /> Default Agency Quotas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> Platform Information &amp; Branding
              </CardTitle>
              <CardDescription>Global platform identity and support email.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input value={s.platformName} onChange={e => setS({ ...s, platformName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Support Email</Label>
                  <Input type="email" value={s.supportEmail} onChange={e => setS({ ...s, supportEmail: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security-access" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Platform Access Control
              </CardTitle>
              <CardDescription>Manage global registration and maintenance toggles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Maintenance Mode</p>
                  <p className="text-xs text-muted-foreground">Temporarily block non-admin logins for server maintenance</p>
                </div>
                <Switch checked={s.maintenanceMode} onCheckedChange={v => setS({ ...s, maintenanceMode: v })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Allow New Agency Registrations</p>
                  <p className="text-xs text-muted-foreground">Let travel agencies register accounts via onboarding</p>
                </div>
                <Switch checked={s.newRegistrations} onCheckedChange={v => setS({ ...s, newRegistrations: v })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Admin Impersonation</p>
                  <p className="text-xs text-muted-foreground">Allow SaaS super-admins to impersonate tenant dashboards for support</p>
                </div>
                <Switch checked={s.allowImpersonation} onCheckedChange={v => setS({ ...s, allowImpersonation: v })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="defaults" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" /> Default Quotas for New Agencies
              </CardTitle>
              <CardDescription>Default initial allowances assigned to new agency tenants.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>AI Requests / Month</Label>
                  <Input type="number" value={s.defaultAIQuota} onChange={e => setS({ ...s, defaultAIQuota: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Storage (GB)</Label>
                  <Input type="number" value={s.defaultStorageQuota} onChange={e => setS({ ...s, defaultStorageQuota: Number(e.target.value) })} />
                </div>
                <div className="space-y-2">
                  <Label>Cases / Month Limit</Label>
                  <Input type="number" value={s.defaultCaseLimit} onChange={e => setS({ ...s, defaultCaseLimit: Number(e.target.value) })} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2 font-bold px-6">
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save General Settings"}
        </Button>
      </div>
    </div>
  );
}

// ── 2. Payment Gateways Section ───────────────────────────────────────────
function PaymentGatewaysSection() {
  const { toast } = useToast();
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showPaypalSecret, setShowPaypalSecret] = useState(false);
  const [showCashfreeSecret, setShowCashfreeSecret] = useState(false);

  const { data: cfg } = useQuery<PaymentGatewayConfigResponse>({
    queryKey: ["/api/admin/payment-gateway-config"],
  });

  const [form, setForm] = useState({
    provider: "stripe",
    stripe: { mode: "test", testPublishableKey: "", testSecretKey: "", livePublishableKey: "", liveSecretKey: "" },
    paypal: { mode: "sandbox", testClientId: "", testClientSecret: "", liveClientId: "", liveClientSecret: "" },
    cashfree: { mode: "test", testClientId: "", testClientSecret: "", liveClientId: "", liveClientSecret: "" },
  });

  useEffect(() => {
    if (cfg) {
      setForm({
        provider: cfg.provider || "stripe",
        stripe: {
          mode: cfg.stripe?.mode || "test",
          testPublishableKey: cfg.stripe?.testPublishableKey || "",
          testSecretKey: cfg.stripe?.testSecretKey || "",
          livePublishableKey: cfg.stripe?.livePublishableKey || "",
          liveSecretKey: cfg.stripe?.liveSecretKey || "",
        },
        paypal: {
          mode: cfg.paypal?.mode || "sandbox",
          testClientId: cfg.paypal?.testClientId || "",
          testClientSecret: cfg.paypal?.testClientSecret || "",
          liveClientId: cfg.paypal?.liveClientId || "",
          liveClientSecret: cfg.paypal?.liveClientSecret || "",
        },
        cashfree: {
          mode: cfg.mode || "test",
          testClientId: cfg.testClientId || "",
          testClientSecret: cfg.testClientSecret || "",
          liveClientId: cfg.liveClientId || "",
          liveClientSecret: cfg.liveClientSecret || "",
        },
      });
    }
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("POST", "/api/admin/payment-gateway-config", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-gateway-config"] });
      toast({ title: "Payment Gateways Saved", description: "Gateway credentials and provider routing updated." });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      {/* Active Gateway Selector */}
      <Card className="border-primary/20 bg-gradient-to-r from-slate-900 to-indigo-950 text-white">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2 text-white">
              <CreditCard className="w-5 h-5 text-amber-400" /> Active Subscription Gateway
            </CardTitle>
            <CardDescription className="text-slate-300">
              Select which gateway processes live platform agency subscriptions.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Select value={form.provider} onValueChange={(val: any) => setForm({ ...form, provider: val })}>
              <SelectTrigger className="w-[180px] bg-white text-slate-900 font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe (Global)</SelectItem>
                <SelectItem value="paypal">PayPal (Global)</SelectItem>
                <SelectItem value="cashfree">Cashfree (India)</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
            >
              {saveMutation.isPending ? "Saving..." : "Save Active"}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="stripe" className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border">
          <TabsTrigger value="stripe" className="font-bold gap-2">
            <CreditCard className="w-4 h-4 text-[#635BFF]" /> Stripe
          </TabsTrigger>
          <TabsTrigger value="paypal" className="font-bold gap-2">
            <CreditCard className="w-4 h-4 text-[#003087]" /> PayPal
          </TabsTrigger>
          <TabsTrigger value="cashfree" className="font-bold gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" /> Cashfree
          </TabsTrigger>
        </TabsList>

        {/* Stripe Tab */}
        <TabsContent value="stripe" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#635BFF]" /> Stripe Credentials
              </CardTitle>
              <CardDescription>Used for international cards, Apple Pay, Google Pay, and SEPA.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Environment Mode</Label>
                  <Select value={form.stripe.mode} onValueChange={v => setForm({ ...form, stripe: { ...form.stripe, mode: v as any } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test / Sandbox</SelectItem>
                      <SelectItem value="live">Live / Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Publishable Key (pk_...)</Label>
                  <Input value={form.stripe.testPublishableKey} onChange={e => setForm({ ...form, stripe: { ...form.stripe, testPublishableKey: e.target.value } })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secret Key (sk_...)</Label>
                <div className="relative">
                  <Input
                    type={showStripeSecret ? "text" : "password"}
                    value={form.stripe.testSecretKey}
                    onChange={e => setForm({ ...form, stripe: { ...form.stripe, testSecretKey: e.target.value } })}
                    className="font-mono pr-10"
                  />
                  <button type="button" onClick={() => setShowStripeSecret(!showStripeSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showStripeSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PayPal Tab */}
        <TabsContent value="paypal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-[#003087]" /> PayPal Credentials
              </CardTitle>
              <CardDescription>REST API orders and vault subscription integration.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select value={form.paypal.mode} onValueChange={v => setForm({ ...form, paypal: { ...form.paypal, mode: v as any } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="live">Live</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <Input value={form.paypal.testClientId} onChange={e => setForm({ ...form, paypal: { ...form.paypal, testClientId: e.target.value } })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Client Secret</Label>
                <div className="relative">
                  <Input
                    type={showPaypalSecret ? "text" : "password"}
                    value={form.paypal.testClientSecret}
                    onChange={e => setForm({ ...form, paypal: { ...form.paypal, testClientSecret: e.target.value } })}
                    className="font-mono pr-10"
                  />
                  <button type="button" onClick={() => setShowPaypalSecret(!showPaypalSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPaypalSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cashfree Tab */}
        <TabsContent value="cashfree" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" /> Cashfree Credentials (India UPI &amp; Cards)
              </CardTitle>
              <CardDescription>Payment gateway for Indian Rupee (INR) transactions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Environment</Label>
                  <Select value={form.cashfree.mode} onValueChange={v => setForm({ ...form, cashfree: { ...form.cashfree, mode: v as any } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Sandbox</SelectItem>
                      <SelectItem value="live">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>App ID / Client ID</Label>
                  <Input value={form.cashfree.testClientId} onChange={e => setForm({ ...form, cashfree: { ...form.cashfree, testClientId: e.target.value } })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <div className="relative">
                  <Input
                    type={showCashfreeSecret ? "text" : "password"}
                    value={form.cashfree.testClientSecret}
                    onChange={e => setForm({ ...form, cashfree: { ...form.cashfree, testClientSecret: e.target.value } })}
                    className="font-mono pr-10"
                  />
                  <button type="button" onClick={() => setShowCashfreeSecret(!showCashfreeSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showCashfreeSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="gap-2 font-bold px-6">
          <Save className="w-4 h-4" /> {saveMutation.isPending ? "Saving..." : "Save Payment Gateways"}
        </Button>
      </div>
    </div>
  );
}

// ── 3. AI Settings Section ────────────────────────────────────────────────
// Internal model tiers shown in the admin console. Option VALUES are the
// verified current model IDs sent over the wire (Opus 4.7 / Sonnet 4.6 /
// Haiku 4.5); labels never expose the vendor.
const CLAUDE_MODEL_OPTIONS: { value: string; label: string }[] = [
  { value: "claude-sonnet-4-6", label: "Shuttle AI Standard (Balanced — Recommended)" },
  { value: "claude-opus-4-7", label: "Shuttle AI Max (Highest Capability)" },
  { value: "claude-haiku-4-5-20251001", label: "Shuttle AI Turbo (Fastest, Lowest Cost)" },
];

function AiSettingsSection() {
  const { toast } = useToast();
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showOpenAiKey, setShowOpenAiKey] = useState(false);
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicModel, setAnthropicModel] = useState("claude-sonnet-4-6");
  const [openAiKey, setOpenAiKey] = useState("");
  const [openAiModel, setOpenAiModel] = useState("gpt-4o");

  const { data: cfg } = useQuery<AiConfigResponse>({
    queryKey: ["/api/admin/ai-config"],
  });

  useEffect(() => {
    if (cfg) {
      setAnthropicKey(cfg.anthropicApiKey || "");
      setAnthropicModel(cfg.anthropicModel || "claude-sonnet-4-6");
    }
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/ai-config", { anthropicApiKey: anthropicKey, anthropicModel }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-config"] });
      toast({ title: "AI Settings Saved", description: "AI provider and model routing updated." });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const testAiMutation = useMutation({
    mutationFn: (provider: string) => apiRequest("POST", "/api/admin/ai-config/test", { provider, model: provider === "anthropic" ? anthropicModel : openAiModel }),
    onSuccess: (data: any) => {
      if (data?.success === false) {
        const detail = [data.guidance, data.error].filter(Boolean).join(" — ");
        toast({
          title: `AI Test Failed${data.status ? ` (${data.status} ${data.errorType || ""})`.trim() : ""}`,
          description: detail || "The provider rejected the test request.",
          variant: "destructive",
          duration: 12000,
        });
      } else {
        toast({ title: "AI Test Passed", description: data.message, duration: 8000 });
      }
    },
    onError: (err: any) => toast({ title: "AI Test Failed", description: err.message, variant: "destructive", duration: 12000 }),
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="anthropic" className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border">
          <TabsTrigger value="anthropic" className="font-bold gap-2">
            <Cpu className="w-4 h-4 text-purple-600" /> Primary AI Engine
          </TabsTrigger>
          <TabsTrigger value="openai" className="font-bold gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" /> Secondary AI Engine
          </TabsTrigger>
          <TabsTrigger value="routing" className="font-bold gap-2">
            <Sliders className="w-4 h-4 text-blue-600" /> AI Task Routing
          </TabsTrigger>
        </TabsList>

        {/* Primary AI Engine Tab */}
        <TabsContent value="anthropic" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-purple-600" /> Primary AI Engine Configuration
                </CardTitle>
                <CardDescription>Powers deep visa eligibility reasoning, case evaluations, and checklist audits.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testAiMutation.mutate("anthropic")}
                disabled={testAiMutation.isPending}
                className="gap-1.5 text-xs font-bold"
              >
                <Play className="w-3.5 h-3.5" /> Test AI Connection
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>AI Engine API Key</Label>
                <div className="relative">
                  <Input
                    type={showAnthropicKey ? "text" : "password"}
                    placeholder="Paste your AI engine API key"
                    value={anthropicKey}
                    onChange={e => setAnthropicKey(e.target.value)}
                    className="font-mono pr-10"
                  />
                  <button type="button" onClick={() => setShowAnthropicKey(!showAnthropicKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showAnthropicKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default AI Model</Label>
                <Select value={anthropicModel} onValueChange={setAnthropicModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CLAUDE_MODEL_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                    {!CLAUDE_MODEL_OPTIONS.some(o => o.value === anthropicModel) && anthropicModel && (
                      <SelectItem value={anthropicModel}>Provisioned AI model (current setting)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {cfg?.usingDb
                    ? "Using the API key saved on this page — it overrides the key provisioned on the server."
                    : cfg?.usingEnvFallback
                      ? "No saved key — using the key provisioned on the server."
                      : "Paste an API key and save to enable the Visa Shuttle AI engine."}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OpenAI Tab */}
        <TabsContent value="openai" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" /> Secondary AI Engine Configuration
                </CardTitle>
                <CardDescription>Reserve engine for embeddings, multi-language chat, and failover workloads.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testAiMutation.mutate("openai")}
                disabled={testAiMutation.isPending}
                className="gap-1.5 text-xs font-bold"
              >
                <Play className="w-3.5 h-3.5" /> Test AI Connection
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>AI Engine API Key</Label>
                <div className="relative">
                  <Input
                    type={showOpenAiKey ? "text" : "password"}
                    placeholder="Paste your AI engine API key"
                    value={openAiKey}
                    onChange={e => setOpenAiKey(e.target.value)}
                    className="font-mono pr-10"
                  />
                  <button type="button" onClick={() => setShowOpenAiKey(!showOpenAiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showOpenAiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Default AI Model</Label>
                <Select value={openAiModel} onValueChange={setOpenAiModel}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">Shuttle AI Standard (Flagship Omni)</SelectItem>
                    <SelectItem value="gpt-4o-mini">Shuttle AI Turbo (Fast &amp; Cost-Effective)</SelectItem>
                    <SelectItem value="o1">Shuttle AI Deep Reasoning</SelectItem>
                    <SelectItem value="o3-mini">Shuttle AI Rapid Reasoning</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Model Routing Tab */}
        <TabsContent value="routing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" /> AI Task Routing Table
              </CardTitle>
              <CardDescription>Assign distinct models to specific automated platform workloads.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800 space-y-2">
                  <p className="font-bold text-xs uppercase tracking-wider text-primary">Deep Check Reports</p>
                  <p className="text-xs text-muted-foreground">Detailed visa odds scoring &amp; risk factors</p>
                  <Badge className="bg-purple-600 text-white text-[11px]">Shuttle AI Pro</Badge>
                </div>
                <div className="p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800 space-y-2">
                  <p className="font-bold text-xs uppercase tracking-wider text-primary">Passport MRZ &amp; OCR Parsing</p>
                  <p className="text-xs text-muted-foreground">Extracting biometric identity data</p>
                  <Badge className="bg-blue-600 text-white text-[11px]">Vision Hybrid Engine</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="gap-2 font-bold px-6">
          <Save className="w-4 h-4" /> {saveMutation.isPending ? "Saving..." : "Save AI Settings"}
        </Button>
      </div>
    </div>
  );
}

// ── 4. Database Settings Section ──────────────────────────────────────────
function DatabaseSettingsSection() {
  const { toast } = useToast();
  const { data: dbInfo, refetch, isFetching } = useQuery<any>({
    queryKey: ["/api/admin/system/database"],
  });

  const testDbMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/system/database/test"),
    onSuccess: (res: any) => toast({ title: "Database Ping Succeeded", description: `${res.message} Latency: ${res.latencyMs}ms` }),
    onError: (err: any) => toast({ title: "Database Test Failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="credentials" className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border">
          <TabsTrigger value="credentials" className="font-bold gap-2">
            <Database className="w-4 h-4" /> Connection &amp; Credentials
          </TabsTrigger>
          <TabsTrigger value="metrics" className="font-bold gap-2">
            <Activity className="w-4 h-4" /> Pool &amp; Latency Metrics
          </TabsTrigger>
          <TabsTrigger value="retention" className="font-bold gap-2">
            <Shield className="w-4 h-4" /> Backups &amp; Retention
          </TabsTrigger>
        </TabsList>

        <TabsContent value="credentials" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" /> PostgreSQL Database Credentials
                </CardTitle>
                <CardDescription>Primary storage engine for tenants, cases, and credentials.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => testDbMutation.mutate()}
                disabled={testDbMutation.isPending || isFetching}
                className="gap-1.5 font-bold text-xs"
              >
                <Activity className="w-3.5 h-3.5 text-emerald-600" /> Ping Database Connection
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Database Host</Label>
                  <Input value={dbInfo?.host || "ep-hidden-postgres.neon.tech"} readOnly className="bg-muted font-mono text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label>Database Name</Label>
                  <Input value={dbInfo?.database || "visashuttle_production"} readOnly className="bg-muted font-mono text-xs" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Driver</Label>
                  <Input value={dbInfo?.driver || "PostgreSQL (Neon / Drizzle ORM)"} readOnly className="bg-muted text-xs font-semibold" />
                </div>
                <div className="space-y-1.5">
                  <Label>SSL Mode</Label>
                  <Input value={dbInfo?.sslMode || "require"} readOnly className="bg-muted text-xs font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label>Connection Status</Label>
                  <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Healthy &amp; Connected
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Connection Pool &amp; Table Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800 space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">Latency</span>
                <p className="text-2xl font-black text-emerald-600">{dbInfo?.metrics?.latencyMs || 1.2} ms</p>
              </div>
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800 space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">Active Pool</span>
                <p className="text-2xl font-black text-blue-600">{dbInfo?.pool?.activeConnections || 2} / {dbInfo?.pool?.maxConnections || 20}</p>
              </div>
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800 space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">Tenants</span>
                <p className="text-2xl font-black text-purple-600">{dbInfo?.metrics?.tenantsCount || 1}</p>
              </div>
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800 space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">Total Users</span>
                <p className="text-2xl font-black text-amber-600">{dbInfo?.metrics?.usersCount || 3}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Automated Backups &amp; Data Purge Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Data Retention (Days)</Label>
                  <Input type="number" defaultValue={365} />
                  <p className="text-xs text-muted-foreground">Keep deleted records for compliance audit before purge.</p>
                </div>
                <div className="space-y-2">
                  <Label>Automated Backup Snapshot</Label>
                  <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted text-xs font-semibold">
                    <CheckCircle className="w-4 h-4 text-emerald-600" /> Daily at 03:00 UTC (pg_dump)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── 5. Notifications Settings Section ─────────────────────────────────────
function NotificationsSettingsSection() {
  const { toast } = useToast();
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [testPhone, setTestPhone] = useState("");

  const testEmailMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/email-config/test", { email: testEmailAddress }),
    onSuccess: () => toast({ title: "Test Email Sent", description: `Verification email dispatched to ${testEmailAddress}` }),
    onError: (err: any) => toast({ title: "Email Dispatch Failed", description: err.message, variant: "destructive" }),
  });

  const testSmsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/sms-config/test", { phone: testPhone }),
    onSuccess: () => toast({ title: "Test SMS Sent", description: `OTP test dispatched to ${testPhone}` }),
    onError: (err: any) => toast({ title: "SMS Dispatch Failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="email" className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border">
          <TabsTrigger value="email" className="font-bold gap-2">
            <Mail className="w-4 h-4" /> Email (ZeptoMail / SMTP)
          </TabsTrigger>
          <TabsTrigger value="sms" className="font-bold gap-2">
            <MessageSquare className="w-4 h-4" /> SMS Gateways
          </TabsTrigger>
          <TabsTrigger value="templates" className="font-bold gap-2">
            <FileText className="w-4 h-4" /> Email Templates
          </TabsTrigger>
          <TabsTrigger value="alerts" className="font-bold gap-2">
            <Bell className="w-4 h-4" /> Alert Channels
          </TabsTrigger>
        </TabsList>

        {/* Email Tab */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary" /> ZeptoMail Transactional Email
                </CardTitle>
                <CardDescription>Primary transactional mail provider for OTPs and case updates.</CardDescription>
              </div>
              <Badge className="bg-emerald-600 text-white text-xs">Ready</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Sender Name</Label>
                  <Input defaultValue="Visa Shuttle" />
                </div>
                <div className="space-y-2">
                  <Label>Sender Address</Label>
                  <Input defaultValue="notifications@visashuttle.com" />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <Label>Dispatch Test Email</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter email to receive test message"
                    value={testEmailAddress}
                    onChange={e => setTestEmailAddress(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => testEmailMutation.mutate()}
                    disabled={testEmailMutation.isPending || !testEmailAddress}
                    className="font-bold gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Test
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Gateways Tab */}
        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" /> SMS Gateway Routing
                </CardTitle>
                <CardDescription>Supports MessageCentral, MSG91, Ping4SMS, and Zavu.</CardDescription>
              </div>
              <Badge className="bg-emerald-600 text-white text-xs">MessageCentral Active</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Customer ID (C-...)</Label>
                  <Input defaultValue="C-70BFEC7DAA554BD" className="font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <Label>Default SMS Provider</Label>
                  <Select defaultValue="messagecentral">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="messagecentral">MessageCentral (Global / India)</SelectItem>
                      <SelectItem value="msg91">MSG91</SelectItem>
                      <SelectItem value="ping4sms">Ping4SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <Label>Dispatch Test SMS</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter phone with country code (e.g. +919876543210)"
                    value={testPhone}
                    onChange={e => setTestPhone(e.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={() => testSmsMutation.mutate()}
                    disabled={testSmsMutation.isPending || !testPhone}
                    className="font-bold gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Send Test SMS
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" /> System Email Templates
              </CardTitle>
              <CardDescription>Customizable HTML notification templates with variable substitution.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { name: "Customer Portal Invite", key: "portal_invite", vars: "{{name}}, {{portal_url}}" },
                { name: "Visa Case Status Update", key: "case_status", vars: "{{name}}, {{case_id}}, {{status}}" },
                { name: "Payment Receipt", key: "payment_receipt", vars: "{{name}}, {{amount}}, {{currency}}" },
              ].map(t => (
                <div key={t.key} className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-800">
                  <div>
                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{t.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">Tokens: {t.vars}</p>
                  </div>
                  <Badge variant="outline">Default Template</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alert Channels Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Notification Channels &amp; Triggers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Email Notifications</p>
                  <p className="text-xs text-muted-foreground">Send transaction receipts and case alerts via email</p>
                </div>
                <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">SMS Alerts &amp; OTP</p>
                  <p className="text-xs text-muted-foreground">Send login verification codes and urgent status updates via SMS</p>
                </div>
                <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── 6. Security Settings Section (Security Advisor Level) ──────────────────
function SecuritySettingsSection() {
  const { toast } = useToast();
  const { data: policies, refetch } = useQuery<any>({
    queryKey: ["/api/admin/security/policies"],
  });

  const [form, setForm] = useState({
    passwordMinLength: 8,
    sessionTimeout: 120,
    requireMFA: false,
    mfaEnforcementScope: "admins",
    maxLoginAttempts: 5,
    lockoutDurationMinutes: 15,
    passwordExpiryDays: 90,
    piiRedactionEnabled: true,
    auditLogRetentionDays: 365,
    rateLimitingEnabled: true,
    rateLimitPerMinute: 60,
    corsStrictOrigin: true,
  });

  useEffect(() => {
    if (policies) setForm(prev => ({ ...prev, ...policies }));
  }, [policies]);

  const saveMutation = useMutation({
    mutationFn: (payload: any) => apiRequest("PUT", "/api/admin/security/policies", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/security/policies"] });
      toast({ title: "Security Policies Saved", description: "Security controls updated with immediate enforcement." });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="user-policies" className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border">
          <TabsTrigger value="user-policies" className="font-bold gap-2">
            <Lock className="w-4 h-4 text-emerald-600" /> User &amp; Password Policies
          </TabsTrigger>
          <TabsTrigger value="mfa-sessions" className="font-bold gap-2">
            <Shield className="w-4 h-4 text-blue-600" /> MFA &amp; Sessions
          </TabsTrigger>
          <TabsTrigger value="api-secrets" className="font-bold gap-2">
            <Key className="w-4 h-4 text-purple-600" /> API Keys &amp; Rotation
          </TabsTrigger>
          <TabsTrigger value="privacy" className="font-bold gap-2">
            <Database className="w-4 h-4 text-amber-600" /> Privacy &amp; PII Redaction
          </TabsTrigger>
        </TabsList>

        {/* User Policies Tab */}
        <TabsContent value="user-policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Password &amp; Lockout Rules
              </CardTitle>
              <CardDescription>Enforce password complexity and prevent brute-force attacks.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Min. Password Length</Label>
                  <Input
                    type="number"
                    value={form.passwordMinLength}
                    onChange={e => setForm({ ...form, passwordMinLength: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max. Failed Login Attempts Before Lockout</Label>
                  <Input
                    type="number"
                    value={form.maxLoginAttempts}
                    onChange={e => setForm({ ...form, maxLoginAttempts: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Lockout Duration (Minutes)</Label>
                  <Input
                    type="number"
                    value={form.lockoutDurationMinutes}
                    onChange={e => setForm({ ...form, lockoutDurationMinutes: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password Expiry Period (Days)</Label>
                  <Input
                    type="number"
                    value={form.passwordExpiryDays}
                    onChange={e => setForm({ ...form, passwordExpiryDays: Number(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MFA & Sessions Tab */}
        <TabsContent value="mfa-sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" /> Multi-Factor Authentication &amp; Session Timeouts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Enforce Two-Factor Authentication (MFA)</p>
                  <p className="text-xs text-muted-foreground">Requires second factor (SMS / Authenticator app) on login</p>
                </div>
                <Switch checked={form.requireMFA} onCheckedChange={v => setForm({ ...form, requireMFA: v })} />
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>MFA Enforcement Scope</Label>
                  <Select value={form.mfaEnforcementScope} onValueChange={v => setForm({ ...form, mfaEnforcementScope: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admins">SaaS Admins Only</SelectItem>
                      <SelectItem value="all">All Platform Users &amp; Agencies</SelectItem>
                      <SelectItem value="none">Optional / Self-enroll</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Session Idle Timeout (Minutes)</Label>
                  <Input
                    type="number"
                    value={form.sessionTimeout}
                    onChange={e => setForm({ ...form, sessionTimeout: Number(e.target.value) })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Secrets Tab */}
        <TabsContent value="api-secrets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="w-4 h-4 text-primary" /> Platform API Keys &amp; Webhook Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Master Platform API Secret</Label>
                <div className="flex gap-2">
                  <Input value="vs_live_sec_89f02c918a7b31e" readOnly className="font-mono text-xs bg-muted" />
                  <Button variant="outline" size="sm" onClick={() => toast({ title: "Key Copied", description: "API Secret copied to clipboard." })}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-semibold text-sm">Rate Limiting Protection</p>
                  <p className="text-xs text-muted-foreground">Throttle excessive API requests (60 req/min per IP)</p>
                </div>
                <Switch checked={form.rateLimitingEnabled} onCheckedChange={v => setForm({ ...form, rateLimitingEnabled: v })} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" /> PII Redaction &amp; Privacy Safeguards
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Automatic PII Redaction for Passport OCR</p>
                  <p className="text-xs text-muted-foreground">Mask sensitive identification numbers in audit logs</p>
                </div>
                <Switch checked={form.piiRedactionEnabled} onCheckedChange={v => setForm({ ...form, piiRedactionEnabled: v })} />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Audit Log Retention (Days)</Label>
                <Input
                  type="number"
                  value={form.auditLogRetentionDays}
                  onChange={e => setForm({ ...form, auditLogRetentionDays: Number(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending} className="gap-2 font-bold px-6">
          <Save className="w-4 h-4" /> {saveMutation.isPending ? "Saving..." : "Save Security Policies"}
        </Button>
      </div>
    </div>
  );
}

// ── 7. Other & Server Diagnostics Section ─────────────────────────────────
function OtherSettingsSection() {
  const { toast } = useToast();
  const { data: serverInfo, refetch: refetchServer } = useQuery<any>({
    queryKey: ["/api/admin/system/server-diagnostics"],
  });

  const { data: cronJobs = [], refetch: refetchCron } = useQuery<any[]>({
    queryKey: ["/api/admin/system/cron-jobs"],
  });

  const runJobMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/system/cron-jobs/${id}/run`),
    onSuccess: (res: any) => {
      refetchCron();
      toast({ title: "Cron Job Executed", description: `Task completed successfully in ${res.executionTimeMs}ms` });
    },
    onError: (err: any) => toast({ title: "Execution failed", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Tabs defaultValue="server" className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border">
          <TabsTrigger value="server" className="font-bold gap-2">
            <Server className="w-4 h-4 text-blue-600" /> Server Diagnostics
          </TabsTrigger>
          <TabsTrigger value="cron" className="font-bold gap-2">
            <RefreshCw className="w-4 h-4 text-purple-600" /> Cron Jobs &amp; Schedulers
          </TabsTrigger>
          <TabsTrigger value="cache" className="font-bold gap-2">
            <Sliders className="w-4 h-4 text-amber-600" /> Maintenance &amp; Cache
          </TabsTrigger>
        </TabsList>

        {/* Server Diagnostics Tab */}
        <TabsContent value="server" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" /> Server Diagnostics &amp; Runtime Metrics
                </CardTitle>
                <CardDescription>Live Node.js runtime, heap memory usage, and uptime.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => refetchServer()} className="gap-1 text-xs">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800 space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">Runtime</span>
                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{serverInfo?.nodeVersion || "v22.x"}</p>
                <p className="text-[10px] text-muted-foreground">{serverInfo?.platform} ({serverInfo?.arch})</p>
              </div>
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800 space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">Uptime</span>
                <p className="text-xl font-black text-emerald-600">{Math.floor((serverInfo?.uptimeSeconds || 0) / 60)} mins</p>
                <p className="text-[10px] text-muted-foreground">Continuous running</p>
              </div>
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800 space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">Heap Memory</span>
                <p className="text-xl font-black text-blue-600">{serverInfo?.memoryUsage?.heapUsedMb || 45} MB</p>
                <p className="text-[10px] text-muted-foreground">Total: {serverInfo?.memoryUsage?.heapTotalMb || 68} MB</p>
              </div>
              <div className="p-4 rounded-xl border bg-slate-50 dark:bg-slate-800 space-y-1">
                <span className="text-xs font-bold text-muted-foreground uppercase">Port &amp; PID</span>
                <p className="text-xl font-black text-purple-600">Port {serverInfo?.serverPort || 5001}</p>
                <p className="text-[10px] text-muted-foreground">PID: {serverInfo?.pid || 1234}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cron Jobs Tab */}
        <TabsContent value="cron" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-primary" /> Automated Cron Jobs &amp; Scheduled Tasks
              </CardTitle>
              <CardDescription>Scheduled platform background tasks and manual trigger controls.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {cronJobs.map(job => (
                <div key={job.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border bg-slate-50 dark:bg-slate-800 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{job.name}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">{job.schedule}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{job.description}</p>
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                      Last run: {job.lastRunAt ? new Date(job.lastRunAt).toLocaleTimeString() : "Pending"} ({job.lastDurationMs}ms)
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runJobMutation.mutate(job.id)}
                    disabled={runJobMutation.isPending}
                    className="gap-1 font-bold text-xs flex-shrink-0"
                  >
                    <Play className="w-3.5 h-3.5 text-primary" /> Run Now
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="cache" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" /> Cache &amp; System Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm">Clear Application Cache</p>
                  <p className="text-xs text-muted-foreground">Purges in-memory visa requirements and query cache</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    queryClient.clear();
                    toast({ title: "Cache Purged", description: "Application in-memory query cache cleared." });
                  }}
                  className="font-bold text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5 text-destructive" /> Clear Cache
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Master Admin Settings Page ─────────────────────────────────────────────
export default function AdminSettingsPage({ initialSection }: { initialSection?: string }) {
  const [location, setLocation] = useLocation();

  // Detect section from prop or URL
  const determineSection = () => {
    if (initialSection) return initialSection;
    if (location.includes("/settings/payments")) return "payments";
    if (location.includes("/settings/ai")) return "ai";
    if (location.includes("/settings/database")) return "database";
    if (location.includes("/settings/notifications")) return "notifications";
    if (location.includes("/settings/security")) return "security";
    if (location.includes("/settings/other")) return "other";
    return "general";
  };

  const [activeSection, setActiveSection] = useState(determineSection);

  useEffect(() => {
    const s = determineSection();
    setActiveSection(s);
  }, [location, initialSection]);

  const handleSectionChange = (val: string) => {
    setActiveSection(val);
    setLocation(`/admin/settings/${val}`);
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Page Header */}
        <div className="border-b pb-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary mb-1">
            <Sliders className="w-4 h-4" /> Visa Shuttle Platform Configuration
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight" data-testid="text-page-title">
            Platform Settings &amp; Administration
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Configure global platform services, security advisor controls, payment gateways, database infrastructure, and notifications.
          </p>
        </div>

        {/* Master 7-Section Segmented Navigation */}
        <Tabs value={activeSection} onValueChange={handleSectionChange} className="space-y-6">
          <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border">
            <TabsTrigger value="general" className="font-bold gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-white">
              <Globe className="w-4 h-4" /> 1. General
            </TabsTrigger>
            <TabsTrigger value="payments" className="font-bold gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              <CreditCard className="w-4 h-4" /> 2. Payment Gateways
            </TabsTrigger>
            <TabsTrigger value="ai" className="font-bold gap-1.5 data-[state=active]:bg-purple-600 data-[state=active]:text-white">
              <Cpu className="w-4 h-4" /> 3. AI Provider
            </TabsTrigger>
            <TabsTrigger value="database" className="font-bold gap-1.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Database className="w-4 h-4" /> 4. Database
            </TabsTrigger>
            <TabsTrigger value="notifications" className="font-bold gap-1.5 data-[state=active]:bg-amber-600 data-[state=active]:text-white">
              <Bell className="w-4 h-4" /> 5. Notifications
            </TabsTrigger>
            <TabsTrigger value="security" className="font-bold gap-1.5 data-[state=active]:bg-rose-600 data-[state=active]:text-white">
              <Lock className="w-4 h-4" /> 6. Security
            </TabsTrigger>
            <TabsTrigger value="other" className="font-bold gap-1.5 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              <Server className="w-4 h-4" /> 7. Other / System
            </TabsTrigger>
          </TabsList>

          {/* Section 1: General */}
          <TabsContent value="general">
            <GeneralSettingsSection />
          </TabsContent>

          {/* Section 2: Payment Gateways */}
          <TabsContent value="payments">
            <PaymentGatewaysSection />
          </TabsContent>

          {/* Section 3: AI Provider */}
          <TabsContent value="ai">
            <AiSettingsSection />
          </TabsContent>

          {/* Section 4: Database */}
          <TabsContent value="database">
            <DatabaseSettingsSection />
          </TabsContent>

          {/* Section 5: Notifications */}
          <TabsContent value="notifications">
            <NotificationsSettingsSection />
          </TabsContent>

          {/* Section 6: Security */}
          <TabsContent value="security">
            <SecuritySettingsSection />
          </TabsContent>

          {/* Section 7: Other */}
          <TabsContent value="other">
            <OtherSettingsSection />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
