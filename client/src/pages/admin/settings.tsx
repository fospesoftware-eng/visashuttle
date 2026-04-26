import { useState } from "react";
import { Globe, Mail, Shield, Database, Save, Key, Bell, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useToast } from "@/hooks/use-toast";

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
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
            <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
            <TabsTrigger value="limits" data-testid="tab-limits">Defaults</TabsTrigger>
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
          </TabsContent>
        </Tabs>

        <Button className="gap-2" onClick={handleSave} disabled={saving} data-testid="button-save">
          <Save className="w-4 h-4" />
          {saving ? "Saving…" : "Save All Settings"}
        </Button>
      </div>
    </DashboardLayout>
  );
}
