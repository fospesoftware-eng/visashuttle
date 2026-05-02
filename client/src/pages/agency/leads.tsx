import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search, MoreVertical, Mail, Phone, Loader2, AlertCircle, Briefcase, GripVertical, MapPin } from "lucide-react";
import { getCountryVisaConfig } from "@/data/country-visa-types";
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

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  source: "",
  destinationCountry: "",
  visaType: "",
  notes: "",
};

const GENERIC_VISA_TYPES = [
  "Tourist Visa", "Business Visa", "Student Visa", "Work Visa",
  "Visit Visa", "Transit Visa", "Investor Visa", "Family Visa",
  "Conference / Event Visa", "Medical Visa",
];

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

const COUNTRIES_LIST = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda",
  "Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize",
  "Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil",
  "Brunei","Bulgaria","Burkina Faso","Burundi",
  "Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad",
  "Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba",
  "Cyprus","Czech Republic",
  "Democratic Republic of Congo","Denmark","Djibouti","Dominica","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia",
  "Eswatini","Ethiopia",
  "Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala",
  "Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein",
  "Lithuania","Luxembourg",
  "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta",
  "Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia",
  "Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
  "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger",
  "Nigeria","North Korea","North Macedonia","Norway",
  "Oman",
  "Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru",
  "Philippines","Poland","Portugal",
  "Qatar",
  "Romania","Russia","Rwanda",
  "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines",
  "Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal",
  "Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia",
  "Solomon Islands","Somalia","South Africa","South Korea","South Sudan",
  "Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
  "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga",
  "Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
  "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States",
  "Uruguay","Uzbekistan",
  "Vanuatu","Vatican City","Venezuela","Vietnam",
  "Yemen",
  "Zambia","Zimbabwe",
];

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
      {(lead.destinationCountry || lead.visaType) && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 rounded px-1.5 py-1">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">
            {[lead.destinationCountry, lead.visaType].filter(Boolean).join(" · ")}
          </span>
        </div>
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

  // "Convert to Case" now routes through the New Case wizard so the agent can
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
      updateMutation.mutate({ id: editLead.id, data: form });
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
      destinationCountry: lead.destinationCountry ?? "",
      visaType: lead.visaType ?? "",
      notes: lead.notes ?? "",
    });
  };

  const openConvert = (lead: Lead) => {
    setConvertLead(lead);
    // Prefill from lead's known interest if any
    setConvertForm({
      visaType: lead.visaType ?? "",
      destinationCountry: lead.destinationCountry ?? "",
      priority: "normal",
    });
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
                    <Label>Destination Country</Label>
                    <Select
                      value={form.destinationCountry}
                      onValueChange={(v) => setForm({ ...form, destinationCountry: v, visaType: "" })}
                    >
                      <SelectTrigger data-testid="select-lead-destination">
                        <SelectValue placeholder="Where do they want to travel?" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {COUNTRIES_LIST.map((c) => {
                          const conf = getCountryVisaConfig(c);
                          return (
                            <SelectItem key={c} value={c}>
                              {conf?.flag ? `${conf.flag} ${c}` : c}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>
                      Visa Type
                      {!form.destinationCountry && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">(select a country first)</span>
                      )}
                    </Label>
                    <Select
                      value={form.visaType}
                      onValueChange={(v) => setForm({ ...form, visaType: v })}
                      disabled={!form.destinationCountry}
                    >
                      <SelectTrigger data-testid="select-lead-visa-type">
                        <SelectValue placeholder={form.destinationCountry ? "Select visa type" : "Pick a country to see visa types"} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {getVisaTypesForCountry(form.destinationCountry).map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
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
              Continue to the New Case wizard for <span className="font-medium">{convertLead?.name}</span> ({convertLead?.email}). Email + mobile + destination will be pre-filled on the first step. The lead is marked as won once the case is saved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-xs text-muted-foreground">
              These fields are optional pre-fills — you can leave them blank and pick them inside the wizard.
              The lead's email + mobile are always passed through automatically.
            </p>
            <div className="space-y-2">
              <Label>Visa Type</Label>
              <Select value={convertForm.visaType} onValueChange={(v) => setConvertForm({ ...convertForm, visaType: v })}>
                <SelectTrigger data-testid="select-convert-visa-type">
                  <SelectValue placeholder="Optional — pick later in the wizard" />
                </SelectTrigger>
                <SelectContent>
                  {VISA_TYPES_LEAD.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destination Country</Label>
              <Select value={convertForm.destinationCountry} onValueChange={(v) => setConvertForm({ ...convertForm, destinationCountry: v })}>
                <SelectTrigger data-testid="select-convert-destination">
                  <SelectValue placeholder="Optional — pick later in the wizard" />
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
