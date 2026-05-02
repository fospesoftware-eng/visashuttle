import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Users, Bell, CreditCard, Save, Palette, Eye, Loader2, Check, ExternalLink, Copy, Globe, Link2, Plus, Trash2, ChevronRight, UserCheck, UserX, Zap, Crown, Shield, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Tenant } from "@shared/schema";
import { useCurrentUser } from "@/hooks/use-current-user";

// ─── Team Tab Component ────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  agency_owner: "Owner",
  agency_manager: "Manager",
  agency_staff: "Staff",
};

function TeamTab({ tenantId, currentUserId }: { tenantId?: string; currentUserId?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ name: "", email: "", role: "agency_staff" });

  const { data: staff = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/tenants", tenantId, "staff"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/staff`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenantId,
  });

  const { data: usageData } = useQuery<any>({
    queryKey: ["/api/tenants", tenantId, "usage"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/usage`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!tenantId,
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: typeof inviteForm) => {
      const res = await apiRequest("POST", `/api/tenants/${tenantId}/staff`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "usage"] });
      setIsInviteOpen(false);
      setInviteForm({ name: "", email: "", role: "agency_staff" });
      toast({
        title: "Staff member added",
        description: `Temporary password: ${data.tempPassword} — share this with them.`,
        duration: 10000,
      });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/tenants/${tenantId}/staff/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "usage"] });
      setRemoveId(null);
      toast({ title: "Staff member removed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const staffLimit = usageData?.limits?.staff ?? 3;
  const staffCount = usageData?.usage?.staff ?? staff.length;
  const atLimit = staffCount >= staffLimit;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Members
            </CardTitle>
            <CardDescription>Manage who has access to your agency dashboard</CardDescription>
          </div>
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 shrink-0" disabled={atLimit} data-testid="button-invite">
                <Plus className="w-4 h-4" />
                Add Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>They'll receive access credentials to your agency dashboard.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={inviteForm.name} onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })} placeholder="Jane Smith" data-testid="input-staff-name" />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={inviteForm.email} onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="jane@agency.com" data-testid="input-staff-email" />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteForm.role} onValueChange={v => setInviteForm({ ...inviteForm, role: v })}>
                    <SelectTrigger data-testid="select-staff-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agency_staff">Staff — can manage cases & leads</SelectItem>
                      <SelectItem value="agency_manager">Manager — can manage team & settings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    A temporary password will be generated and shown to you after creation. Share it securely with the staff member.
                  </p>
                </div>
                <Button className="w-full" onClick={() => inviteMutation.mutate(inviteForm)} disabled={inviteMutation.isPending} data-testid="button-submit-staff">
                  {inviteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Add Member
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : (
            <div className="divide-y rounded-xl border overflow-hidden">
              {staff.map((member: any) => (
                <div key={member.id} className="flex items-center gap-4 p-4 bg-background hover:bg-muted/30 transition-colors" data-testid={`staff-row-${member.id}`}>
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {member.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{member.name}</p>
                      {member.id === currentUserId && <Badge variant="secondary" className="text-xs">You</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize shrink-0">
                    {ROLE_LABELS[member.role] ?? member.role}
                  </Badge>
                  {member.id !== currentUserId && member.role !== "agency_owner" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => setRemoveId(member.id)}
                      data-testid={`button-remove-staff-${member.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              {staff.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">No team members yet.</div>
              )}
            </div>
          )}
          {usageData && (
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
              <span>{staffCount} / {staffLimit === 999 ? "∞" : staffLimit} staff members used</span>
              {atLimit && <span className="text-amber-600 dark:text-amber-400 font-medium">Upgrade to add more</span>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove confirmation */}
      <AlertDialog open={!!removeId} onOpenChange={open => !open && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>They will lose access to your agency dashboard immediately.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => removeId && removeMutation.mutate(removeId)}
            >
              {removeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Billing Tab Component ─────────────────────────────────────────────────────

const PLAN_DETAILS = {
  starter: {
    label: "Starter",
    price: "Free",
    color: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
    icon: Zap,
    features: ["Up to 3 staff members", "30 cases per month", "50 leads", "White-label portal", "Basic analytics"],
  },
  professional: {
    label: "Professional",
    price: "$149/mo",
    color: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800",
    icon: Crown,
    features: ["Up to 10 staff members", "200 cases per month", "500 leads", "White-label portal", "Advanced analytics", "Remove 'Powered by'"],
  },
  enterprise: {
    label: "Enterprise",
    price: "$399/mo",
    color: "bg-primary/5 border-primary/20",
    icon: Shield,
    features: ["Unlimited staff", "Unlimited cases", "Unlimited leads", "Custom domain", "Priority support", "SLA guarantee"],
  },
};

function BillingTab({ tenantId }: { tenantId?: string }) {
  const { toast } = useToast();
  const handleUpgrade = (planLabel?: string) => {
    toast({
      title: planLabel ? `Upgrade to ${planLabel}` : "Upgrade your plan",
      description: "Contact support@visashuttle.com to enable this plan for your account. Self-serve checkout coming soon.",
      duration: 6000,
    });
  };

  const { data: usageData, isLoading } = useQuery<any>({
    queryKey: ["/api/tenants", tenantId, "usage"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/usage`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!tenantId,
  });

  const plan = usageData?.plan ?? "starter";
  const details = PLAN_DETAILS[plan as keyof typeof PLAN_DETAILS] ?? PLAN_DETAILS.starter;
  const PlanIcon = details.icon;

  const usageItems = usageData ? [
    {
      label: "Staff Members",
      used: usageData.usage.staff,
      limit: usageData.limits.staff,
      unlimited: usageData.limits.staff >= 999,
    },
    {
      label: "Cases This Month",
      used: usageData.usage.casesThisMonth,
      limit: usageData.limits.casesPerMonth,
      unlimited: usageData.limits.casesPerMonth >= 9999,
    },
    {
      label: "Total Leads",
      used: usageData.usage.totalLeads,
      limit: usageData.limits.leads,
      unlimited: usageData.limits.leads >= 9999,
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-20 rounded-xl" /> : (
            <div className={`rounded-xl border p-5 ${details.color}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background/60">
                    <PlanIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{details.label}</p>
                    <p className="text-sm text-muted-foreground">{details.price}</p>
                  </div>
                </div>
                {plan !== "enterprise" && (
                  <Button
                    size="sm"
                    className="gap-1.5 shrink-0"
                    onClick={() => handleUpgrade()}
                    data-testid="button-upgrade"
                  >
                    Upgrade
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {details.features.map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-xs bg-background/60 rounded-full px-2.5 py-1">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usage</CardTitle>
          <CardDescription>Your current usage against your plan limits</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}</div>
          ) : (
            usageItems.map(({ label, used, limit, unlimited }) => {
              const pct = unlimited ? 0 : Math.min(Math.round((used / limit) * 100), 100);
              const isNearLimit = !unlimited && pct >= 80;
              return (
                <div key={label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{label}</span>
                    <span className={`text-xs ${isNearLimit ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-muted-foreground"}`}>
                      {unlimited ? `${used} / ∞` : `${used} / ${limit}`}
                    </span>
                  </div>
                  {!unlimited && (
                    <Progress
                      value={pct}
                      className={`h-2 ${isNearLimit ? "[&>div]:bg-amber-500" : "[&>div]:bg-primary"}`}
                    />
                  )}
                  {isNearLimit && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Approaching limit — consider upgrading your plan.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Plan comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Plans</CardTitle>
          <CardDescription>Compare plans and upgrade when you're ready</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {(Object.entries(PLAN_DETAILS) as [string, typeof PLAN_DETAILS.starter][]).map(([key, p]) => {
              const Icon = p.icon;
              const isCurrent = key === plan;
              return (
                <div key={key} className={`rounded-xl border p-4 relative ${isCurrent ? "ring-2 ring-primary" : ""}`}>
                  {isCurrent && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <Badge className="text-xs">Current Plan</Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-4 h-4 text-primary" />
                    <p className="font-semibold">{p.label}</p>
                    <span className="ml-auto text-sm font-bold text-primary">{p.price}</span>
                  </div>
                  <ul className="space-y-1.5">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && key !== "starter" && (
                    <Button
                      size="sm"
                      className="w-full mt-4 gap-1.5"
                      onClick={() => handleUpgrade(p.label)}
                      data-testid={`button-plan-${key}`}
                    >
                      Upgrade to {p.label}
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Settings Page ────────────────────────────────────────────────────────

export default function AgencySettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: authData } = useCurrentUser();
  
  const NOTIF_KEY = "agency_notification_prefs";
  const [notifications, setNotifications] = useState(() => {
    if (typeof window === "undefined") {
      return { newLead: true, documentUploaded: true, caseUpdated: true, customerMessage: true };
    }
    try {
      const saved = localStorage.getItem(NOTIF_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { newLead: true, documentUploaded: true, caseUpdated: true, customerMessage: true };
  });

  const handleSaveNotifications = () => {
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications));
      toast({ title: "Saved", description: "Notification preferences updated." });
    } catch (e) {
      toast({ title: "Error", description: "Could not save preferences.", variant: "destructive" });
    }
  };

  const goToBilling = () => {
    const trigger = document.querySelector<HTMLButtonElement>('[data-testid="tab-billing"]');
    trigger?.click();
  };

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
  const agencyHomeUrl = tenant?.slug ? `/w/${tenant.slug}` : "";
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const copyUrl = (url: string, label: string) => {
    const full = `${window.location.origin}${url}`;
    navigator.clipboard.writeText(full);
    setCopiedUrl(label);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
    setTimeout(() => setCopiedUrl(null), 2000);
  };

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
            <TabsTrigger value="portal" data-testid="tab-portal">
              <Globe className="w-4 h-4 mr-2" />
              Portal & Links
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
                {tenant?.slug && (
                  <div className="mt-4 space-y-2 border-t pt-4">
                    <p className="text-sm font-medium text-foreground mb-3">Shareable Links</p>
                    {[
                      { label: "Agency Landing Page", url: agencyHomeUrl, desc: "Public marketing page for your agency" },
                      { label: "Customer Login", url: portalUrl, desc: "Direct link to sign in / sign up" },
                    ].map(({ label, url, desc }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-muted-foreground">{label}</p>
                          <code className="text-xs font-mono text-foreground truncate block">{window.location.origin}{url}</code>
                        </div>
                        <Button variant="outline" size="sm" className="h-7 px-2 shrink-0" onClick={() => copyUrl(url, label)} data-testid={`button-copy-${label.replace(/\s/g, "-").toLowerCase()}`}>
                          {copiedUrl === label ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 px-2 shrink-0" onClick={() => window.open(url, "_blank")} data-testid={`button-open-${label.replace(/\s/g, "-").toLowerCase()}`}>
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
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

          <TabsContent value="portal" className="space-y-6">
            {/* Shareable URLs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="w-4 h-4" />
                  Your Agency Portal URLs
                </CardTitle>
                <CardDescription>
                  Share these links with customers so they can access your branded portal, track applications, and upload documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenant?.slug ? (
                  <>
                    {[
                      {
                        label: "Agency Landing Page",
                        url: `${window.location.origin}/w/${tenant.slug}`,
                        desc: "Public-facing page showcasing your services. Share this with potential customers.",
                        badge: "Public",
                        badgeColor: "bg-green-100 text-green-700"
                      },
                      {
                        label: "Customer Login / Sign Up",
                        url: `${window.location.origin}/w/${tenant.slug}/login`,
                        desc: "Direct link to the sign-in page. Customers can create an account or log in here.",
                        badge: "Auth",
                        badgeColor: "bg-blue-100 text-blue-700"
                      },
                    ].map(({ label, url, desc, badge, badgeColor }) => (
                      <div key={label} className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{label}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>{badge}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="outline" size="sm" className="h-7 px-2"
                              onClick={() => copyUrl(`/w/${tenant.slug}${label.includes("Login") ? "/login" : ""}`, label)}
                              data-testid={`button-copy-url-${label.replace(/\s/g, "-").toLowerCase()}`}
                            >
                              {copiedUrl === label ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                            </Button>
                            <Button
                              variant="outline" size="sm" className="h-7 px-2"
                              onClick={() => window.open(url, "_blank")}
                              data-testid={`button-open-url-${label.replace(/\s/g, "-").toLowerCase()}`}
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        <code className="block text-xs font-mono bg-muted px-3 py-2 rounded-lg text-muted-foreground break-all">{url}</code>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Loading your portal URLs…</p>
                )}
              </CardContent>
            </Card>

            {/* Subdomain Setup Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Custom Subdomain Setup
                </CardTitle>
                <CardDescription>
                  Give your customers a fully branded experience at your own domain.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl bg-muted/50 border p-4">
                  <p className="text-sm font-medium text-foreground mb-1">Your subdomain would look like:</p>
                  <code className="text-sm font-mono text-primary">
                    {tenant?.slug || "your-agency"}.yourdomain.com
                  </code>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">How to set it up:</h4>
                  {[
                    { step: "1", title: "Create a CNAME record", desc: `In your DNS provider, add a CNAME record: ${tenant?.slug || "your-agency"}.yourdomain.com → pointing to this app's domain.` },
                    { step: "2", title: "Wait for DNS propagation", desc: "DNS changes can take up to 24–48 hours to fully propagate worldwide." },
                    { step: "3", title: "Verify it works", desc: "Once propagated, visiting your subdomain will automatically load your branded agency portal." },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {step}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{title}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 p-3">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    <strong>Note:</strong> Custom subdomain support requires a Pro or Enterprise plan. Contact support to enable this feature for your account.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Application Link Guide */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Sharing Application Links
                </CardTitle>
                <CardDescription>
                  Send customers a direct link to their specific application — no hunting for reference IDs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  From the <strong>Applications</strong> page, open any application's action menu and choose <strong>"Copy Customer Link"</strong>. The link includes the reference ID, so when customers open it, the application is pre-linked to their account automatically after they sign in.
                </p>
                <div className="rounded-lg bg-muted px-4 py-3">
                  <p className="text-xs font-mono text-muted-foreground break-all">
                    {window.location.origin}/w/{tenant?.slug || "your-agency"}/login?ref=REF-XXXXXX
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  You can share this via email, WhatsApp, or any messaging platform. Customers click the link, sign in with their email OTP, and the application is instantly linked to their account.
                </p>
              </CardContent>
            </Card>
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
                <div className="pt-2 border-t">
                  <Button onClick={handleSaveNotifications} className="gap-2" data-testid="button-save-notifications">
                    <Save className="w-4 h-4" />
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-4">
            <TeamTab tenantId={tenant?.id} currentUserId={authData?.user?.id} />
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <BillingTab tenantId={tenant?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
