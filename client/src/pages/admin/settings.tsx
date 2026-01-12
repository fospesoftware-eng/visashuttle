import { useState } from "react";
import { Globe, Mail, Shield, Database, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    platformName: "Visa Shuttle",
    supportEmail: "support@visashuttle.com",
    maintenanceMode: false,
    newRegistrations: true,
    emailNotifications: true,
    defaultAIQuota: 5000,
    defaultStorageQuota: 10
  });

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Platform Settings</h1>
          <p className="text-muted-foreground">Configure global platform settings.</p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
            <TabsTrigger value="limits" data-testid="tab-limits">Limits & Quotas</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Platform Information
                </CardTitle>
                <CardDescription>Basic platform configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="platformName">Platform Name</Label>
                    <Input
                      id="platformName"
                      value={settings.platformName}
                      onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                      data-testid="input-platform-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supportEmail">Support Email</Label>
                    <Input
                      id="supportEmail"
                      type="email"
                      value={settings.supportEmail}
                      onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                      data-testid="input-support-email"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-sm text-muted-foreground">Disable access for all users except admins</p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
                    data-testid="switch-maintenance"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">Send system emails to tenants and users</p>
                  </div>
                  <Switch
                    checked={settings.emailNotifications}
                    onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
                    data-testid="switch-email-notifications"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Access Control
                </CardTitle>
                <CardDescription>Manage platform access settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Allow New Registrations</p>
                    <p className="text-sm text-muted-foreground">Allow new travel agencies to sign up</p>
                  </div>
                  <Switch
                    checked={settings.newRegistrations}
                    onCheckedChange={(checked) => setSettings({ ...settings, newRegistrations: checked })}
                    data-testid="switch-new-registrations"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="limits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Default Quotas
                </CardTitle>
                <CardDescription>Set default limits for new tenants</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="aiQuota">AI Requests / Month</Label>
                    <Input
                      id="aiQuota"
                      type="number"
                      value={settings.defaultAIQuota}
                      onChange={(e) => setSettings({ ...settings, defaultAIQuota: parseInt(e.target.value) })}
                      data-testid="input-ai-quota"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storageQuota">Storage (GB)</Label>
                    <Input
                      id="storageQuota"
                      type="number"
                      value={settings.defaultStorageQuota}
                      onChange={(e) => setSettings({ ...settings, defaultStorageQuota: parseInt(e.target.value) })}
                      data-testid="input-storage-quota"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Button className="gap-2" data-testid="button-save">
          <Save className="w-4 h-4" />
          Save All Settings
        </Button>
      </div>
    </DashboardLayout>
  );
}
