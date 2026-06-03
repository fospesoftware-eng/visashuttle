import { useState } from "react";
import { Plus, Search, MoreVertical, Building2, Users, FileText, RefreshCw, Ban, CheckCircle2, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { StatusBadge } from "@/components/status-badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

const PLAN_COLORS: Record<string, string> = {
  lite: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  go: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  power: "bg-primary/10 text-primary",
  starter: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  professional: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  enterprise: "bg-primary/10 text-primary",
};

export default function AdminTenantsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<any>(null);
  const [deleteTenantId, setDeleteTenantId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", plan: "lite", status: "active" });

  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: tenants = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/tenants"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => (await apiRequest("POST", "/api/admin/tenants", data)).json(),
    onSuccess: (created: any) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setIsCreateOpen(false);
      setForm({ name: "", email: "", plan: "lite", status: "active" });
      toast({
        title: "Agency created",
        description: created?.temporaryPassword
          ? `Owner login created. Temporary password: ${created.temporaryPassword}`
          : "The agency has been created and is ready to use.",
      });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiRequest("PATCH", `/api/admin/tenants/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setEditTenant(null);
      toast({ title: "Agency updated", description: "Changes saved successfully." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/tenants/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setDeleteTenantId(null);
      toast({ title: "Agency deleted", description: "The agency has been removed from the platform." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const quickStatus = (id: string, status: string) => {
    updateMutation.mutate({ id, data: { status } });
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.contactEmail ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    const matchesPlan = planFilter === "all" || normalizeAgencyPlan(t.plan) === planFilter;
    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Agencies</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage all travel agency accounts on the platform.</p>
          </div>
          <Button className="gap-2" onClick={() => setIsCreateOpen(true)} data-testid="button-add-tenant">
            <Plus className="w-4 h-4" />
            Add Agency
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Total", value: tenants.length, color: "text-foreground", bg: "bg-muted/50" },
            { label: "Active", value: tenants.filter(t => t.status === "active").length, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
            { label: "Pending", value: tenants.filter(t => t.status === "pending").length, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/20" },
            { label: "Suspended", value: tenants.filter(t => t.status === "suspended").length, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className={`p-4 ${s.bg} rounded-xl`}>
                <p className={`text-2xl font-bold ${s.color}`}>{isLoading ? "—" : s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label} Agencies</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name, email, slug…" className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} data-testid="input-search-tenants" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-status-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="lite">Lite</SelectItem>
              <SelectItem value="go">Go</SelectItem>
              <SelectItem value="power">Power</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agency</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-center">Cases</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map(tenant => (
                    <TableRow key={tenant.id} data-testid={`tenant-row-${tenant.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{tenant.name}</p>
                            <p className="text-xs text-muted-foreground">{tenant.contactEmail ?? tenant.slug}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PLAN_COLORS[tenant.plan] ?? ""}`}>
                          {agencyPlanLabel(tenant.plan)}
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge status={tenant.status} /></TableCell>
                      <TableCell className="text-center">{tenant.userCount ?? 0}</TableCell>
                      <TableCell className="text-center">{tenant.caseCount ?? 0}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {tenant.createdAt ? formatDistanceToNow(new Date(tenant.createdAt), { addSuffix: true }) : "—"}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-tenant-actions-${tenant.id}`}>
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditTenant({ ...tenant, plan: normalizeAgencyPlan(tenant.plan) })}>
                              <Edit2 className="w-4 h-4 mr-2" />Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {tenant.status === "active" ? (
                              <DropdownMenuItem onClick={() => quickStatus(tenant.id, "suspended")} className="text-amber-600">
                                <Ban className="w-4 h-4 mr-2" />Suspend
                              </DropdownMenuItem>
                            ) : tenant.status === "suspended" ? (
                              <DropdownMenuItem onClick={() => quickStatus(tenant.id, "active")} className="text-emerald-600">
                                <CheckCircle2 className="w-4 h-4 mr-2" />Reactivate
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => quickStatus(tenant.id, "active")} className="text-emerald-600">
                                <CheckCircle2 className="w-4 h-4 mr-2" />Approve
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteTenantId(tenant.id)} className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredTenants.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                        No agencies found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Agency</DialogTitle>
            <DialogDescription>Create a new travel agency account on the platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Agency Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Global Travel Solutions" data-testid="input-tenant-name" />
            </div>
            <div className="space-y-1.5">
              <Label>Admin Email</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="admin@agency.com" data-testid="input-tenant-email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={v => setForm({ ...form, plan: v })}>
                  <SelectTrigger data-testid="select-tenant-plan"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lite">Lite</SelectItem>
                    <SelectItem value="go">Go</SelectItem>
                    <SelectItem value="power">Power</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate(form)}
              disabled={!form.name || createMutation.isPending}
              data-testid="button-submit-tenant"
            >
              {createMutation.isPending ? "Creating…" : "Create Agency"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTenant} onOpenChange={() => setEditTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Agency</DialogTitle>
            <DialogDescription>Update details for {editTenant?.name}.</DialogDescription>
          </DialogHeader>
          {editTenant && (
            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label>Agency Name</Label>
                <Input value={editTenant.name} onChange={e => setEditTenant({ ...editTenant, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Contact Email</Label>
                <Input value={editTenant.contactEmail ?? ""} onChange={e => setEditTenant({ ...editTenant, contactEmail: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Plan</Label>
                  <Select value={editTenant.plan} onValueChange={v => setEditTenant({ ...editTenant, plan: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lite">Lite</SelectItem>
                      <SelectItem value="go">Go</SelectItem>
                      <SelectItem value="power">Power</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={editTenant.status} onValueChange={v => setEditTenant({ ...editTenant, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setEditTenant(null)}>Cancel</Button>
            <Button
              onClick={() => updateMutation.mutate({ id: editTenant.id, data: { name: editTenant.name, contactEmail: editTenant.contactEmail, plan: editTenant.plan, status: editTenant.status } })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTenantId} onOpenChange={() => setDeleteTenantId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agency</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the agency and all its data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => deleteTenantId && deleteMutation.mutate(deleteTenantId)}
            >
              Delete Agency
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

function normalizeAgencyPlan(plan?: string | null) {
  if (plan === "starter") return "lite";
  if (plan === "professional") return "go";
  if (plan === "enterprise") return "power";
  if (plan === "go" || plan === "power") return plan;
  return "lite";
}

function agencyPlanLabel(plan?: string | null) {
  const normalized = normalizeAgencyPlan(plan);
  if (normalized === "go") return "Go";
  if (normalized === "power") return "Power";
  return "Lite";
}
