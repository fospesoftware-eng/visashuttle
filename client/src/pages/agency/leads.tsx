import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Filter, MoreVertical, Mail, Phone, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { EmptyState } from "@/components/empty-state";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Lead } from "@shared/schema";

const stages = ["new", "contacted", "qualified", "proposal", "won", "lost"];

const STAGE_COLORS: Record<string, string> = {
  new: "bg-slate-100 dark:bg-slate-800",
  contacted: "bg-blue-50 dark:bg-blue-950/40",
  qualified: "bg-violet-50 dark:bg-violet-950/40",
  proposal: "bg-amber-50 dark:bg-amber-950/40",
  won: "bg-emerald-50 dark:bg-emerald-950/40",
  lost: "bg-red-50 dark:bg-red-950/40",
};

const STAGE_DOT: Record<string, string> = {
  new: "bg-slate-400",
  contacted: "bg-blue-500",
  qualified: "bg-violet-500",
  proposal: "bg-amber-500",
  won: "bg-emerald-500",
  lost: "bg-red-500",
};

const emptyForm = { name: "", email: "", phone: "", source: "", notes: "", value: "" };

export default function LeadsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: authData } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/tenants", tenantId, "leads"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/leads`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const res = await apiRequest("POST", `/api/tenants/${tenantId}/leads`, {
        ...data,
        value: data.value ? parseInt(data.value) : 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "leads"] });
      setIsAddOpen(false);
      setForm(emptyForm);
      toast({ title: "Lead added", description: "New lead has been added to the pipeline." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lead> }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "leads"] });
      setEditLead(null);
      toast({ title: "Lead updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/leads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "leads"] });
      setDeleteLeadId(null);
      toast({ title: "Lead deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const moveStageMutation = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const res = await apiRequest("PATCH", `/api/leads/${id}`, { stage });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "leads"] });
    },
  });

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLeadsByStage = (stage: string) => filteredLeads.filter(lead => lead.stage === stage);

  const handleSubmit = () => {
    if (!form.name || !form.email) {
      toast({ title: "Required fields", description: "Name and email are required.", variant: "destructive" });
      return;
    }
    if (editLead) {
      updateMutation.mutate({ id: editLead.id, data: { ...form, value: form.value ? parseInt(form.value) : 0 } });
    } else {
      createMutation.mutate(form);
    }
  };

  const openEdit = (lead: Lead) => {
    setEditLead(lead);
    setForm({
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? "",
      source: lead.source ?? "",
      notes: lead.notes ?? "",
      value: lead.value ? String(lead.value) : "",
    });
  };

  const totalValue = leads.filter(l => l.stage === "won").reduce((sum, l) => sum + (l.value ?? 0), 0);

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Leads Pipeline</h1>
            <p className="text-muted-foreground">Manage your sales pipeline and convert leads to cases.</p>
          </div>
          <Dialog open={isAddOpen || !!editLead} onOpenChange={(open) => {
            if (!open) { setIsAddOpen(false); setEditLead(null); setForm(emptyForm); }
            else setIsAddOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-lead" onClick={() => { setEditLead(null); setForm(emptyForm); setIsAddOpen(true); }}>
                <Plus className="w-4 h-4" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
                <DialogDescription>Enter the lead's contact information.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Name *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" data-testid="input-lead-name" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Email *</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" data-testid="input-lead-email" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 234 567 8900" data-testid="input-lead-phone" />
                  </div>
                  <div className="space-y-2">
                    <Label>Value ($)</Label>
                    <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="0" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Source</Label>
                    <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                      <SelectTrigger data-testid="select-lead-source">
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="social">Social Media</SelectItem>
                        <SelectItem value="walk_in">Walk-in</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any notes..." data-testid="input-lead-notes" />
                  </div>
                </div>
                <Button
                  onClick={handleSubmit}
                  className="w-full"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-lead"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {editLead ? "Save Changes" : "Add Lead"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary bar */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60">
            <span className="text-muted-foreground">Total leads:</span>
            <span className="font-semibold">{leads.length}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
            <span className="text-muted-foreground">Won value:</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400">${totalValue.toLocaleString()}</span>
          </div>
          {stages.map(s => (
            <div key={s} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/40">
              <span className={`w-2 h-2 rounded-full ${STAGE_DOT[s]}`} />
              <span className="capitalize text-muted-foreground">{s}:</span>
              <span className="font-medium">{getLeadsByStage(s).length}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search leads..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-leads"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {stages.map((stage) => (
              <Card key={stage} className={`min-w-[260px] ${STAGE_COLORS[stage]} border-0`} data-testid={`column-${stage}`}>
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${STAGE_DOT[stage]}`} />
                    <CardTitle className="text-sm font-semibold capitalize">
                      {stage.replace("_", " ")}
                    </CardTitle>
                    <span className="ml-auto text-xs font-medium text-muted-foreground bg-background/70 rounded px-1.5 py-0.5">
                      {getLeadsByStage(stage).length}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-3 pb-4">
                  {getLeadsByStage(stage).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No leads</p>
                  ) : (
                    getLeadsByStage(stage).map((lead) => (
                      <div
                        key={lead.id}
                        className="p-3 rounded-xl bg-background/90 shadow-sm hover-elevate cursor-pointer space-y-2 border border-border/40"
                        data-testid={`lead-card-${lead.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="w-7 h-7 shrink-0">
                              <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                {lead.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{lead.name}</p>
                              {lead.source && <p className="text-xs text-muted-foreground capitalize">{lead.source.replace("_", " ")}</p>}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                <MoreVertical className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openEdit(lead)}>Edit Lead</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <p className="text-xs text-muted-foreground px-2 py-1">Move to stage</p>
                              {stages.filter(s => s !== stage).map(s => (
                                <DropdownMenuItem key={s} className="capitalize" onClick={() => moveStageMutation.mutate({ id: lead.id, stage: s })}>
                                  → {s.replace("_", " ")}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteLeadId(lead.id)}>
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                        {lead.phone && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3 shrink-0" />
                            {lead.phone}
                          </div>
                        )}
                        {(lead.value ?? 0) > 0 && (
                          <p className="text-sm font-semibold text-primary">${(lead.value ?? 0).toLocaleString()}</p>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && leads.length === 0 && (
          <EmptyState
            icon={AlertCircle}
            title="No leads yet"
            description="Start adding leads to track your sales pipeline."
            action={{ label: "Add First Lead", onClick: () => setIsAddOpen(true) }}
          />
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteLeadId} onOpenChange={(open) => !open && setDeleteLeadId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteLeadId && deleteMutation.mutate(deleteLeadId)}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
