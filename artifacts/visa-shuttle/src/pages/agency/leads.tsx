import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search, MoreVertical, Mail, Phone, Loader2, AlertCircle, Briefcase, GripVertical, MapPin, UserCog, User, Globe2, StickyNote, UserPlus, ClipboardList } from "lucide-react";
import { getCountryVisaConfig } from "@/data/country-visa-types";
import { Combobox, type ComboboxOption } from "@/components/combobox";
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
import { PhoneInput, defaultPhoneCodeFrom } from "@/components/phone-input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Lead } from "@workspace/db";

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

// Country options for the searchable destination picker — built once at module
// scope from the global master list, with flag emojis from the per-country
// wizard config when available. Keeps both the new-lead form and the convert
// dialog in sync without re-allocating on every render.
const countryOptions: ComboboxOption[] = COUNTRIES_LIST.map((c) => {
  const conf = getCountryVisaConfig(c);
  return { value: c, label: c, prefix: conf?.flag };
});

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  source: "",
  destinationCountry: "",
  visaType: "",
  notes: "",
  // Every lead must be owned by a team member; the form auto-fills this with
  // the currently signed-in user when the dialog opens, but the agency owner
  // can pick any other team member from the dropdown.
  assignedTo: "",
};

// Minimal staff shape we render in the assignee dropdown / card.
type StaffMember = { id: string; name: string; role: string };

import { COUNTRIES as COUNTRIES_LIST, VISA_TYPES as GENERIC_VISA_TYPES } from "@/shared/destinations";

function getVisaTypesForCountry(country: string): string[] {
  if (!country) return [];
  const conf = getCountryVisaConfig(country);
  if (!conf) return GENERIC_VISA_TYPES;
  const all = new Set<string>();
  for (const cat of Object.values(conf.categories)) {
    for (const t of cat.types) all.add(t);
  }
  return Array.from(all);
}

function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `VS-${year}-${rand}`;
}


interface LeadCardContentProps {
  lead: Lead;
  dragHandleProps?: Record<string, any>;
  onEdit: (lead: Lead) => void;
  onCreateCustomer: (lead: Lead) => void;
  onConvert: (lead: Lead) => void;
  onConvertProposal: (lead: Lead) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, stage: string) => void;
  onReassign?: (id: string, userId: string) => void;
  currentStage: string;
  staff?: StaffMember[];
  assigneeName?: string | null;
}

function LeadCardBody({ lead, dragHandleProps, onEdit, onCreateCustomer, onConvert, onConvertProposal, onDelete, onMove, onReassign, currentStage, staff = [], assigneeName }: LeadCardContentProps) {
  return (
    <div className="group relative overflow-visible rounded-xl border border-border/60 bg-background p-3 shadow-sm transition-all hover:border-primary/25 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            className="grid h-7 w-5 shrink-0 cursor-grab place-items-center rounded-md text-muted-foreground/45 transition-colors hover:bg-muted hover:text-muted-foreground active:cursor-grabbing"
            aria-label={`Drag ${lead.name}`}
            {...dragHandleProps}
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
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
              className="h-8 w-8 shrink-0 rounded-full opacity-100 sm:opacity-70 sm:transition-opacity sm:group-hover:opacity-100"
              data-testid={`button-lead-actions-${lead.id}`}
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[90] w-52">
            <DropdownMenuItem onClick={() => onEdit(lead)} data-testid={`button-edit-lead-${lead.id}`}>
              Edit Lead
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onCreateCustomer(lead)}
              data-testid={`button-create-customer-lead-${lead.id}`}
            >
              <UserPlus className="w-3.5 h-3.5 mr-2" />
              Create Customer
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onConvert(lead)}
              data-testid={`button-convert-lead-${lead.id}`}
            >
              <Briefcase className="w-3.5 h-3.5 mr-2" />
              Convert to Application
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onConvertProposal(lead)}
              data-testid={`button-convert-proposal-lead-${lead.id}`}
            >
              <ClipboardList className="w-3.5 h-3.5 mr-2" />
              Convert to Proposal
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <p className="text-xs text-muted-foreground px-2 py-1">Move to stage</p>
            {stages.filter((s) => s !== currentStage).map((s) => (
              <DropdownMenuItem key={s} className="capitalize" onClick={() => onMove(lead.id, s)}>
                → {s.replace("_", " ")}
              </DropdownMenuItem>
            ))}
            {onReassign && staff.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <p className="text-xs text-muted-foreground px-2 py-1">Reassign to</p>
                {staff.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => onReassign(lead.id, s.id)}
                    disabled={s.id === lead.assignedTo}
                    data-testid={`button-reassign-lead-${lead.id}-${s.id}`}
                  >
                    <UserCog className="w-3.5 h-3.5 mr-2" />
                    {s.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(lead.id)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="text-xs text-muted-foreground flex items-center gap-1 truncate rounded-md bg-muted/30 px-2 py-1">
        <Mail className="w-3 h-3 shrink-0" />
        <span className="truncate">{lead.email}</span>
      </div>
      {lead.phone && (
        <div className="text-xs text-muted-foreground flex items-center gap-1 rounded-md bg-muted/30 px-2 py-1">
          <Phone className="w-3 h-3 shrink-0" />
          {lead.phone}
        </div>
      )}
      {(lead.destinationCountry || lead.visaType) && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded px-1.5 py-1">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {[lead.destinationCountry, lead.visaType].filter(Boolean).join(" · ")}
          </span>
        </div>
      )}
      {/* Owning team member — shown on every card so the agency can see at a
          glance who is responsible for following up on this lead. */}
      {assigneeName && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
          <UserCog className="w-3 h-3 shrink-0" />
          <span className="truncate">Owner: {assigneeName}</span>
        </div>
      )}
    </div>
  );
}

