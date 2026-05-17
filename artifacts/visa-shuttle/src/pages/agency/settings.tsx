import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Users, Bell, CreditCard, Save, Palette, Eye, EyeOff, Loader2, Check, ExternalLink, Copy, Globe, Link2, Plus, Trash2, ChevronRight, UserCheck, UserX, Zap, Crown, Shield, ArrowUpRight, MessageSquare, Send, AlertCircle, ClipboardList, RotateCcw, Settings, ReceiptText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Checkbox } from "@/components/ui/checkbox";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Tenant } from "@workspace/db";
import { AGENCY_PERMISSIONS, type AgencyPermission } from "@/shared/schema-constants";
import { useCurrentUser } from "@/hooks/use-current-user";
import { COUNTRIES, VISA_TYPES as GENERIC_VISA_TYPES } from "@/shared/destinations";
import { CHECKLIST_COUNTRIES, CHECKLIST_VISA_TYPES, getDocumentChecklist, type DocumentRequirement } from "@/data/document-checklists";
import { PhoneInput, defaultPhoneCodeFrom } from "@/components/phone-input";

// ─── Team Tab Component ────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  agency_owner: "Owner",
  agency_manager: "Manager",
  agency_staff: "Staff",
};

// Human-friendly labels for the granular permission flags. Keep in sync with
// AGENCY_PERMISSIONS in shared/schema.ts.
const PERMISSION_LABELS: Record<AgencyPermission, string> = {
  leads: "Leads pipeline",
  cases: "Applications / cases",
  documents: "Document Center",
  accounting: "Accounting (invoices, payments)",
  analytics: "Reports & analytics",
  team: "Manage team members",
  settings: "Edit agency settings",
};

// Sensible per-role defaults the dialog seeds when the user picks a role.
// Owner is implicit — they always have everything regardless of this array.
const DEFAULT_PERMISSIONS_BY_ROLE: Record<string, AgencyPermission[]> = {
  agency_staff: ["leads", "cases", "documents"],
  agency_manager: [...AGENCY_PERMISSIONS],
};

type InviteForm = { name: string; email: string; role: string; permissions: AgencyPermission[] };
type EditForm = { id: string; name: string; role: string; permissions: AgencyPermission[] };

