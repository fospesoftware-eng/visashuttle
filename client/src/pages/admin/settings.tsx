import { useState, useEffect } from "react";
import { Globe, Mail, Shield, Database, Save, Key, Bell, Lock, MessageSquare, CheckCircle, AlertCircle, Eye, EyeOff, Send, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// ── SMS Config Types ───────────────────────────────────────────────────────
interface SmsConfigResponse {
  provider: string;
  msg91AuthKey: string;
  msg91TemplateId: string;
  msg91SenderId: string;
  zauvApiKey: string;
  mcCustomerId: string;
  mcPassword: string;
  hasMsg91AuthKey: boolean;
  hasZavuApiKey: boolean;
  hasMcCredentials: boolean;
  status: {
    provider: string;
    msg91Ready: boolean;
    zavuReady: boolean;
    mcReady: boolean;
    usingDb: boolean;
  };
}

// ── SMS Gateway Card ────────────────────────────────────────────────────────
function SmsGatewayCard() {
  const { toast } = useToast();
  const [provider, setProvider] = useState("msg91");
  const [showMsg91Key, setShowMsg91Key] = useState(false);
  const [showZavuKey, setShowZavuKey] = useState(false);
  const [showMcPassword, setShowMcPassword] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [showZavu, setShowZavu] = useState(false);
  const [showMc, setShowMc] = useState(false);
  const [form, setForm] = useState({
    msg91AuthKey: "",
    msg91TemplateId: "",
    msg91SenderId: "",
    zauvApiKey: "",
    mcCustomerId: "",
    mcPassword: "",
  });

  const { data: cfg, isLoading } = useQuery<SmsConfigResponse>({
    queryKey: ["/api/admin/sms-config"],
  });

  useEffect(() => {
    if (cfg) {
      setProvider(cfg.provider);
      setForm({
        msg91AuthKey: cfg.msg91AuthKey || "",
        msg91TemplateId: cfg.msg91TemplateId || "",
        msg91SenderId: cfg.msg91SenderId || "",
        zauvApiKey: cfg.zauvApiKey || "",
        mcCustomerId: cfg.mcCustomerId || "",
        mcPassword: cfg.mcPassword || "",
      });
    }
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/admin/sms-config", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sms-config"] });
      toast({ title: "SMS settings saved", description: "Gateway credentials have been updated." });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message || "Something went wrong", variant: "destructive" });
    },
  });

  const testMutation = useMutation({
    mutationFn: (phone: string) => apiRequest("POST", "/api/admin/sms-config/test", { phone }),
    onSuccess: (data: any) => {
      toast({ title: "Test OTP sent!", description: data.message || `OTP sent to ${testPhone}` });
    },
    onError: (err: any) => {
      toast({ title: "Test failed", description: err.message || "Could not send test OTP", variant: "destructive" });
    },
  });

  function handleSave() {
    saveMutation.mutate({ provider, ...form });
  }

  function handleTest() {
    if (!testPhone.trim()) {
      toast({ title: "Phone required", description: "Enter a phone number to send a test OTP", variant: "destructive" });
      return;
    }
    testMutation.mutate(testPhone.trim());
  }

  const isMsg91Ready = cfg?.status?.msg91Ready;
  const isZavuReady = cfg?.status?.zavuReady;
  const isMcReady = cfg?.status?.mcReady;
  const activeProvider = cfg?.status?.provider ?? "msg91";

  function getProviderLabel(p: string) {
    if (p === "msg91") return isMsg91Ready ? "MSG91 Active" : "MSG91 Not Configured";
    if (p === "zavu") return isZavuReady ? "Zavu Active" : "Zavu Not Configured";
    if (p === "messagecentral") return isMcReady ? "MessageCentral Active" : "MessageCentral Not Configured";
    return p;
  }
  function isActiveProviderReady() {
    if (activeProvider === "msg91") return isMsg91Ready;
    if (activeProvider === "zavu") return isZavuReady;
    if (activeProvider === "messagecentral") return isMcReady;
    return false;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              SMS Gateway
            </CardTitle>
            <CardDescription>Configure the SMS provider used for OTP verification during B2C registration</CardDescription>
          </div>
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-muted border-t-foreground rounded-full animate-spin" />
          ) : (
            <Badge
              variant={isActiveProviderReady() ? "default" : "secondary"}
              className={isActiveProviderReady() ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}
            >
              {getProviderLabel(activeProvider)}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Active Provider Selector */}
        <div className="space-y-2">
          <Label>Active Provider</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="w-[240px]" data-testid="select-sms-provider">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="msg91">
                <div className="flex items-center gap-2">
                  MSG91
                  {isMsg91Ready && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                </div>
              </SelectItem>
              <SelectItem value="zavu">
                <div className="flex items-center gap-2">
                  Zavu
                  {isZavuReady && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                </div>
              </SelectItem>
              <SelectItem value="messagecentral">
                <div className="flex items-center gap-2">
                  MessageCentral
                  {isMcReady && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">MSG91 is the recommended default provider</p>
        </div>

        <Separator />

        {/* ── MSG91 Section ─────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 flex-1">
              <span className="font-medium text-sm">MSG91 Credentials</span>
              {provider === "msg91" && (
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 dark:text-blue-400">Default</Badge>
              )}
            </div>
            {isMsg91Ready
              ? <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              : <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
          </div>

          <div className="space-y-3 pl-0">
            <div className="space-y-1.5">
              <Label htmlFor="msg91AuthKey">
                Auth Key <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="msg91AuthKey"
                  type={showMsg91Key ? "text" : "password"}
                  placeholder={cfg?.hasMsg91AuthKey ? "Key saved — enter new value to update" : "Paste your MSG91 Auth Key"}
                  value={form.msg91AuthKey}
                  onChange={e => setForm(f => ({ ...f, msg91AuthKey: e.target.value }))}
                  className="pr-10 font-mono text-sm"
                  data-testid="input-msg91-auth-key"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowMsg91Key(s => !s)}
                >
                  {showMsg91Key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Found in your{" "}
                <a href="https://control.msg91.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  MSG91 dashboard
                </a>{" "}
                under API → Auth Key
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="msg91TemplateId">
                  OTP Template ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="msg91TemplateId"
                  placeholder="e.g. 64f1a2b3c4d5e6f7a8b9c0d1"
                  value={form.msg91TemplateId}
                  onChange={e => setForm(f => ({ ...f, msg91TemplateId: e.target.value }))}
                  className="font-mono text-sm"
                  data-testid="input-msg91-template-id"
                />
                <p className="text-xs text-muted-foreground">Create an OTP template in MSG91 → SMS → Templates</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="msg91SenderId">Sender ID <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                <Input
                  id="msg91SenderId"
                  placeholder="e.g. VSHUTT"
                  value={form.msg91SenderId}
                  onChange={e => setForm(f => ({ ...f, msg91SenderId: e.target.value }))}
                  className="font-mono text-sm"
                  data-testid="input-msg91-sender-id"
                />
                <p className="text-xs text-muted-foreground">6-char alphanumeric sender ID approved in MSG91</p>
              </div>
            </div>

            {!isMsg91Ready && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  MSG91 Auth Key and Template ID are required to send OTPs. Enter both values and save.
                </p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* ── Zavu Section (collapsible) ────────────── */}
        <div className="space-y-3">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium w-full text-left group"
            onClick={() => setShowZavu(s => !s)}
          >
            <span className="flex-1 flex items-center gap-2">
              Zavu Credentials
              {provider === "zavu" && (
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 dark:text-blue-400">Active</Badge>
              )}
              {isZavuReady && <CheckCircle className="w-4 h-4 text-green-500" />}
            </span>
            {showZavu ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showZavu && (
            <div className="space-y-1.5 pl-0">
              <Label htmlFor="zauvApiKey">API Key</Label>
              <div className="relative">
                <Input
                  id="zauvApiKey"
                  type={showZavuKey ? "text" : "password"}
                  placeholder={cfg?.hasZavuApiKey ? "Key saved — enter new value to update" : "Paste your Zavu API Key"}
                  value={form.zauvApiKey}
                  onChange={e => setForm(f => ({ ...f, zauvApiKey: e.target.value }))}
                  className="pr-10 font-mono text-sm"
                  data-testid="input-zavu-api-key"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowZavuKey(s => !s)}
                >
                  {showZavuKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Your Zavu API key from api.zavu.dev</p>
            </div>
          )}
        </div>

        <Separator />

        {/* ── MessageCentral Section (collapsible) ─── */}
        <div className="space-y-3">
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium w-full text-left group"
            onClick={() => setShowMc(s => !s)}
            data-testid="button-toggle-mc"
          >
            <span className="flex-1 flex items-center gap-2">
              MessageCentral Credentials
              {provider === "messagecentral" && (
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 dark:text-blue-400">Active</Badge>
              )}
              {isMcReady && <CheckCircle className="w-4 h-4 text-green-500" />}
            </span>
            {showMc ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showMc && (
            <div className="space-y-3 pl-0">
              <div className="space-y-1.5">
                <Label htmlFor="mcCustomerId">
                  Customer ID <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mcCustomerId"
                  placeholder="e.g. C-A1B2C3D4E5F6"
                  value={form.mcCustomerId}
                  onChange={e => setForm(f => ({ ...f, mcCustomerId: e.target.value }))}
                  className="font-mono text-sm"
                  data-testid="input-mc-customer-id"
                />
                <p className="text-xs text-muted-foreground">
                  Your Customer ID from the{" "}
                  <a href="https://www.messagecentral.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                    MessageCentral dashboard
                  </a>
                  {" "}(starts with C-)
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mcPassword">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="mcPassword"
                    type={showMcPassword ? "text" : "password"}
                    placeholder={cfg?.hasMcCredentials ? "Password saved — enter new value to update" : "Your MessageCentral account password"}
                    value={form.mcPassword}
                    onChange={e => setForm(f => ({ ...f, mcPassword: e.target.value }))}
                    className="pr-10 font-mono text-sm"
                    data-testid="input-mc-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowMcPassword(s => !s)}
                  >
                    {showMcPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Used to generate an auth token for each OTP request (base64-encoded automatically)
                </p>
              </div>

              {!isMcReady && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Customer ID and Password are required to use MessageCentral. Enter both and save.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* ── Test & Save ──────────────────────────── */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="testPhone">Test OTP Delivery</Label>
            <div className="flex gap-2">
              <Input
                id="testPhone"
                type="tel"
                placeholder="+44 7911 123456 (with country code)"
                value={testPhone}
                onChange={e => setTestPhone(e.target.value)}
                className="flex-1"
                data-testid="input-test-phone"
              />
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={testMutation.isPending}
                className="gap-2 flex-shrink-0"
                data-testid="button-test-sms"
              >
                {testMutation.isPending
                  ? <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  : <Send className="w-4 h-4" />}
                Send Test
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Save your credentials first, then send a test OTP to verify the setup</p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="gap-2"
            data-testid="button-save-sms-config"
          >
            {saveMutation.isPending
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <Save className="w-4 h-4" />}
            Save SMS Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    platformName: "Visa Shuttle",
    supportEmail: "support@visashuttle.com",
    maintenanceMode: false,
    newRegistrations: true,
    emailNotifications: true,
    smsNotifications: false,
    defaultAIQuota: 5000,
    defaultStorageQuota: 10,
    defaultCaseLimit: 500,
    defaultPlan: "starter",
    sessionTimeout: 60,
    passwordMinLength: 8,
    requireMFA: false,
    allowImpersonation: true,
    dataRetentionDays: 365,
    autoSuspendAfterDays: 90,
  });

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setSaving(false);
    toast({ title: "Settings saved", description: "Platform configuration has been updated." });
  };

  const s = settings;
  const set = (k: string, v: any) => setSettings(prev => ({ ...prev, [k]: v }));

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Platform Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure global platform settings that apply to all agencies and users.</p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
            <TabsTrigger value="limits" data-testid="tab-limits">Defaults</TabsTrigger>
            <TabsTrigger value="integrations" data-testid="tab-integrations">Integrations</TabsTrigger>
            <TabsTrigger value="notifications">Alerts</TabsTrigger>
          </TabsList>

          {/* General */}
          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4" />Platform Information</CardTitle>
                <CardDescription>Basic platform identity and branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="platformName">Platform Name</Label>
                    <Input id="platformName" value={s.platformName} onChange={e => set("platformName", e.target.value)} data-testid="input-platform-name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input id="supportEmail" type="email" value={s.supportEmail} onChange={e => set("supportEmail", e.target.value)} data-testid="input-support-email" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4" />Platform Access</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-sm text-muted-foreground">Disable access for all users except admins</p>
                  </div>
                  <Switch checked={s.maintenanceMode} onCheckedChange={v => set("maintenanceMode", v)} data-testid="switch-maintenance" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Allow New Agency Registrations</p>
                    <p className="text-sm text-muted-foreground">Let travel agencies sign up for an account</p>
                  </div>
                  <Switch checked={s.newRegistrations} onCheckedChange={v => set("newRegistrations", v)} data-testid="switch-new-registrations" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Admin Impersonation</p>
                    <p className="text-sm text-muted-foreground">Allow admins to impersonate agency accounts for support</p>
                  </div>
                  <Switch checked={s.allowImpersonation} onCheckedChange={v => set("allowImpersonation", v)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4" />Data Retention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Data Retention (days)</Label>
                    <Input type="number" value={s.dataRetentionDays} onChange={e => set("dataRetentionDays", parseInt(e.target.value))} />
                    <p className="text-xs text-muted-foreground">How long to keep deleted records</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Auto-suspend Inactive After (days)</Label>
                    <Input type="number" value={s.autoSuspendAfterDays} onChange={e => set("autoSuspendAfterDays", parseInt(e.target.value))} />
                    <p className="text-xs text-muted-foreground">0 = never auto-suspend</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button className="gap-2" onClick={handleSave} disabled={saving} data-testid="button-save">
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save General Settings"}
            </Button>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4" />Authentication</CardTitle>
                <CardDescription>Password and session security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Min Password Length</Label>
                    <Input type="number" value={s.passwordMinLength} onChange={e => set("passwordMinLength", parseInt(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Session Timeout (minutes)</Label>
                    <Input type="number" value={s.sessionTimeout} onChange={e => set("sessionTimeout", parseInt(e.target.value))} />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Require MFA for Admins</p>
                    <p className="text-sm text-muted-foreground">Enforce two-factor authentication for admin accounts</p>
                  </div>
                  <Switch checked={s.requireMFA} onCheckedChange={v => set("requireMFA", v)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Key className="w-4 h-4" />API Keys</CardTitle>
                <CardDescription>Platform-level API credentials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Anthropic API Key", hint: "Used for AI visa assessment checks" },
                  { label: "SendGrid API Key", hint: "Used for email delivery" },
                  { label: "Stripe Secret Key", hint: "Used for subscription billing" },
                ].map(k => (
                  <div key={k.label} className="space-y-1.5">
                    <Label>{k.label}</Label>
                    <Input type="password" placeholder="••••••••••••••••••••••" readOnly className="bg-muted/50 font-mono" />
                    <p className="text-xs text-muted-foreground">{k.hint} · Managed via environment secrets</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Button className="gap-2" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Security Settings"}
            </Button>
          </TabsContent>

          {/* Default Limits */}
          <TabsContent value="limits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Database className="w-4 h-4" />Default Quotas for New Agencies</CardTitle>
                <CardDescription>These values apply when a new agency is created unless overridden</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="aiQuota">AI Requests / Month</Label>
                    <Input id="aiQuota" type="number" value={s.defaultAIQuota} onChange={e => set("defaultAIQuota", parseInt(e.target.value))} data-testid="input-ai-quota" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storageQuota">Storage (GB)</Label>
                    <Input id="storageQuota" type="number" value={s.defaultStorageQuota} onChange={e => set("defaultStorageQuota", parseInt(e.target.value))} data-testid="input-storage-quota" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cases / Month</Label>
                    <Input type="number" value={s.defaultCaseLimit} onChange={e => set("defaultCaseLimit", parseInt(e.target.value))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Default Plan for New Agencies</Label>
                  <Select value={s.defaultPlan} onValueChange={v => set("defaultPlan", v)}>
                    <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Button className="gap-2" onClick={handleSave} disabled={saving} data-testid="button-save">
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Default Settings"}
            </Button>
          </TabsContent>

          {/* ── Integrations Tab ──────────────────────────────────────────── */}
          <TabsContent value="integrations" className="space-y-4">
            <SmsGatewayCard />
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" />Alert Channels</CardTitle>
                <CardDescription>Configure how the platform sends notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Send system emails to tenants and users</p>
                  </div>
                  <Switch checked={s.emailNotifications} onCheckedChange={v => set("emailNotifications", v)} data-testid="switch-email-notifications" />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">SMS Notifications</p>
                    <p className="text-sm text-muted-foreground">Send OTP and alerts via SMS</p>
                  </div>
                  <Switch checked={s.smsNotifications} onCheckedChange={v => set("smsNotifications", v)} />
                </div>
              </CardContent>
            </Card>

            <Button className="gap-2" onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? "Saving…" : "Save Alert Settings"}
            </Button>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