function DraggableLead({
  lead,
  children,
}: {
  lead: Lead;
  children: (dragHandleProps: Record<string, any>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `lead:${lead.id}`,
    data: { leadId: lead.id, stage: lead.stage },
  });
  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 50 } : undefined}
      className={isDragging ? "opacity-30" : ""}
    >
      {children({ ...attributes, ...(listeners ?? {}) })}
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
  const currentUserId = authData?.user?.id;
  const agencyPhoneCode = defaultPhoneCodeFrom((authData?.tenant as any)?.baseCountry ?? (authData?.tenant as any)?.country ?? (authData?.tenant as any)?.contactPhone);
  const [convertForm, setConvertForm] = useState({ visaType: "", destinationCountry: "", priority: "normal" });

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editLead, setEditLead] = useState<Lead | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [convertLead, setConvertLead] = useState<Lead | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeDragLead, setActiveDragLead] = useState<Lead | null>(null);
  const [stageFilter, setStageFilter] = useState<"all" | string>("all");

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

  // Team members for the assignee dropdowns. Filtered to actual agency staff
  // (owner / manager / staff) — we never want to show customers in here.
  const { data: staffRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/tenants", tenantId, "staff"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/staff`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenantId,
  });
  const staff: StaffMember[] = useMemo(
    () => {
      const team = staffRaw
      .filter((u: any) => ["agency_owner", "agency_manager", "agency_staff"].includes(u.role))
      .map((u: any) => ({ id: u.id, name: u.name, role: u.role }));
      const me = authData?.user;
      if (me?.id && !team.some((u) => u.id === me.id)) {
        team.unshift({ id: me.id, name: me.name || me.email || "You", role: me.role });
      }
      return team;
    },
    [staffRaw, authData?.user?.id, authData?.user?.name, authData?.user?.email, authData?.user?.role],
  );
  const effectiveLeadAssignee = form.assignedTo || currentUserId || "";
  // Look up an assignee's display name by id. Falls back to "Unassigned"
  // (which should never happen for newly-created leads now that the API
  // requires it, but old rows may still have a null assignee).
  const assigneeNameById = (id: string | null | undefined): string | null => {
    if (!id) return null;
    return staff.find((s) => s.id === id)?.name ?? "Unknown";
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const res = await apiRequest("POST", `/api/tenants/${tenantId}/leads`, data);
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

  const createCustomerMutation = useMutation({
    mutationFn: async (lead: Lead) => {
      const res = await apiRequest("POST", `/api/tenants/${tenantId}/customers`, {
        name: lead.name,
        email: lead.email,
        phone: lead.phone || null,
      });
      return res.json();
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "customers"] });
      toast({ title: "Customer created", description: "Lead details are now saved in this agency customer database." });
      setLocation(`/app/customers/${customer.id}`);
    },
    onError: (e: Error) => toast({ title: "Could not create customer", description: e.message, variant: "destructive" }),
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

  // "Convert to Application" now routes through the New Case wizard so the agent can
  // review/edit the lead's email + mobile (and add passport/travel/fees) before
  // a case is actually created. The wizard reads `?leadId=` to pre-fill the
  // first step and PATCHes the lead to stage="won" after a successful save.
  const convertMutation = useMutation({
    mutationFn: async () => {
      if (!convertLead || !tenantId) throw new Error("Lead not selected");
      // We don't strictly need visa/destination here because the wizard will
      // collect them, but we still pass them via the URL so step-1 can seed
      // them directly when the user already chose them in the modal.
      return convertLead;
    },
    onSuccess: (lead) => {
      const params = new URLSearchParams({ leadId: lead.id });
      if (convertForm.visaType) params.set("visaType", convertForm.visaType);
      if (convertForm.destinationCountry) params.set("destinationCountry", convertForm.destinationCountry);
      if (convertForm.priority) params.set("priority", convertForm.priority);
      setConvertLead(null);
      setConvertForm({ visaType: "", destinationCountry: "", priority: "normal" });
      setLocation(`/app/cases/new?${params.toString()}`);
    },
    onError: (e: Error) => toast({ title: "Could not convert", description: e.message, variant: "destructive" }),
  });

  const searchFilteredLeads = leads.filter((lead) =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredLeads = stageFilter === "all"
    ? searchFilteredLeads
    : searchFilteredLeads.filter((lead) => lead.stage === stageFilter);
  const visibleStages = stageFilter === "all" ? stages : [stageFilter];

  const getLeadsByStage = (stage: string) => filteredLeads.filter((lead) => lead.stage === stage);
  const getStageCount = (stage: string) => searchFilteredLeads.filter((lead) => lead.stage === stage).length;

  const handleSubmit = () => {
    if (!form.name || !form.email) {
      toast({ title: "Required fields", description: "Name and email are required.", variant: "destructive" });
      return;
    }
    if (!effectiveLeadAssignee) {
      toast({ title: "Assignee required", description: "Pick a team member who'll own this lead.", variant: "destructive" });
      return;
    }
    const payload = { ...form, assignedTo: effectiveLeadAssignee };
    if (editLead) {
      updateMutation.mutate({ id: editLead.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEdit = (lead: Lead) => {
    setEditLead(lead);
    setForm({
      name: lead.name,
      email: lead.email,
      phone: lead.phone ?? "",
      source: lead.source ?? "",
      destinationCountry: lead.destinationCountry ?? "",
      visaType: lead.visaType ?? "",
      notes: lead.notes ?? "",
      assignedTo: lead.assignedTo ?? "",
    });
  };

  // When the Add Lead dialog opens, default the assignee to the current user
  // unless they've already picked someone else manually. We only seed once
  // per "open" so the user can clear it afterwards.
  useEffect(() => {
    if (!isAddOpen || editLead) return;
    if (form.assignedTo) return;
    if (!currentUserId) return;
    setForm((prev) => ({ ...prev, assignedTo: currentUserId }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAddOpen, editLead, currentUserId]);

  const openConvert = (lead: Lead) => {
    setConvertLead(lead);
    // Prefill from lead's known interest if any
    setConvertForm({
      visaType: lead.visaType ?? "",
      destinationCountry: lead.destinationCountry ?? "",
      priority: "normal",
    });
  };

  const convertToProposal = (lead: Lead) => {
    const params = new URLSearchParams({ leadId: lead.id });
    if (lead.destinationCountry) params.set("destinationCountry", lead.destinationCountry);
    if (lead.visaType) params.set("visaType", lead.visaType);
    setLocation(`/app/proposals?${params.toString()}`);
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

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Leads Pipeline</h1>
            <p className="text-muted-foreground">Use the handle on each card to move leads through your pipeline.</p>
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
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
              <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle className="text-xl">{editLead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
                <DialogDescription>
                  {editLead ? "Update this lead's contact and application details." : "Capture a new lead and assign it to a team member."}
                </DialogDescription>
              </DialogHeader>

              <div className="px-6 py-5 space-y-6">
                {/* --- Section: Contact --- */}
                <section className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <User className="w-3.5 h-3.5" />
                    Contact
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lead-name">Name <span className="text-red-500">*</span></Label>
                    <Input id="lead-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name" data-testid="input-lead-name" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="lead-email">Email <span className="text-red-500">*</span></Label>
                      <Input id="lead-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" data-testid="input-lead-email" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lead-phone">Phone</Label>
                      <PhoneInput
                        value={form.phone}
                        onChange={(phone) => setForm({ ...form, phone })}
                        defaultCountryCode={agencyPhoneCode}
                        testId="input-lead-phone"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Source</Label>
                    <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                      <SelectTrigger data-testid="select-lead-source">
                        <SelectValue placeholder="How did they find you?" />
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
                </section>

                {/* --- Section: Application --- */}
                <section className="space-y-3 pt-1 border-t">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-4">
                    <Globe2 className="w-3.5 h-3.5" />
                    Application
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Destination Country</Label>
                      <Combobox
                        options={countryOptions}
                        value={form.destinationCountry}
                        onChange={(v) => setForm({ ...form, destinationCountry: v, visaType: "" })}
                        placeholder="Where to?"
                        searchPlaceholder="Type a country..."
                        testId="select-lead-destination"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Visa Type
                        {!form.destinationCountry && (
                          <span className="ml-1 text-xs text-muted-foreground font-normal">(country first)</span>
                        )}
                      </Label>
                      <Select
                        value={form.visaType}
                        onValueChange={(v) => setForm({ ...form, visaType: v })}
                        disabled={!form.destinationCountry}
                      >
                        <SelectTrigger data-testid="select-lead-visa-type">
                          <SelectValue placeholder={form.destinationCountry ? "Select visa type" : "Pick country first"} />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {getVisaTypesForCountry(form.destinationCountry).map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </section>

                {/* --- Section: Assignment & Notes --- */}
                <section className="space-y-3 pt-1 border-t">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground pt-4">
                    <StickyNote className="w-3.5 h-3.5" />
                    Assignment &amp; Notes
                  </div>
                  <div className="space-y-2">
                    <Label>Assigned Team Member <span className="text-red-500">*</span></Label>
                    <Select
                      value={effectiveLeadAssignee}
                      onValueChange={(v) => setForm({ ...form, assignedTo: v })}
                    >
                      <SelectTrigger data-testid="select-lead-assignee">
                        <SelectValue placeholder="Select a team member" />
                      </SelectTrigger>
                      <SelectContent>
                        {staff.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}{s.id === currentUserId ? " (you)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">Defaults to you — pick another team member to hand it off.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Any context about this lead — preferred contact time, intent, budget..."
                      rows={3}
                      data-testid="input-lead-notes"
                    />
                  </div>
                </section>
              </div>

              <div className="px-6 py-4 border-t bg-muted/30 flex items-center justify-end gap-2 sticky bottom-0">
                <Button
                  variant="outline"
                  onClick={() => { setIsAddOpen(false); setEditLead(null); setForm(emptyForm); }}
                  data-testid="button-cancel-lead"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-lead"
                  className="gap-2"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editLead ? "Save Changes" : "Add Lead"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary bar */}
        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
          <button
            type="button"
            onClick={() => setStageFilter("all")}
            className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5 ${
              stageFilter === "all" ? "border-primary bg-primary/10 ring-2 ring-primary/10" : "bg-background"
            }`}
            data-testid="button-lead-status-all"
          >
            <span className="text-muted-foreground">Total leads:</span>
            <span className="font-semibold">{searchFilteredLeads.length}</span>
          </button>
          {stages.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStageFilter(s)}
              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5 ${
                stageFilter === s ? "border-primary bg-primary/10 ring-2 ring-primary/10" : "bg-background"
              }`}
              data-testid={`button-lead-status-${s}`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${STAGE_DOT[s]}`} />
                <span className="truncate capitalize text-muted-foreground">{s.replace("_", " ")}</span>
              </span>
              <span className="font-medium">{getStageCount(s)}</span>
            </button>
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
            <div className="-mx-2 overflow-x-auto px-2 pb-4">
              {stageFilter !== "all" && (
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Showing <span className="font-semibold capitalize text-foreground">{stageFilter.replace("_", " ")}</span> leads
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setStageFilter("all")}>
                    Show all statuses
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:min-w-max">
                {visibleStages.map((stage) => (
                  <DroppableStage key={stage} stage={stage} className="overflow-visible lg:w-[304px] lg:flex-none">
                    <Card className={`${STAGE_COLORS[stage]} h-full overflow-visible border border-border/50 shadow-sm`} data-testid={`column-${stage}`}>
                      <CardHeader className="pb-3 pt-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${STAGE_DOT[stage]}`} />
                          <CardTitle className="text-sm font-semibold capitalize">
                            {stage.replace("_", " ")}
                          </CardTitle>
                          <span className="ml-auto rounded-full bg-background/80 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                            {getLeadsByStage(stage).length}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 px-3 pb-4 min-h-[180px] overflow-visible">
                        {getLeadsByStage(stage).length === 0 ? (
                          <div className="rounded-xl border border-dashed bg-background/45 py-8 text-center text-xs text-muted-foreground">
                            Drop leads here
                          </div>
                        ) : (
                          getLeadsByStage(stage).map((lead) => (
                            <DraggableLead key={lead.id} lead={lead}>
                              {(dragHandleProps) => (
                                <LeadCardBody
                                  lead={lead}
                                  dragHandleProps={dragHandleProps}
                                  onEdit={openEdit}
                                  onCreateCustomer={(l) => createCustomerMutation.mutate(l)}
                                  onConvert={openConvert}
                                  onConvertProposal={convertToProposal}
                                  onDelete={(id) => setDeleteLeadId(id)}
                                  onMove={(id, s) => moveStageMutation.mutate({ id, stage: s })}
                                  onReassign={(id, userId) => updateMutation.mutate({ id, data: { assignedTo: userId } as Partial<Lead> })}
                                  currentStage={stage}
                                  staff={staff}
                                  assigneeName={assigneeNameById(lead.assignedTo)}
                                />
                              )}
                            </DraggableLead>
                          ))
                        )}
                      </CardContent>
                    </Card>
                  </DroppableStage>
                ))}
              </div>
            </div>
            <DragOverlay dropAnimation={null}>
              {activeDragLead ? (
                <div className="rotate-2 shadow-2xl w-[260px]">
                  <LeadCardBody
                    lead={activeDragLead}
                    onEdit={() => {}}
                    onCreateCustomer={() => {}}
                    onConvert={() => {}}
                    onConvertProposal={() => {}}
                    onDelete={() => {}}
                    onMove={() => {}}
                    currentStage={activeDragLead.stage}
                    staff={staff}
                    assigneeName={assigneeNameById(activeDragLead.assignedTo)}
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
        {!isLoading && leads.length > 0 && filteredLeads.length === 0 && (
          <EmptyState
            icon={Search}
            title="No leads match this status"
            description="Try another status or clear your search."
            actionLabel="Show All Statuses"
            onAction={() => setStageFilter("all")}
          />
        )}
      </div>

      {/* Convert to application dialog */}
      <Dialog open={!!convertLead} onOpenChange={(open) => !open && setConvertLead(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Lead to Application</DialogTitle>
            <DialogDescription>
              Continue to the New Case wizard for <span className="font-medium">{convertLead?.name}</span> ({convertLead?.email}). Email + mobile + destination will be pre-filled on the first step. The lead is marked as won once the case is saved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              These fields are optional pre-fills — you can leave them blank and pick them inside the wizard.
              The lead's email + mobile are always passed through automatically.
            </p>
            {/* Destination country + visa type live side-by-side as a single
                application "where + what" pair — kept consistent with the new
                lead form and the proposal create dialog. */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Destination Country</Label>
                <Combobox
                  options={countryOptions}
                  value={convertForm.destinationCountry}
                  onChange={(v) => setConvertForm({ ...convertForm, destinationCountry: v, visaType: "" })}
                  placeholder="Optional — pick later"
                  searchPlaceholder="Type a country..."
                  testId="select-convert-destination"
                />
              </div>
              <div className="space-y-2">
                <Label>Visa Type</Label>
                <Select
                  value={convertForm.visaType}
                  onValueChange={(v) => setConvertForm({ ...convertForm, visaType: v })}
                  disabled={!convertForm.destinationCountry}
                >
                  <SelectTrigger data-testid="select-convert-visa-type">
                    <SelectValue placeholder={convertForm.destinationCountry ? "Optional — pick later" : "Pick country first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {convertForm.destinationCountry &&
                      getVisaTypesForCountry(convertForm.destinationCountry).map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
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
              disabled={convertMutation.isPending}
              data-testid="button-confirm-convert"
            >
              {convertMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
              Continue in New Case wizard
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
