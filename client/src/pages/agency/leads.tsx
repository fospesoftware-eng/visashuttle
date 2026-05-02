import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search, MoreVertical, Mail, Phone, Loader2, AlertCircle, Briefcase, GripVertical } from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
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

function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `VS-${year}-${rand}`;
}

const VISA_TYPES_LEAD = [
  "Tourist Visa", "Business Visa", "Student Visa", "Work Visa",
  "Transit Visa", "Family Visa", "Schengen Visa", "Investor Visa",
];

const COUNTRIES_LEAD = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Spain", "Italy", "Netherlands", "Switzerland",
  "Japan", "South Korea", "Singapore", "United Arab Emirates", "Turkey",
  "Schengen Area", "Other",
];

interface LeadCardContentProps {
  lead: Lead;
  onEdit: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, stage: string) => void;
  currentStage: string;
}

function LeadCardBody({ lead, onEdit, onConvert, onDelete, onMove, currentStage }: LeadCardContentProps) {
  return (
    <div className="p-3 rounded-xl bg-background/95 shadow-sm hover-elevate cursor-grab active:cursor-grabbing space-y-2 border border-border/40 select-none">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {lead.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{lead.name}</p>
            {lead.source && <p className="text-xs text-muted-foreground capitalize">{lead.source.replace("_", " ")}</p>}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onPointerDown={(e) => e.stopPropagation()}
              data-testid={`button-lead-actions-${lead.id}`}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onEdit(lead)} data-testid={`button-edit-lead-${lead.id}`}>
              Edit Lead
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onConvert(lead)}
              data-testid={`button-convert-lead-${lead.id}`}
            >
              <Briefcase className="w-3.5 h-3.5 mr-2" />
              Convert to Case
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <p className="text-xs text-muted-foreground px-2 py-1">Move to stage</p>
            {stages.filter((s) => s !== currentStage).map((s) => (
              <DropdownMenuItem key={s} className="capitalize" onClick={() => onMove(lead.id, s)}>
                → {s.replace("_", " ")}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(lead.id)}>
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
  );
}

function DraggableLead({ lead, children }: { lead: Lead; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lead:${lead.id}`,
    data: { leadId: lead.id, stage: lead.stage },
  });
  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined}
      className={isDragging ? "opacity-30" : ""}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

function DroppableStage({
  stage,
  children,
  className,
}: {
  stage: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage:${stage}` });
  return (
    <div
      ref={setNodeRef}
      className={`${className ?? ""} ${isOver ? "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-xl" : ""} transition-all`}
      data-testid={`droppable-${stage}`}
    >
      {children}
    </div>
  );
}