function TeamTab({ tenantId, currentUserId }: { tenantId?: string; currentUserId?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<EditForm | null>(null);
  const [inviteForm, setInviteForm] = useState<InviteForm>({
    name: "",
    email: "",
    role: "agency_staff",
    permissions: DEFAULT_PERMISSIONS_BY_ROLE.agency_staff,
  });

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
    mutationFn: async (data: InviteForm) => {
      const res = await apiRequest("POST", `/api/tenants/${tenantId}/staff`, data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "staff"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "usage"] });
      setIsInviteOpen(false);
      setInviteForm({ name: "", email: "", role: "agency_staff", permissions: DEFAULT_PERMISSIONS_BY_ROLE.agency_staff });
      // The server tries Resend first; if email succeeded we say so, otherwise
      // we still surface the temp password so the owner can share it manually.
      if (data.emailSent) {
        toast({
          title: "Team member added",
          description: `Login credentials emailed to ${data.email}.`,
          duration: 8000,
        });
      } else {
        toast({
          title: "Team member added",
          description: `Email delivery isn't configured — share these credentials yourself: ${data.email} / ${data.tempPassword}`,
          duration: 15000,
        });
      }
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMemberMutation = useMutation({
    mutationFn: async (data: EditForm) => {
      const res = await apiRequest("PATCH", `/api/tenants/${tenantId}/staff/${data.id}`, {
        name: data.name,
        role: data.role,
        permissions: data.permissions,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "staff"] });
      setEditMember(null);
      toast({ title: "Team member updated" });
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

  // Toggle a single permission in either the invite form or the edit form.
  const togglePerm = (perms: AgencyPermission[], perm: AgencyPermission): AgencyPermission[] =>
    perms.includes(perm) ? perms.filter((p) => p !== perm) : [...perms, perm];

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
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Pick a role and tick the areas they should be able to access. We'll email them their login details when Resend is configured, otherwise the temporary password will be shown to you so you can share it.
                </DialogDescription>
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
                  <Select
                    value={inviteForm.role}
                    onValueChange={v => setInviteForm({
                      ...inviteForm,
                      role: v,
                      // Re-seed permissions to the role default — owner can
                      // still tweak the boxes manually below.
                      permissions: DEFAULT_PERMISSIONS_BY_ROLE[v] ?? inviteForm.permissions,
                    })}
                  >
                    <SelectTrigger data-testid="select-staff-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agency_staff">Staff — can manage cases &amp; leads</SelectItem>
                      <SelectItem value="agency_manager">Manager — can manage team &amp; settings</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Access &amp; Permissions</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border p-3">
                    {AGENCY_PERMISSIONS.map((perm) => (
                      <label
                        key={perm}
                        htmlFor={`perm-invite-${perm}`}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          id={`perm-invite-${perm}`}
                          checked={inviteForm.permissions.includes(perm)}
                          onCheckedChange={() => setInviteForm({
                            ...inviteForm,
                            permissions: togglePerm(inviteForm.permissions, perm),
                          })}
                          data-testid={`checkbox-perm-${perm}`}
                        />
                        <span>{PERMISSION_LABELS[perm]}</span>
                      </label>
                    ))}
                  </div>
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
              {staff.map((member: any) => {
                const memberPerms: AgencyPermission[] = Array.isArray(member.permissions)
                  ? member.permissions.filter((p: any): p is AgencyPermission =>
                      (AGENCY_PERMISSIONS as readonly string[]).includes(p))
                  : [];
                const isOwner = member.role === "agency_owner";
                return (
                <div key={member.id} className="flex items-start gap-4 p-4 bg-background hover:bg-muted/30 transition-colors" data-testid={`staff-row-${member.id}`}>
                  <Avatar className="w-9 h-9 shrink-0 mt-0.5">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {member.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm">{member.name}</p>
                      {member.id === currentUserId && <Badge variant="secondary" className="text-xs">You</Badge>}
                      <Badge variant="outline" className="text-xs capitalize">
                        {ROLE_LABELS[member.role] ?? member.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    {/* Owner is implicitly all-access; for everyone else show
                        the granular permission badges so the agency knows at a
                        glance what each member can touch. */}
                    {!isOwner && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {memberPerms.length === 0 ? (
                          <span className="text-[11px] text-muted-foreground italic">No access permissions yet — click Edit.</span>
                        ) : (
                          memberPerms.map((p) => (
                            <Badge key={p} variant="secondary" className="text-[10px] font-normal">
                              {PERMISSION_LABELS[p]}
                            </Badge>
                          ))
                        )}
                      </div>
                    )}
                    {isOwner && (
                      <p className="mt-2 text-[11px] text-muted-foreground">Full access (owner)</p>
                    )}
                  </div>
                  {!isOwner && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => setEditMember({
                          id: member.id,
                          name: member.name,
                          role: member.role,
                          permissions: memberPerms,
                        })}
                        data-testid={`button-edit-staff-${member.id}`}
                      >
                        Edit
                      </Button>
                      {member.id !== currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setRemoveId(member.id)}
                          data-testid={`button-remove-staff-${member.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
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

      {/* Edit member dialog — change role + flip permission checkboxes */}
      <Dialog open={!!editMember} onOpenChange={open => !open && setEditMember(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Team Member</DialogTitle>
            <DialogDescription>Adjust their role and access permissions.</DialogDescription>
          </DialogHeader>
          {editMember && (
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={editMember.name}
                  onChange={e => setEditMember({ ...editMember, name: e.target.value })}
                  data-testid="input-edit-staff-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={editMember.role}
                  onValueChange={v => setEditMember({ ...editMember, role: v })}
                >
                  <SelectTrigger data-testid="select-edit-staff-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agency_staff">Staff</SelectItem>
                    <SelectItem value="agency_manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Access &amp; Permissions</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border p-3">
                  {AGENCY_PERMISSIONS.map((perm) => (
                    <label
                      key={perm}
                      htmlFor={`perm-edit-${perm}`}
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Checkbox
                        id={`perm-edit-${perm}`}
                        checked={editMember.permissions.includes(perm)}
                        onCheckedChange={() => setEditMember({
                          ...editMember,
                          permissions: togglePerm(editMember.permissions, perm),
                        })}
                        data-testid={`checkbox-edit-perm-${perm}`}
                      />
                      <span>{PERMISSION_LABELS[perm]}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => updateMemberMutation.mutate(editMember)}
                disabled={updateMemberMutation.isPending}
                data-testid="button-save-staff"
              >
                {updateMemberMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Save Changes
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

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

function ApplicationSettingsTab({ tenantId }: { tenantId?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const countryOptions = useMemo(
    () => Array.from(new Set([...CHECKLIST_COUNTRIES, ...COUNTRIES])).sort(),
    [],
  );
  const visaTypeOptions = useMemo(
    () => Array.from(new Set([...CHECKLIST_VISA_TYPES, ...GENERIC_VISA_TYPES])).sort(),
    [],
  );
  const [country, setCountry] = useState("United States");
  const [visaType, setVisaType] = useState("Tourist Visa");
  const [items, setItems] = useState<DocumentRequirement[]>([]);
  const [loadedKey, setLoadedKey] = useState("");

  const checklistKey = ["/api/tenants", tenantId, "application-settings", "checklists", country, visaType];
  const { data, isLoading } = useQuery<{
    source: "agency" | "database" | "default";
    checklist: DocumentRequirement[];
    override: unknown | null;
  }>({
    queryKey: checklistKey,
    queryFn: async () => {
      const qs = new URLSearchParams({ country, visaType });
      const res = await fetch(`/api/tenants/${tenantId}/application-settings/checklists?${qs.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load checklist");
      return res.json();
    },
    enabled: !!tenantId && !!country && !!visaType,
  });

  useEffect(() => {
    const key = `${country}::${visaType}::${data?.source ?? ""}`;
    if (!data || loadedKey === key) return;
    setItems(data.checklist?.length ? data.checklist : getDocumentChecklist(country, visaType));
    setLoadedKey(key);
  }, [country, data, loadedKey, visaType]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleaned = items
        .map((item) => ({
          ...item,
          type: item.type.trim(),
          name: item.name.trim(),
          description: item.description.trim(),
        }))
        .filter((item) => item.type && item.name);
      const res = await apiRequest("PUT", `/api/tenants/${tenantId}/application-settings/checklists`, {
        country,
        visaType,
        checklist: cleaned,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: checklistKey });
      toast({ title: "Saved", description: "This checklist now applies only to your agency." });
    },
    onError: (error: Error) => toast({ title: "Save failed", description: error.message, variant: "destructive" }),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const qs = new URLSearchParams({ country, visaType });
      const res = await apiRequest("DELETE", `/api/tenants/${tenantId}/application-settings/checklists?${qs.toString()}`);
      return res.json();
    },
    onSuccess: (next) => {
      setItems(next.checklist ?? getDocumentChecklist(country, visaType));
      setLoadedKey("");
      queryClient.invalidateQueries({ queryKey: checklistKey });
      toast({ title: "Reset", description: "Agency override removed. The default checklist is active again." });
    },
    onError: (error: Error) => toast({ title: "Reset failed", description: error.message, variant: "destructive" }),
  });

  const updateItem = (index: number, patch: Partial<DocumentRequirement>) => {
    setItems((current) => current.map((item, i) => i === index ? { ...item, ...patch } : item));
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      { type: `custom_${current.length + 1}`, name: "", description: "", required: true },
    ]);
  };

  const sourceLabel = data?.source === "agency"
    ? "Agency override"
    : data?.source === "database"
      ? "Database template"
      : "Default template";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="w-4 h-4" />
            Application Checklist Settings
          </CardTitle>
          <CardDescription>
            Customize required documents by destination and visa type. Changes stay private to this agency.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div className="space-y-2">
              <Label>Destination country</Label>
              <Select value={country} onValueChange={(value) => { setCountry(value); setLoadedKey(""); }}>
                <SelectTrigger data-testid="select-checklist-country">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {countryOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visa type</Label>
              <Select value={visaType} onValueChange={(value) => { setVisaType(value); setLoadedKey(""); }}>
                <SelectTrigger data-testid="select-checklist-visa-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visaTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Badge variant={data?.source === "agency" ? "default" : "secondary"} className="h-10 justify-center px-3">
              {isLoading ? "Loading..." : sourceLabel}
            </Badge>
          </div>

          <div className="rounded-lg border divide-y overflow-hidden">
            {items.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">
                No checklist items yet. Add the first document requirement below.
              </div>
            )}
            {items.map((item, index) => (
              <div key={`${item.type}-${index}`} className="p-4 space-y-3">
                <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr_auto_auto] md:items-center">
                  <div className="space-y-1">
                    <Label className="text-xs">Document key</Label>
                    <Input value={item.type} onChange={(e) => updateItem(index, { type: e.target.value })} placeholder="bank_statement" data-testid={`input-checklist-type-${index}`} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Document name</Label>
                    <Input value={item.name} onChange={(e) => updateItem(index, { name: e.target.value })} placeholder="Bank statements" data-testid={`input-checklist-name-${index}`} />
                  </div>
                  <label className="flex items-center gap-2 text-sm md:pt-5">
                    <Checkbox checked={item.required} onCheckedChange={(checked) => updateItem(index, { required: checked === true })} data-testid={`checkbox-checklist-required-${index}`} />
                    Required
                  </label>
                  <Button variant="ghost" size="icon" className="md:mt-5" onClick={() => setItems((current) => current.filter((_, i) => i !== index))} data-testid={`button-remove-checklist-item-${index}`} aria-label="Remove document">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} rows={2} placeholder="Tell the applicant exactly what this document should include." data-testid={`textarea-checklist-description-${index}`} />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={addItem} className="gap-2" data-testid="button-add-checklist-item">
              <Plus className="w-4 h-4" />
              Add document
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending || data?.source !== "agency"} className="gap-2" data-testid="button-reset-checklist">
                {resetMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                Reset
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || items.length === 0} className="gap-2" data-testid="button-save-checklist">
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save checklist
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Payments (Cashfree) Tab ───────────────────────────────────────────────────

function PaymentsTab({ tenantId }: { tenantId?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: cfg, isLoading: gatewayLoading } = useQuery<any>({
    queryKey: ["/api/tenants", tenantId, "payment-gateway-config"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/payment-gateway-config`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load payment gateway config");
      return res.json();
    },
    enabled: !!tenantId,
  });
  const { data: invoiceSettings, isLoading: offlineLoading } = useQuery<any | null>({
    queryKey: ["/api/tenants", tenantId, "invoice-settings"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/invoice-settings`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load offline payment settings");
      return res.json();
    },
    enabled: !!tenantId,
  });

  const [form, setForm] = useState({
    enabled: false, mode: "test" as "test" | "live", apiVersion: "2023-08-01",
    testClientId: "", testClientSecret: "", liveClientId: "", liveClientSecret: "", webhookSecret: "",
  });
  const [offlineForm, setOfflineForm] = useState({
    paymentInstructions: "",
    bankDetails: "",
    upiId: "",
    upiQrFileUrl: "",
  });
  const [showSecret, setShowSecret] = useState({ test: false, live: false, webhook: false });

  useEffect(() => {
    if (cfg) {
      setForm({
        enabled: !!cfg.enabled,
        mode: cfg.mode === "live" ? "live" : "test",
        apiVersion: cfg.apiVersion || "2023-08-01",
        testClientId: cfg.testClientId || "",
        testClientSecret: cfg.testClientSecret || "",
        liveClientId: cfg.liveClientId || "",
        liveClientSecret: cfg.liveClientSecret || "",
        webhookSecret: cfg.webhookSecret || "",
      });
    }
  }, [cfg]);

  useEffect(() => {
    if (invoiceSettings) {
      setOfflineForm({
        paymentInstructions: invoiceSettings.paymentInstructions || "",
        bankDetails: invoiceSettings.bankDetails || "",
        upiId: invoiceSettings.upiId || "",
        upiQrFileUrl: invoiceSettings.upiQrFileUrl || "",
      });
    }
  }, [invoiceSettings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Don't send back masked placeholders (•) — server-side will ignore them, but cleaner to omit.
      const isMasked = (v: string) => v.includes("•");
      const payload: Record<string, any> = {
        enabled: form.enabled,
        mode: form.mode,
        apiVersion: form.apiVersion,
      };
      if (form.testClientId && !isMasked(form.testClientId)) payload.testClientId = form.testClientId;
      if (form.testClientSecret && !isMasked(form.testClientSecret)) payload.testClientSecret = form.testClientSecret;
      if (form.liveClientId && !isMasked(form.liveClientId)) payload.liveClientId = form.liveClientId;
      if (form.liveClientSecret && !isMasked(form.liveClientSecret)) payload.liveClientSecret = form.liveClientSecret;
      if (form.webhookSecret && !isMasked(form.webhookSecret)) payload.webhookSecret = form.webhookSecret;
      const res = await apiRequest("POST", `/api/tenants/${tenantId}/payment-gateway-config`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "payment-gateway-config"] });
      toast({ title: "Saved", description: "Cashfree settings updated." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const saveOfflineMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        paymentInstructions: offlineForm.paymentInstructions.trim() || null,
        bankDetails: offlineForm.bankDetails.trim() || null,
        upiId: offlineForm.upiId.trim() || null,
        upiQrFileUrl: offlineForm.upiQrFileUrl || null,
      };
      const res = await apiRequest("PUT", `/api/tenants/${tenantId}/invoice-settings`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoice-settings"] });
      toast({ title: "Saved", description: "Offline payment methods updated." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (gatewayLoading || offlineLoading) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>;
  }

  const activeReady = !!cfg?.activeReady;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Offline Payment Methods
          </CardTitle>
          <CardDescription>
            These bank and UPI details are shown on customer proposal links when they choose offline payment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Instructions</Label>
            <Textarea
              value={offlineForm.paymentInstructions}
              onChange={(e) => setOfflineForm({ ...offlineForm, paymentInstructions: e.target.value })}
              placeholder="Example: Upload payment receipt after bank transfer or UPI payment."
              rows={3}
              data-testid="input-offline-payment-instructions"
            />
          </div>
          <div className="space-y-2">
            <Label>Bank Information</Label>
            <Textarea
              value={offlineForm.bankDetails}
              onChange={(e) => setOfflineForm({ ...offlineForm, bankDetails: e.target.value })}
              placeholder={"Bank name\nAccount holder\nAccount number\nIFSC / SWIFT"}
              rows={5}
              data-testid="input-offline-bank-details"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>UPI ID</Label>
              <Input
                value={offlineForm.upiId}
                onChange={(e) => setOfflineForm({ ...offlineForm, upiId: e.target.value.trim() })}
                placeholder="agency@upi"
                data-testid="input-offline-upi-id"
              />
            </div>
            <div className="space-y-2">
              <Label>UPI QR</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    toast({ title: "QR too large", description: "Please upload a QR image under 2 MB.", variant: "destructive" });
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setOfflineForm((f) => ({ ...f, upiQrFileUrl: String(reader.result || "") }));
                  reader.readAsDataURL(file);
                }}
                data-testid="input-offline-upi-qr"
              />
              {offlineForm.upiQrFileUrl && (
                <div className="flex items-center gap-3">
                  <img src={offlineForm.upiQrFileUrl} alt="UPI QR preview" className="h-20 w-20 rounded-md border bg-white object-contain p-1" />
                  <Button variant="outline" size="sm" onClick={() => setOfflineForm({ ...offlineForm, upiQrFileUrl: "" })}>
                    Remove QR
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => saveOfflineMutation.mutate()}
              disabled={saveOfflineMutation.isPending}
              className="gap-2"
              data-testid="button-save-offline-payments"
            >
              {saveOfflineMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Offline Payment Methods
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Cashfree Payment Gateway
          </CardTitle>
          <CardDescription>
            Accept online payments from your customers using Cashfree. Your credentials are stored securely
            and only used to create payment orders for your agency.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Enable Cashfree</Label>
              <p className="text-xs text-muted-foreground">Turn on to start accepting payments via Cashfree.</p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm({ ...form, enabled: v })}
              data-testid="switch-cashfree-enabled"
            />
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={form.mode === "live" ? "default" : "outline"} data-testid="badge-cashfree-mode">
              Mode: {form.mode === "live" ? "Live" : "Test (Sandbox)"}
            </Badge>
            {activeReady ? (
              <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-400">
                <Check className="w-3 h-3 mr-1" /> Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-3 h-3 mr-1" /> Credentials missing
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v: "test" | "live") => setForm({ ...form, mode: v })}>
                <SelectTrigger data-testid="select-cashfree-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test (Sandbox)</SelectItem>
                  <SelectItem value="live">Live (Production)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>API Version</Label>
              <Input
                value={form.apiVersion}
                onChange={(e) => setForm({ ...form, apiVersion: e.target.value })}
                data-testid="input-cashfree-api-version"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test (Sandbox) Credentials</CardTitle>
          <CardDescription>
            Get these from <a href="https://merchant.cashfree.com" target="_blank" rel="noreferrer" className="text-primary underline">Cashfree Merchant Dashboard → Developers → API Keys</a>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Test Client ID</Label>
            <Input
              value={form.testClientId}
              onChange={(e) => setForm({ ...form, testClientId: e.target.value })}
              placeholder="TEST..."
              className="font-mono text-sm"
              data-testid="input-cashfree-test-client-id"
            />
          </div>
          <div className="space-y-2">
            <Label>Test Client Secret</Label>
            <div className="relative">
              <Input
                type={showSecret.test ? "text" : "password"}
                value={form.testClientSecret}
                onChange={(e) => setForm({ ...form, testClientSecret: e.target.value })}
                placeholder={cfg?.hasTestCredentials ? "Saved — enter new value to update" : "cfsk_ma_test_..."}
                className="pr-10 font-mono text-sm"
                data-testid="input-cashfree-test-client-secret"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowSecret({ ...showSecret, test: !showSecret.test })}
              >
                {showSecret.test ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Live (Production) Credentials</CardTitle>
          <CardDescription>Only required when you switch the mode above to Live.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Live Client ID</Label>
            <Input
              value={form.liveClientId}
              onChange={(e) => setForm({ ...form, liveClientId: e.target.value })}
              placeholder="PROD..."
              className="font-mono text-sm"
              data-testid="input-cashfree-live-client-id"
            />
          </div>
          <div className="space-y-2">
            <Label>Live Client Secret</Label>
            <div className="relative">
              <Input
                type={showSecret.live ? "text" : "password"}
                value={form.liveClientSecret}
                onChange={(e) => setForm({ ...form, liveClientSecret: e.target.value })}
                placeholder={cfg?.hasLiveCredentials ? "Saved — enter new value to update" : "cfsk_ma_prod_..."}
                className="pr-10 font-mono text-sm"
                data-testid="input-cashfree-live-client-secret"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowSecret({ ...showSecret, live: !showSecret.live })}
              >
                {showSecret.live ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook Secret (optional)</CardTitle>
          <CardDescription>Used to verify Cashfree webhook signatures for payment status updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Webhook Secret</Label>
            <div className="relative">
              <Input
                type={showSecret.webhook ? "text" : "password"}
                value={form.webhookSecret}
                onChange={(e) => setForm({ ...form, webhookSecret: e.target.value })}
                placeholder={cfg?.hasWebhookSecret ? "Saved — enter new value to update" : "Paste your webhook signing secret"}
                className="pr-10 font-mono text-sm"
                data-testid="input-cashfree-webhook-secret"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowSecret({ ...showSecret, webhook: !showSecret.webhook })}
              >
                {showSecret.webhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
          data-testid="button-save-cashfree"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Cashfree Settings
        </Button>
      </div>
    </div>
  );
}

// ─── SMS (MessageCentral) Tab ──────────────────────────────────────────────────

function SmsTab({ tenantId }: { tenantId?: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: authData } = useCurrentUser();
  const agencyPhoneCode = defaultPhoneCodeFrom((authData?.tenant as any)?.baseCountry ?? (authData?.tenant as any)?.country ?? (authData?.tenant as any)?.contactPhone);
  const { data: cfg, isLoading } = useQuery<any>({
    queryKey: ["/api/tenants", tenantId, "sms-config"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/sms-config`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load SMS config");
      return res.json();
    },
    enabled: !!tenantId,
  });

  const [form, setForm] = useState({
    enabled: false, mcCustomerId: "", mcAuthToken: "", senderId: "",
  });
  const [showToken, setShowToken] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  useEffect(() => {
    if (cfg) {
      setForm({
        enabled: !!cfg.enabled,
        mcCustomerId: cfg.mcCustomerId || "",
        mcAuthToken: cfg.mcAuthToken || "",
        senderId: cfg.senderId || "",
      });
    }
  }, [cfg]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const isMasked = (v: string) => v.includes("•");
      const payload: Record<string, any> = {
        enabled: form.enabled,
        mcCustomerId: form.mcCustomerId,
        senderId: form.senderId,
      };
      if (form.mcAuthToken && !isMasked(form.mcAuthToken)) payload.mcAuthToken = form.mcAuthToken;
      const res = await apiRequest("POST", `/api/tenants/${tenantId}/sms-config`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "sms-config"] });
      toast({ title: "Saved", description: "MessageCentral settings updated." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/tenants/${tenantId}/sms-config/test`, { phone: testPhone });
      return res.json();
    },
    onSuccess: (data) => toast({ title: "Test sent", description: data.message ?? "Test OTP delivered." }),
    onError: (e: Error) => toast({ title: "Test failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>;
  }

  const ready = !!cfg?.activeReady;

  return (
    <div className="space-y-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            MessageCentral SMS Gateway
          </CardTitle>
          <CardDescription>
            Send OTPs and transactional SMS to your customers using your own MessageCentral account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Enable MessageCentral</Label>
              <p className="text-xs text-muted-foreground">Turn on to use these credentials for outgoing SMS.</p>
            </div>
            <Switch
              checked={form.enabled}
              onCheckedChange={(v) => setForm({ ...form, enabled: v })}
              data-testid="switch-mc-enabled"
            />
          </div>

          <div className="flex items-center gap-2">
            {ready ? (
              <Badge variant="outline" className="border-emerald-300 text-emerald-700 dark:text-emerald-400">
                <Check className="w-3 h-3 mr-1" /> Active
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-3 h-3 mr-1" /> Not configured
              </Badge>
            )}
          </div>

          <div className="space-y-2">
            <Label>Customer ID <span className="text-destructive">*</span></Label>
            <Input
              value={form.mcCustomerId}
              onChange={(e) => setForm({ ...form, mcCustomerId: e.target.value })}
              placeholder="C-XXXXXXXXXXXX"
              className="font-mono text-sm"
              data-testid="input-mc-customer-id"
            />
            <p className="text-xs text-muted-foreground">
              From the <a href="https://www.messagecentral.com" target="_blank" rel="noreferrer" className="text-primary underline">MessageCentral dashboard</a> (starts with C-).
            </p>
          </div>

          <div className="space-y-2">
            <Label>Auth Token <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Input
                type={showToken ? "text" : "password"}
                value={form.mcAuthToken}
                onChange={(e) => setForm({ ...form, mcAuthToken: e.target.value })}
                placeholder={cfg?.hasMcCredentials ? "Token saved — enter new value to update" : "Paste your MessageCentral Auth Token"}
                className="pr-10 font-mono text-sm"
                data-testid="input-mc-auth-token"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowToken((s) => !s)}
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Long-lived JWT auth token from your MessageCentral dashboard.</p>
          </div>

          <div className="space-y-2">
            <Label>Sender ID (optional)</Label>
            <Input
              value={form.senderId}
              onChange={(e) => setForm({ ...form, senderId: e.target.value })}
              placeholder="e.g. VISASH"
              maxLength={11}
              data-testid="input-mc-sender-id"
            />
            <p className="text-xs text-muted-foreground">6-character alphanumeric sender ID (DLT-registered for India).</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Test OTP delivery</CardTitle>
          <CardDescription>Save your credentials first, then send a test OTP to verify the setup.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <PhoneInput
              value={testPhone}
              onChange={setTestPhone}
              defaultCountryCode={agencyPhoneCode}
              placeholder="98765 43210"
              testId="input-mc-test-phone"
            />
            <Button
              variant="outline"
              onClick={() => testMutation.mutate()}
              disabled={!testPhone || testMutation.isPending}
              className="gap-2"
              data-testid="button-mc-test-send"
            >
              {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Test
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-2"
          data-testid="button-save-mc"
        >
          {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save SMS Settings
        </Button>
      </div>
    </div>
  );
}

// ─── Billing Tab Component ─────────────────────────────────────────────────────

const PLAN_DETAILS = {
  lite: {
    label: "Lite",
    price: "₹1,999/mo",
    color: "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700",
    icon: Zap,
    features: ["Up to 3 users", "100 applications / month", "Lead management", "Proposal management", "Auto passport scanner", "AI visa check", "Invoicing", "Offline payment collection"],
  },
  go: {
    label: "Go",
    price: "₹3,999/mo",
    color: "bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800",
    icon: Crown,
    features: ["Up to 5 users", "500 applications / month", "Agency visa landing page", "SMS notifications", "Online payment collection", "UPI QR payments", "Remove Powered by branding"],
  },
  power: {
    label: "Power",
    price: "₹7,999/mo",
    color: "bg-primary/5 border-primary/20",
    icon: Shield,
    features: ["Up to 10 users", "Unlimited applications", "Fully featured agency website", "Custom domain support", "WhatsApp integration", "Dedicated support executive", "1 hour custom development monthly"],
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

  const plan = normalizeAgencyPlan(usageData?.plan);
  const details = PLAN_DETAILS[plan];
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
                {plan !== "power" && (
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
            {(Object.entries(PLAN_DETAILS) as [keyof typeof PLAN_DETAILS, typeof PLAN_DETAILS.lite][]).map(([key, p]) => {
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
                  {!isCurrent && key !== "lite" && (
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

function normalizeAgencyPlan(plan?: string | null): keyof typeof PLAN_DETAILS {
  if (plan === "professional") return "go";
  if (plan === "enterprise") return "power";
  if (plan === "go" || plan === "power") return plan;
  return "lite";
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
  const agencyPhoneCode = defaultPhoneCodeFrom((tenant as any)?.baseCountry ?? (tenant as any)?.country ?? tenant?.contactPhone);

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
      <div className="space-y-6 max-w-6xl">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Settings</h1>
          <p className="text-muted-foreground">Manage your agency settings and preferences.</p>
        </div>

        <Tabs defaultValue={typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "subscription" ? "subscription" : "branding"} className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start">
          <TabsList className="h-auto justify-start overflow-x-auto rounded-xl border bg-card p-2 shadow-sm lg:sticky lg:top-20 lg:flex lg:flex-col lg:items-stretch lg:overflow-visible">
            <TabsTrigger value="branding" data-testid="tab-branding" className="shrink-0 justify-start gap-2 rounded-lg px-3 py-2.5 lg:w-full">
              <Palette className="w-4 h-4 mr-2" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="portal" data-testid="tab-portal" className="shrink-0 justify-start gap-2 rounded-lg px-3 py-2.5 lg:w-full">
              <Globe className="w-4 h-4 mr-2" />
              Portal & Links
            </TabsTrigger>
            <TabsTrigger value="general" data-testid="tab-general" className="shrink-0 justify-start gap-2 rounded-lg px-3 py-2.5 lg:w-full">
              <Settings className="w-4 h-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="notifications" data-testid="tab-notifications" className="shrink-0 justify-start gap-2 rounded-lg px-3 py-2.5 lg:w-full">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="team" data-testid="tab-team" className="shrink-0 justify-start gap-2 rounded-lg px-3 py-2.5 lg:w-full">
              <Users className="w-4 h-4 mr-2" />
              Team
            </TabsTrigger>
            <TabsTrigger value="application" data-testid="tab-application-settings" className="shrink-0 justify-start gap-2 rounded-lg px-3 py-2.5 lg:w-full">
              <ClipboardList className="w-4 h-4 mr-2" />
              Application
            </TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments" className="shrink-0 justify-start gap-2 rounded-lg px-3 py-2.5 lg:w-full">
              <CreditCard className="w-4 h-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="sms" data-testid="tab-sms" className="shrink-0 justify-start gap-2 rounded-lg px-3 py-2.5 lg:w-full">
              <MessageSquare className="w-4 h-4 mr-2" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="billing" data-testid="tab-billing" className="shrink-0 justify-start gap-2 rounded-lg px-3 py-2.5 lg:w-full">
              <ReceiptText className="w-4 h-4 mr-2" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="subscription" data-testid="tab-subscription" className="shrink-0 justify-start gap-2 rounded-lg px-3 py-2.5 lg:w-full">
              <Crown className="w-4 h-4 mr-2" />
              Subscription
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding" className="mt-0 space-y-6">
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
                    <Label htmlFor="logoUrl">Agency Logo</Label>
                    <div className="rounded-lg border p-3 space-y-3">
                      <div className="flex items-center gap-3">
                        {branding.logoUrl ? (
                          <img
                            src={branding.logoUrl}
                            alt="Agency logo preview"
                            className="h-14 w-14 rounded-md border bg-white object-contain p-1"
                            data-testid="img-agency-logo-preview"
                          />
                        ) : (
                          <div className="h-14 w-14 rounded-md border bg-muted flex items-center justify-center text-lg font-semibold text-muted-foreground">
                            {branding.name?.charAt(0)?.toUpperCase() || "A"}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium">Customer portal and proposal logo</p>
                          <p className="text-xs text-muted-foreground">
                            Upload a PNG/JPG/SVG under 2 MB. This appears on customer portal links and proposal share URLs.
                          </p>
                        </div>
                      </div>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 2 * 1024 * 1024) {
                            toast({ title: "Logo too large", description: "Please upload a logo under 2 MB.", variant: "destructive" });
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = () => setBranding((b) => ({ ...b, logoUrl: String(reader.result || "") }));
                          reader.readAsDataURL(file);
                          e.currentTarget.value = "";
                        }}
                        data-testid="input-agency-logo-file"
                      />
                      {branding.logoUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setBranding({ ...branding, logoUrl: "" })}
                          data-testid="button-remove-agency-logo"
                        >
                          Remove logo
                        </Button>
                      )}
                    </div>
                    <Label htmlFor="logoUrl" className="text-xs text-muted-foreground">Or paste logo URL</Label>
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
                    <PhoneInput
                      value={branding.contactPhone}
                      onChange={(contactPhone) => setBranding({ ...branding, contactPhone })}
                      defaultCountryCode={agencyPhoneCode}
                      placeholder="98765 43210"
                      testId="input-contact-phone"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                    <PhoneInput
                      value={branding.whatsappNumber}
                      onChange={(whatsappNumber) => setBranding({ ...branding, whatsappNumber })}
                      defaultCountryCode={agencyPhoneCode}
                      placeholder="98765 43210"
                      testId="input-whatsapp"
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

          <TabsContent value="application" className="space-y-4">
            <ApplicationSettingsTab tenantId={tenant?.id} />
          </TabsContent>

          <TabsContent value="payments" className="space-y-4">
            <PaymentsTab tenantId={tenant?.id} />
          </TabsContent>

          <TabsContent value="sms" className="space-y-4">
            <SmsTab tenantId={tenant?.id} />
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <BillingTab tenantId={tenant?.id} />
          </TabsContent>

          <TabsContent value="subscription" className="space-y-4">
            <SubscriptionTab tenantId={tenant?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ─── Subscription Tab ─────────────────────────────────────────────────────────
// Lets the agency see their current Visa Shuttle subscription (set by the
// platform admin) and pay the upcoming month's invoice via Cashfree.
//
// Gateway return-url flow (works for both Cashfree and Stripe):
//   1. POST /initiate-payment → backend tells us which provider is active and
//      returns either a Cashfree paymentSessionId or a Stripe checkoutUrl.
//   2. We open the provider's hosted checkout in a new tab.
//   3. The provider redirects the user back to /app/settings?tab=subscription
//      &order_id=SUB_... (Stripe also adds &session_id=...).
//   4. On mount we detect order_id in the URL and call /confirm.
function SubscriptionTab({ tenantId }: { tenantId?: string }) {
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const subQuery = useQuery<{
    subscription: {
      id: string; tenantId: string; plan: string; status: string;
      monthlyPriceCents: number; currency: string;
      trialEndsAt: string | null;
      currentPeriodStart: string | null; currentPeriodEnd: string | null;
      notes: string | null;
    };
    invoices: {
      id: string; amountCents: number; currency: string; status: string;
      periodStart: string | null; periodEnd: string | null;
      paidAt: string | null; createdAt: string | null;
    }[];
  }>({
    queryKey: ["/api/agency", tenantId, "subscription"],
    queryFn: async () => {
      const r = await fetch(`/api/agency/${tenantId}/subscription`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load subscription");
      return r.json();
    },
    enabled: !!tenantId,
  });

  const initiateMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/agency/${tenantId}/subscription/initiate-payment`, {}),
    onSuccess: async (res: any) => {
      const data = await (res?.json?.() ?? res);
      // Branch on the provider returned by the backend.
      if (data?.provider === "stripe") {
        if (data?.checkoutUrl) {
          window.open(data.checkoutUrl, "_blank");
        } else {
          toast({ title: "Could not start payment", description: "No Stripe checkout URL returned", variant: "destructive" });
        }
        return;
      }
      // Cashfree (default). Use the hosted-redirect approach via payment_session_id.
      if (data?.paymentSessionId) {
        const url = data.mode === "production" || data.mode === "live"
          ? `https://payments.cashfree.com/order/#${data.paymentSessionId}`
          : `https://payments-test.cashfree.com/order/#${data.paymentSessionId}`;
        window.open(url, "_blank");
      } else {
        toast({ title: "Could not start payment", description: "No session id returned", variant: "destructive" });
      }
    },
    onError: (e: any) => toast({ title: "Payment failed", description: e?.message ?? "Try again", variant: "destructive" }),
  });

  // Auto-confirm if we returned from the gateway with ?order_id=... (works for
  // both Cashfree and Stripe; backend looks up the invoice's stored provider).
  useEffect(() => {
    if (!tenantId) return;
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get("order_id");
    const canceled = params.get("canceled");
    if (!orderId || !orderId.startsWith("SUB_")) return;
    if (canceled === "1") {
      toast({ title: "Payment canceled", description: "You can retry whenever you're ready.", variant: "destructive" });
      const url = new URL(window.location.href);
      url.searchParams.delete("order_id");
      url.searchParams.delete("canceled");
      url.searchParams.delete("provider");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.toString());
      return;
    }
    setConfirming(true);
    apiRequest("POST", `/api/agency/${tenantId}/subscription/confirm`, { orderId })
      .then(async (r: any) => {
        const data = await (r?.json?.() ?? r);
        if (data?.paid) {
          toast({ title: "Payment received", description: "Your subscription has been renewed." });
          qc.invalidateQueries({ queryKey: ["/api/agency", tenantId, "subscription"] });
        } else {
          toast({ title: "Payment not completed", description: `Status: ${data?.status ?? "unknown"}`, variant: "destructive" });
        }
        // Strip the order_id from the URL so a refresh doesn't retry.
        const url = new URL(window.location.href);
        url.searchParams.delete("order_id");
        url.searchParams.delete("provider");
        url.searchParams.delete("session_id");
        window.history.replaceState({}, "", url.toString());
      })
      .catch((e: any) => toast({ title: "Could not confirm payment", description: e?.message, variant: "destructive" }))
      .finally(() => setConfirming(false));
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (subQuery.isLoading || !subQuery.data) {
    return <Skeleton className="h-48" />;
  }
  const { subscription: sub, invoices } = subQuery.data;
  const subPlan = normalizeAgencyPlan(sub.plan);
  const subPlanLabel = PLAN_DETAILS[subPlan].label;
  const fmt = (cents: number, ccy: string) => {
    const v = (cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return ccy === "INR" ? `₹${v}` : `${ccy} ${v}`;
  };
  const STATUS: Record<string, string> = {
    trialing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    past_due: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    canceled: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Current subscription
          </CardTitle>
          <CardDescription>Your Visa Shuttle plan and billing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Plan</p>
              <p className="font-semibold">{subPlanLabel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <Badge variant="secondary" className={STATUS[sub.status] ?? ""}>{sub.status}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Monthly</p>
              <p className="font-semibold">{fmt(sub.monthlyPriceCents, sub.currency)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current period ends</p>
              <p className="text-sm">{sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "—"}</p>
            </div>
            <div className="md:col-span-2 flex items-end justify-end">
              {sub.monthlyPriceCents > 0 ? (
                <Button onClick={() => initiateMut.mutate()} disabled={initiateMut.isPending || confirming} className="gap-2">
                  {(initiateMut.isPending || confirming)
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <CreditCard className="w-4 h-4" />}
                  Pay {fmt(sub.monthlyPriceCents, sub.currency)}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">No price set yet — contact support.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Billing history</CardTitle>
          <CardDescription>Past subscription invoices.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="divide-y">
              {invoices.map(inv => (
                <div key={inv.id} className="px-6 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{fmt(inv.amountCents, inv.currency)}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.periodStart ? new Date(inv.periodStart).toLocaleDateString() : "—"}
                      {" – "}
                      {inv.periodEnd ? new Date(inv.periodEnd).toLocaleDateString() : "—"}
                    </p>
                  </div>
                  <Badge variant="secondary" className={STATUS[inv.status] ?? ""}>{inv.status}</Badge>
                  <span className="text-xs text-muted-foreground w-32 text-right">
                    {inv.paidAt ? `Paid ${new Date(inv.paidAt).toLocaleDateString()}` : (inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
