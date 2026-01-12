import { useState } from "react";
import { Building2, Users, Bell, Shield, CreditCard, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";

export default function AgencySettingsPage() {
  const [agencyName, setAgencyName] = useState("Demo Travel Agency");
  const [email, setEmail] = useState("owner@demoagency.com");
  const [notifications, setNotifications] = useState({
    newLead: true,
    documentUploaded: true,
    caseUpdated: true,
    customerMessage: true
  });

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Settings</h1>
          <p className="text-muted-foreground">Manage your agency settings and preferences.</p>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
            <TabsTrigger value="team" data-testid="tab-team">Team</TabsTrigger>
            <TabsTrigger value="billing" data-testid="tab-billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Agency Information
                </CardTitle>
                <CardDescription>Update your agency details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="agencyName">Agency Name</Label>
                    <Input
                      id="agencyName"
                      value={agencyName}
                      onChange={(e) => setAgencyName(e.target.value)}
                      data-testid="input-agency-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Contact Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      data-testid="input-email"
                    />
                  </div>
                </div>
                <Button className="gap-2" data-testid="button-save">
                  <Save className="w-4 h-4" />
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Choose what notifications you receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">New Lead</p>
                    <p className="text-sm text-muted-foreground">Get notified when a new lead is added</p>
                  </div>
                  <Switch
                    checked={notifications.newLead}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, newLead: checked })}
                    data-testid="switch-new-lead"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Document Uploaded</p>
                    <p className="text-sm text-muted-foreground">Get notified when a customer uploads a document</p>
                  </div>
                  <Switch
                    checked={notifications.documentUploaded}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, documentUploaded: checked })}
                    data-testid="switch-document-uploaded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Case Updated</p>
                    <p className="text-sm text-muted-foreground">Get notified when a case status changes</p>
                  </div>
                  <Switch
                    checked={notifications.caseUpdated}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, caseUpdated: checked })}
                    data-testid="switch-case-updated"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Customer Message</p>
                    <p className="text-sm text-muted-foreground">Get notified when a customer sends a message</p>
                  </div>
                  <Switch
                    checked={notifications.customerMessage}
                    onCheckedChange={(checked) => setNotifications({ ...notifications, customerMessage: checked })}
                    data-testid="switch-customer-message"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Team Members
                </CardTitle>
                <CardDescription>Manage your agency team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">Sarah Agent</p>
                      <p className="text-sm text-muted-foreground">owner@demoagency.com</p>
                    </div>
                    <span className="text-sm text-muted-foreground">Owner</span>
                  </div>
                  <Button variant="outline" className="w-full" data-testid="button-invite">
                    Invite Team Member
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Subscription
                </CardTitle>
                <CardDescription>Manage your subscription and billing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Professional Plan</p>
                      <p className="text-sm text-muted-foreground">$149/month</p>
                    </div>
                    <Button variant="outline" data-testid="button-upgrade">
                      Upgrade Plan
                    </Button>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Next billing date: February 15, 2024
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