export default function LeadsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { data: authData } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;
  const [convertForm, setConvertForm] = useState({ visaType: "", destinationCountry: "", priority: "normal" });

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeDragLead, setActiveDragLead] = useState<Lead | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

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
    // Optimistic update for snappy drag/drop
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/tenants", tenantId, "leads"] });
      const previous = queryClient.getQueryData<Lead[]>(["/api/tenants", tenantId, "leads"]);
      if (previous) {
        queryClient.setQueryData<Lead[]>(
          ["/api/tenants", tenantId, "leads"],
          previous.map((l) => (l.id === id ? { ...l, stage } : l))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/tenants", tenantId, "leads"], context.previous);
      }
      toast({ title: "Could not move lead", variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "leads"] });
    },
  });

  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!convertLead || !tenantId) throw new Error("Lead not selected");
      if (!convertForm.visaType || !convertForm.destinationCountry) {
        throw new Error("Visa type and destination are required");
      }
      const res = await apiRequest("POST", `/api/tenants/${tenantId}/cases`, {
        applicantName: convertLead.name,
        visaType: convertForm.visaType,
        destinationCountry: convertForm.destinationCountry,
        priority: convertForm.priority,
        status: "pending",
        caseNumber: generateCaseNumber(),
        notes: `Converted from lead: ${convertLead.email}${convertLead.phone ? ` · ${convertLead.phone}` : ""}${convertLead.notes ? `\n\nLead notes: ${convertLead.notes}` : ""}`,
      });
      const created = await res.json();
      await apiRequest("PATCH", `/api/leads/${convertLead.id}`, { stage: "won" });
      return created;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "leads"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "cases"] });
      setConvertLead(null);
      setConvertForm({ visaType: "", destinationCountry: "", priority: "normal" });
      toast({ title: "Lead converted", description: `Case ${created.caseNumber} created and lead marked as won.` });
      setLocation(`/app/cases/${created.id}`);
    },
    onError: (e: Error) => toast({ title: "Could not convert", description: e.message, variant: "destructive" }),
  });

  const filteredLeads = leads.filter((lead) =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLeadsByStage = (stage: string) => filteredLeads.filter((lead) => lead.stage === stage);

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

  const openConvert = (lead: Lead) => {
    setConvertLead(lead);
    setConvertForm({ visaType: "", destinationCountry: "", priority: "normal" });
  };

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id).replace("lead:", "");
    const lead = leads.find((l) => l.id === id);
    if (lead) setActiveDragLead(lead);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragLead(null);
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);
    if (!overId.startsWith("stage:")) return;
    const newStage = overId.replace("stage:", "");
    const fromStage = (active.data.current as any)?.stage;
    if (newStage === fromStage) return;
    const leadId = String(active.id).replace("lead:", "");
    moveStageMutation.mutate({ id: leadId, stage: newStage });
  };

  const totalValue = leads.filter((l) => l.stage === "won").reduce((sum, l) => sum + (l.value ?? 0), 0);

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Leads Pipeline</h1>
            <p className="text-muted-foreground">Drag cards between columns to move leads through your pipeline.</p>
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
          {stages.map((s) => (
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
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveDragLead(null)}>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {stages.map((stage) => (
                <DroppableStage key={stage} stage={stage} className="min-w-[260px]">
                  <Card className={`${STAGE_COLORS[stage]} border-0 h-full`} data-testid={`column-${stage}`}>
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
                    <CardContent className="space-y-2 px-3 pb-4 min-h-[140px]">
                      {getLeadsByStage(stage).length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">Drop leads here</p>
                      ) : (
                        getLeadsByStage(stage).map((lead) => (
                          <DraggableLead key={lead.id} lead={lead}>
                            <LeadCardBody
                              lead={lead}
                              onEdit={openEdit}
                              onConvert={openConvert}
                              onDelete={(id) => setDeleteLeadId(id)}
                              onMove={(id, s) => moveStageMutation.mutate({ id, stage: s })}
                              currentStage={stage}
                            />
                          </DraggableLead>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </DroppableStage>
              ))}
            </div>
            <DragOverlay dropAnimation={null}>
              {activeDragLead ? (
                <div className="rotate-2 shadow-2xl w-[260px]">
                  <LeadCardBody
                    lead={activeDragLead}
                    onEdit={() => {}}
                    onConvert={() => {}}
                    onDelete={() => {}}
                    onMove={() => {}}
                    currentStage={activeDragLead.stage}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {!isLoading && leads.length === 0 && (
          <EmptyState
            icon={AlertCircle}
            title="No leads yet"
            description="Start adding leads to track your sales pipeline."
            actionLabel="Add First Lead"
            onAction={() => setIsAddOpen(true)}
          />
        )}
      </div>

      {/* Convert to case dialog */}
      <Dialog open={!!convertLead} onOpenChange={(open) => !open && setConvertLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Lead to Case</DialogTitle>
            <DialogDescription>
              Create a new visa application case for <span className="font-medium">{convertLead?.name}</span> ({convertLead?.email}). The lead will be marked as won.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Visa Type *</Label>
              <Select value={convertForm.visaType} onValueChange={(v) => setConvertForm({ ...convertForm, visaType: v })}>
                <SelectTrigger data-testid="select-convert-visa-type">
                  <SelectValue placeholder="Select visa type" />
                </SelectTrigger>
                <SelectContent>
                  {VISA_TYPES_LEAD.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destination Country *</Label>
              <Select value={convertForm.destinationCountry} onValueChange={(v) => setConvertForm({ ...convertForm, destinationCountry: v })}>
                <SelectTrigger data-testid="select-convert-destination">
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES_LEAD.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={convertForm.priority} onValueChange={(v) => setConvertForm({ ...convertForm, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => convertMutation.mutate()}
              disabled={convertMutation.isPending || !convertForm.visaType || !convertForm.destinationCountry}
              data-testid="button-confirm-convert"
            >
              {convertMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
              Create Case from Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
