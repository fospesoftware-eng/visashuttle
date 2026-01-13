import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Users, Bell, Shield, CreditCard, Save, Palette, Upload, Eye, Loader2, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Tenant } from "@shared/schema";

export default function AgencySettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [notifications, setNotifications] = useState({
    newLead: true,
    documentUploaded: true,
    caseUpdated: true,
    customerMessage: true
  });

  // Get tenant slug from localStorage (set during login) or default to demo-agency
  const tenantSlug = localStorage.getItem("agency_tenant_slug") || "demo-agency";

  // Fetch tenant data using dynamic slug
  const { data: tenant, isLoading } = useQuery<Tenant>({
    queryKey: ["/api/tenants/by-slug", tenantSlug],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/by-slug/${tenantSlug}`);
      if (!res.ok) throw new Error("Failed to load tenant");
      return res.json();
    }
  });

  // Branding form state
  const [branding, setBranding] = useState({
    name: "",
    logoUrl: "",
    primaryColor: "#00B4D8",
    secondaryColor: "#E056A0",
    accentColor: "#0096C7",
    contactEmail: "",
    contactPhone: "",
    whatsappNumber: "",
    showPoweredBy: true
  });

  // Update form when tenant loads
  useEffect(() => {
    if (tenant) {
      setBranding({
        name: tenant.name || "",
        logoUrl: tenant.logoUrl || "",
        primaryColor: tenant.primaryColor || "#00B4D8",
        secondaryColor: tenant.secondaryColor || "#E056A0",
        accentColor: tenant.accentColor || "#0096C7",
        contactEmail: tenant.contactEmail || "",
        contactPhone: tenant.contactPhone || "",
        whatsappNumber: tenant.whatsappNumber || "",
        showPoweredBy: tenant.showPoweredBy ?? true
      });
    }
  }, [tenant]);

  const updateBrandingMutation = useMutation({
    mutationFn: async (data: typeof branding) => {
      if (!tenant?.id) throw new Error("Tenant not loaded");
      const res = await apiRequest("PATCH", `/api/tenants/${tenant.id}/branding`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants/by-slug", tenantSlug] });
      queryClient.invalidateQueries({ queryKey: ["/api/w", tenantSlug, "tenant"] });
      toast({ title: "Saved", description: "Branding settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const handleSaveBranding = () => {
    if (!tenant) {
      toast({ title: "Error", description: "Tenant data not loaded", variant: "destructive" });
      return;
    }
    updateBrandingMutation.mutate(branding);
  };

  const portalUrl = tenant?.slug ? `/w/${tenant.slug}/login` : "";

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Settings</h1>
          <p className="text-muted-foreground">Manage your agency settings and preferences.</p>
        </div>

        <Tabs defaultValue="branding" className="space-y-4">
          <TabsList>
            <TabsTrigger value="branding" data-testid="tab-branding">
              <Palette className="w-4 h-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications">Notifications</TabsTrigger>
            <TabsTrigger value="team" data-testid="tab-team">Team</TabsTrigger>
            <TabsTrigger value="billing" data-testid="tab-billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Customer Portal Preview
                </CardTitle>
                <CardDescription>This is how your customers will see your branded portal</CardDescription>
              </CardHeader>
              <CardContent>
                <div 
                  className="rounded-lg overflow-hidden border"
                  style={{ 
                    background: `linear-gradient(135deg, ${branding.primaryColor}20, ${branding.secondaryColor}20)` 
                  }}
                >
                  <div 
                    className="p-4 flex items-center justify-between"
                    style={{ backgroundColor: branding.primaryColor }}
                  >
                    {branding.logoUrl ? (
                      <img src={branding.logoUrl} alt="Logo" className="h-8 brightness-0 invert" />
                    ) : (
                      <span className="text-white font-bold">{branding.name || "Your Agency"}</span>
                    )}
                    <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                      Sign Out
                    </Button>
                  </div>
                  <div className="p-6 bg-background">
                    <h2 className="text-xl font-bold mb-2">Welcome back!</h2>
                    <p className="text-muted-foreground text-sm mb-4">Track and manage your visa applications</p>
                    <div className="flex gap-2">
                      <Button size="sm" style={{ backgroundColor: branding.primaryColor }}>
                        View Cases
                      </Button>
                      <Button size="sm" variant="outline">Upload Documents</Button>
                    </div>
                  </div>
                </div>
                {portalUrl && (
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Customer Portal URL:</span>
                    <code className="px-2 py-1 rounded bg-muted font-mono text-xs">{portalUrl}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1"
                      onClick={() => window.open(portalUrl, "_blank")}
                      data-testid="button-open-portal"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Brand Colors
                </CardTitle>
                <CardDescription>Customize colors for your customer portal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primaryColor"
                        type="color"
                        value={branding.primaryColor}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer"
                        data-testid="input-primary-color"
                      />
                      <Input
                        value={branding.primaryColor}
                        onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondaryColor"
                        type="color"
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer"
                        data-testid="input-secondary-color"
                      />
                      <Input
                        value={branding.secondaryColor}
                        onChange={(e) => setBranding({ ...branding, secondaryColor: e.target.value })}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accentColor">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="accentColor"
                        type="color"
                        value={branding.accentColor}
                        onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                        className="w-12 h-10 p-1 cursor-pointer"
                        data-testid="input-accent-color"
                      />
                      <Input
                        value={branding.accentColor}
                        onChange={(e) => setBranding({ ...branding, accentColor: e.target.value })}
                        className="flex-1 font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Agency Details
                </CardTitle>
                <CardDescription>Information shown on your customer portal</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Agency Name</Label>
                    <Input
                      id="name"
                      value={branding.name}
                      onChange={(e) => setBranding({ ...branding, name: e.target.value })}
                      placeholder="Your Travel Agency"
                      data-testid="input-agency-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo URL</Label>
                    <Input
                      id="logoUrl"
                      value={branding.logoUrl}
                      onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      data-testid="input-logo-url"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={branding.contactEmail}
                      onChange={(e) => setBranding({ ...branding, contactEmail: e.target.value })}
                      placeholder="contact@youragency.com"
                      data-testid="input-contact-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Contact Phone</Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      value={branding.contactPhone}
                      onChange={(e) => setBranding({ ...branding, contactPhone: e.target.value })}
                      placeholder="+1 234 567 8900"
                      data-testid="input-contact-phone"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                    <Input
                      id="whatsappNumber"
                      type="tel"
                      value={branding.whatsappNumber}
                      onChange={(e) => setBranding({ ...branding, whatsappNumber: e.target.value })}
                      placeholder="+1 234 567 8900"
                      data-testid="input-whatsapp"
                    />
                    <p className="text-xs text-muted-foreground">Customers can chat with you via WhatsApp from the portal</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <p className="font-medium">Show "Powered by Visa Shuttle"</p>
                    <p className="text-sm text-muted-foreground">Display branding footer on customer portal</p>
                  </div>
                  <Switch
                    checked={branding.showPoweredBy}
                    onCheckedChange={(checked) => setBranding({ ...branding, showPoweredBy: checked })}
                    data-testid="switch-powered-by"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                className="gap-2" 
                onClick={handleSaveBranding}
                disabled={updateBrandingMutation.isPending}
                data-testid="button-save-branding"
              >
                {updateBrandingMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : updateBrandingMutation.isSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Branding
              </Button>
            </div>
          </TabsContent>

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
                      value={branding.name}
                      onChange={(e) => setBranding({ ...branding, name: e.target.value })}
                      data-testid="input-agency-name-general"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Contact Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={branding.contactEmail}
                      onChange={(e) => setBranding({ ...branding, contactEmail: e.target.value })}
                      data-testid="input-email"
                    />
                  </div>
                </div>
                <Button className="gap-2" onClick={handleSaveBranding} data-testid="button-save">
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
