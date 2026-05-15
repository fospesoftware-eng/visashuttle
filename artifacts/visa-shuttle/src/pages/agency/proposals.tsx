import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Link as LinkIcon, QrCode, Trash2, Copy, ExternalLink,
  Loader2, Send, ClipboardList, MoreVertical, Search, AlertCircle, X,
} from "lucide-react";
import { useLocation } from "wouter";
import QRCode from "qrcode";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { EmptyState } from "@/components/empty-state";
import { PhoneInput, defaultPhoneCodeFrom } from "@/components/phone-input";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getDocumentChecklist } from "@/data/document-checklists";
import type { Lead, Proposal } from "@workspace/db";
import { COUNTRIES as POPULAR_COUNTRIES, VISA_TYPES as GENERIC_VISA_TYPES } from "@/shared/destinations";
import { getCountryVisaConfig, getCountryVisaTypes } from "@/data/country-visa-types";
import { Combobox, type ComboboxOption } from "@/components/combobox";

const STATUS_STYLES: Record<string, string> = {
  sent: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
  viewed: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  applied: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
  expired: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  revoked: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
};

type StaffMember = { id: string; name: string; role: string };
type CustomerOption = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  caseCount?: number;
  latestPassportNumber?: string | null;
};
type ProposalFeeItem = {
  key: string;
  description: string;
  category: string;
  quantity: string;
  unitPrice: string;
};

const FEE_CATEGORIES = [
  { value: "visa_fee", label: "Visa Fees" },
  { value: "agency_fee", label: "Agency Fees" },
  { value: "government_fee", label: "Government Fees" },
  { value: "service_charge", label: "Service Charge" },
  { value: "gst", label: "GST" },
  { value: "other", label: "Other" },
];

// Country options for the searchable destination picker — built once at module
// scope from the global master, with flag emojis from the per-country wizard
// config when available.
const countryOptions: ComboboxOption[] = POPULAR_COUNTRIES.map((c) => {
  const conf = getCountryVisaConfig(c);
  return { value: c, label: c, prefix: conf?.flag };
});

function buildShareUrl(token: string): string {
  return `${window.location.origin}/p/${token}`;
}

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function ProposalsPage() {
  const { data: me } = useCurrentUser();
  const user = me?.user;
  const tenant = me?.tenant;
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const tenantId = tenant?.id ?? user?.tenantId ?? "";
  const agencyPhoneCode = defaultPhoneCodeFrom((tenant as any)?.baseCountry ?? (tenant as any)?.country ?? (tenant as any)?.contactPhone);
  const leadIdParam = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("leadId") ?? "";
  }, [location]);

  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shareProposal, setShareProposal] = useState<Proposal | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Proposal | null>(null);

  const proposalsQuery = useQuery<Proposal[]>({
    queryKey: ["/api/tenants", tenantId, "proposals"],
    enabled: !!tenantId,
  });

  const staffQuery = useQuery<StaffMember[]>({
    queryKey: ["/api/tenants", tenantId, "staff"],
    enabled: !!tenantId,
  });
  const staffForSelect = useMemo(() => {
    const team = (staffQuery.data ?? []).filter((u) => ["agency_owner", "agency_manager", "agency_staff"].includes(u.role));
    if (user?.id && !team.some((u) => u.id === user.id)) {
      return [{ id: user.id, name: user.name || user.email || "You", role: user.role }, ...team];
    }
    return team;
  }, [staffQuery.data, user?.id, user?.name, user?.email, user?.role]);

  const leadQuery = useQuery<Lead>({
    queryKey: ["/api/leads", leadIdParam],
    enabled: !!leadIdParam,
  });

  useEffect(() => {
    if (leadIdParam) setCreateOpen(true);
  }, [leadIdParam]);

  const filtered = useMemo(() => {
    const list = proposalsQuery.data ?? [];
    return list.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        p.customerName.toLowerCase().includes(q)
        || (p.customerEmail ?? "").toLowerCase().includes(q)
        || p.destinationCountry.toLowerCase().includes(q)
        || p.visaType.toLowerCase().includes(q)
      );
    });
  }, [proposalsQuery.data, search, statusFilter]);

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-proposals-title">Proposals</h1>
            <p className="text-sm text-muted-foreground">
              Send a branded application link with a document checklist. The customer applies in one click — no signup needed.
            </p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-proposal">
                <Plus className="w-4 h-4 mr-1.5" />
                New Proposal
              </Button>
            </DialogTrigger>
            <ProposalCreateDialog
              tenantId={tenantId}
              defaultAssignee={user?.id ?? ""}
              staff={staffForSelect}
              agencyPhoneCode={agencyPhoneCode}
              initialLead={leadQuery.data ?? null}
              onCreated={(p) => {
                setCreateOpen(false);
                if (leadIdParam) setLocation("/app/proposals", { replace: true });
                setShareProposal(p);
              }}
            />
          </Dialog>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="relative md:w-72">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, country, visa…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  data-testid="input-search-proposals"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="md:w-40" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="viewed">Viewed</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {proposalsQuery.isLoading ? (
              <div className="py-16 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 mx-auto animate-spin" />
                <p className="mt-2 text-sm">Loading proposals…</p>
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={Send}
                title={(proposalsQuery.data?.length ?? 0) === 0 ? "No proposals yet" : "No matches"}
                description={
                  (proposalsQuery.data?.length ?? 0) === 0
                    ? "Create your first proposal — we'll generate a shareable link and QR code that lets your client apply in one click."
                    : "Try a different search or status filter."
                }
                actionLabel={(proposalsQuery.data?.length ?? 0) === 0 ? "New Proposal" : undefined}
                onAction={(proposalsQuery.data?.length ?? 0) === 0 ? () => setCreateOpen(true) : undefined}
              />
            ) : (
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pl-4 md:pl-2 pr-2 font-medium">Customer</th>
                      <th className="py-2 px-2 font-medium hidden md:table-cell">Destination / Visa</th>
                      <th className="py-2 px-2 font-medium">Status</th>
                      <th className="py-2 px-2 font-medium hidden md:table-cell">Created</th>
                      <th className="py-2 pr-4 md:pr-2 pl-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => (
                      <tr
                        key={p.id}
                        className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                        data-testid={`row-proposal-${p.id}`}
                      >
                        <td className="py-3 pl-4 md:pl-2 pr-2">
                          <div className="font-medium" data-testid={`text-proposal-name-${p.id}`}>{p.customerName}</div>
                          {p.customerEmail && (
                            <div className="text-xs text-muted-foreground">{p.customerEmail}</div>
                          )}
                          <div className="md:hidden text-xs text-muted-foreground mt-0.5">
                            {p.destinationCountry} · {p.visaType}
                          </div>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell">
                          <div>{p.destinationCountry}</div>
                          <div className="text-xs text-muted-foreground">{p.visaType}</div>
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant="outline" className={STATUS_STYLES[p.status] ?? ""}>
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 hidden md:table-cell text-muted-foreground">
                          {formatDate(p.createdAt)}
                        </td>
                        <td className="py-3 pr-4 md:pr-2 pl-2 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShareProposal(p)}
                              data-testid={`button-share-${p.id}`}
                            >
                              <QrCode className="w-4 h-4 mr-1.5" /> Share
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="icon" variant="ghost" data-testid={`button-menu-${p.id}`}>
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    navigator.clipboard.writeText(buildShareUrl(p.token));
                                    toast({ title: "Link copied" });
                                  }}
                                >
                                  <Copy className="w-4 h-4 mr-2" /> Copy link
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a href={buildShareUrl(p.token)} target="_blank" rel="noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-2" /> Open link
                                  </a>
                                </DropdownMenuItem>
                                {p.appliedCaseId && (
                                  <DropdownMenuItem asChild>
                                    <a href={`/app/cases/${p.appliedCaseId}`}>
                                      <ClipboardList className="w-4 h-4 mr-2" /> View case
                                    </a>
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600 focus:text-red-600"
                                  onClick={() => setConfirmDelete(p)}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Share dialog with QR + link */}
      <ShareDialog
        proposal={shareProposal}
        onOpenChange={(open) => { if (!open) setShareProposal(null); }}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => { if (!o) setConfirmDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this proposal?</AlertDialogTitle>
            <AlertDialogDescription>
              The shareable link will stop working immediately. If the customer has already applied, the resulting case will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!confirmDelete) return;
                try {
                  await apiRequest("DELETE", `/api/tenants/${tenantId}/proposals/${confirmDelete.id}`);
                  await queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "proposals"] });
                  toast({ title: "Proposal deleted" });
                  setConfirmDelete(null);
                } catch (e: any) {
                  toast({ title: "Could not delete", description: e?.message, variant: "destructive" });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}

// =====================================================================
// Create dialog
// =====================================================================

function ProposalCreateDialog({
  tenantId, defaultAssignee, staff, agencyPhoneCode, initialLead, onCreated,
}: {
  tenantId: string;
  defaultAssignee: string;
  staff: StaffMember[];
  agencyPhoneCode: string;
  initialLead: Lead | null;
  onCreated: (p: Proposal) => void;
}) {
  const { toast } = useToast();
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    destinationCountry: "",
    visaType: "",
    notes: "",
    // Estimate amount the customer is shown after applying — they can pay
    // it via the public payment page. Stored as a string in form state for
    // input UX; converted to cents on submit.
    estimateAmount: "",
    expiresInDays: "30",
    assignedTo: defaultAssignee,
  });
  const [feeItems, setFeeItems] = useState<ProposalFeeItem[]>([
    { key: Math.random().toString(36).slice(2), description: "Agency Fee", category: "agency_fee", quantity: "1", unitPrice: "" },
  ]);

  const { data: customers = [] } = useQuery<CustomerOption[]>({
    queryKey: ["/api/tenants", tenantId, "customers"],
    enabled: !!tenantId,
  });

  useEffect(() => {
    if (defaultAssignee && !form.assignedTo) {
      setForm((f) => ({ ...f, assignedTo: defaultAssignee }));
    }
  }, [defaultAssignee]); // eslint-disable-line

  useEffect(() => {
    if (!initialLead) return;
    setForm((f) => ({
      ...f,
      customerName: f.customerName || initialLead.name || "",
      customerEmail: f.customerEmail || initialLead.email || "",
      customerPhone: f.customerPhone || initialLead.phone || "",
      destinationCountry: f.destinationCountry || initialLead.destinationCountry || "",
      visaType: f.visaType || initialLead.visaType || "",
      assignedTo: f.assignedTo || defaultAssignee,
    }));
  }, [initialLead, defaultAssignee]);

  const customerQuery = `${form.customerName} ${form.customerEmail}`.trim().toLowerCase();
  const customerMatches = useMemo(() => {
    if (customerQuery.length < 2) return [];
    return customers
      .filter((c) =>
        (c.name ?? "").toLowerCase().includes(customerQuery) ||
        c.email.toLowerCase().includes(customerQuery) ||
        customerQuery.split(/\s+/).some((part) =>
          part.length >= 2 && ((c.name ?? "").toLowerCase().includes(part) || c.email.toLowerCase().includes(part))
        )
      )
      .slice(0, 6);
  }, [customers, customerQuery]);

  const applyCustomer = (customer: CustomerOption) => {
    setForm((f) => ({
      ...f,
      customerName: customer.name || f.customerName,
      customerEmail: customer.email || f.customerEmail,
      customerPhone: customer.phone || f.customerPhone,
    }));
    setCustomerPickerOpen(false);
  };

  const { data: effectiveChecklist } = useQuery<{ checklist: ReturnType<typeof getDocumentChecklist> }>({
    queryKey: ["/api/tenants", tenantId, "application-settings", "checklists", form.destinationCountry, form.visaType],
    queryFn: async () => {
      const qs = new URLSearchParams({ country: form.destinationCountry, visaType: form.visaType });
      const res = await fetch(`/api/tenants/${tenantId}/application-settings/checklists?${qs.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load document checklist");
      return res.json();
    },
    enabled: !!tenantId && !!form.destinationCountry && !!form.visaType,
  });

  const checklistPreview = useMemo(() => {
    if (!form.destinationCountry || !form.visaType) return [];
    return effectiveChecklist?.checklist?.length ? effectiveChecklist.checklist : getDocumentChecklist(form.destinationCountry, form.visaType);
  }, [effectiveChecklist, form.destinationCountry, form.visaType]);

  const createMutation = useMutation({
    mutationFn: async () => {
      // Convert estimate-amount text → integer cents/paise for the server.
      // Empty / invalid / zero → null so "no estimate" sticks.
      const estTrim = form.estimateAmount.trim();
      const estParsed = estTrim ? Number(estTrim) : NaN;
      const lineTotalCents = feeItems.reduce((sum, item) => {
        const qty = Math.max(1, Number(item.quantity) || 1);
        const unit = Number(item.unitPrice);
        return sum + (Number.isFinite(unit) && unit > 0 ? Math.round(unit * 100) * qty : 0);
      }, 0);
      const estimateAmountCents = lineTotalCents > 0
        ? lineTotalCents
        : Number.isFinite(estParsed) && estParsed > 0
          ? Math.round(estParsed * 100)
          : null;
      const feeSummary = feeItems
        .filter((item) => item.description.trim() && Number(item.unitPrice) > 0)
        .map((item) => {
          const category = FEE_CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category;
          return `${category}: ${item.description.trim()} x ${item.quantity || "1"} = ${item.unitPrice}`;
        });

      const res = await apiRequest("POST", `/api/tenants/${tenantId}/proposals`, {
        customerName: form.customerName,
        customerEmail: form.customerEmail || null,
        customerPhone: form.customerPhone || null,
        destinationCountry: form.destinationCountry,
        visaType: form.visaType,
        notes: [form.notes, feeSummary.length ? `Fee breakdown:\n${feeSummary.join("\n")}` : ""].filter(Boolean).join("\n\n") || null,
        estimateAmountCents,
        expiresInDays: form.expiresInDays === "never" ? null : Number(form.expiresInDays),
        assignedTo: form.assignedTo || null,
        leadId: initialLead?.id ?? null,
      });
      return res.json() as Promise<Proposal>;
    },
    onSuccess: async (p) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "proposals"] });
      toast({ title: "Proposal created", description: "Share the link or QR with your client." });
      onCreated(p);
    },
    onError: (e: any) => {
      toast({ title: "Could not create proposal", description: e?.message, variant: "destructive" });
    },
  });

  const canSubmit = form.customerName.trim() && form.destinationCountry && form.visaType;
  const feeTotal = feeItems.reduce((sum, item) => {
    const qty = Math.max(1, Number(item.quantity) || 1);
    const unit = Number(item.unitPrice);
    return sum + (Number.isFinite(unit) && unit > 0 ? unit * qty : 0);
  }, 0);

  return (
    <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col overflow-hidden p-0">
      <DialogHeader className="border-b px-6 py-5">
        <DialogTitle className="text-xl">New Proposal</DialogTitle>
        <DialogDescription>
          Generate a shareable application link with customer details, visa route, fees, and checklist.
        </DialogDescription>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <div className="grid gap-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="p-name">Customer name <span className="text-red-500">*</span></Label>
            <Input
              id="p-name"
              value={form.customerName}
              onFocus={() => setCustomerPickerOpen(true)}
              onChange={(e) => {
                setCustomerPickerOpen(true);
                setForm({ ...form, customerName: e.target.value });
              }}
              placeholder="e.g. Priya Sharma"
              data-testid="input-customer-name"
            />
          </div>
          <div>
            <Label htmlFor="p-email">Customer email</Label>
            <Input
              id="p-email"
              type="email"
              value={form.customerEmail}
              onFocus={() => setCustomerPickerOpen(true)}
              onChange={(e) => {
                setCustomerPickerOpen(true);
                setForm({ ...form, customerEmail: e.target.value });
              }}
              placeholder="optional — used to email the link later"
              data-testid="input-customer-email"
            />
          </div>
          {customerPickerOpen && customerMatches.length > 0 && (
            <div className="md:col-span-2 rounded-lg border bg-background shadow-sm" data-testid="proposal-customer-picker">
              <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
                <div className="text-sm font-medium">Select existing customer</div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setCustomerPickerOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="divide-y">
                {customerMatches.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted/60"
                    onClick={() => applyCustomer(customer)}
                    data-testid={`button-select-proposal-customer-${customer.id}`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{customer.name || customer.email}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {customer.email}{customer.phone ? ` · ${customer.phone}` : ""}
                      </span>
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {customer.caseCount ?? 0} cases
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="p-phone">Customer phone</Label>
            <PhoneInput
              value={form.customerPhone}
              onChange={(customerPhone) => setForm({ ...form, customerPhone })}
              defaultCountryCode={agencyPhoneCode}
              placeholder="optional"
              testId="input-customer-phone"
            />
          </div>
          <div>
            <Label>Owner</Label>
            <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
              <SelectTrigger data-testid="select-assignee">
                <SelectValue placeholder="Pick a team member" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name} <span className="text-muted-foreground text-xs">({s.role.replace("agency_", "")})</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Destination country + visa type as one adjacent pair — same
              "where + what" layout used by the lead form and the lead-convert
              dialog. The visa-type list is country-specific (e.g. Algeria
              never sees "Schengen Visa") via getCountryVisaTypes().
              Changing the country resets the visa type so a stale value
              from a previous country can't sneak through. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:col-span-2">
            <div>
              <Label>Destination country <span className="text-red-500">*</span></Label>
              <Combobox
                options={countryOptions}
                value={form.destinationCountry}
                onChange={(v) => setForm({ ...form, destinationCountry: v, visaType: "" })}
                placeholder="Pick a country"
                searchPlaceholder="Type a country..."
                testId="select-country"
                allowClear={false}
              />
            </div>
            <div>
              <Label>Visa type <span className="text-red-500">*</span></Label>
              <Select
                value={form.visaType}
                onValueChange={(v) => setForm({ ...form, visaType: v })}
                disabled={!form.destinationCountry}
              >
                <SelectTrigger data-testid="select-visa-type">
                  <SelectValue placeholder={form.destinationCountry ? "Pick a visa type" : "Pick a country first"} />
                </SelectTrigger>
                <SelectContent>
                  {form.destinationCountry &&
                    getCountryVisaTypes(form.destinationCountry).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {form.destinationCountry && (
                <p className="text-xs text-muted-foreground mt-1">
                  {getCountryVisaConfig(form.destinationCountry)
                    ? `Showing official visa categories for ${form.destinationCountry}.`
                    : `No structured visa list yet for ${form.destinationCountry} — pick the closest generic category.`}
                </p>
              )}
            </div>
          </div>
          <div>
            <Label>Link expires in</Label>
            <Select value={form.expiresInDays} onValueChange={(v) => setForm({ ...form, expiresInDays: v })}>
              <SelectTrigger data-testid="select-expiry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="14">14 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="60">60 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="never">Never</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Separator />

        <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Label className="text-base font-semibold">Fees</Label>
              <p className="text-xs text-muted-foreground">Add proposal fee lines using the same categories as invoices.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFeeItems((items) => [
                ...items,
                { key: Math.random().toString(36).slice(2), description: "", category: "agency_fee", quantity: "1", unitPrice: "" },
              ])}
              data-testid="button-add-proposal-fee"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Fee
            </Button>
          </div>

          <div className="space-y-3">
            {feeItems.map((item, index) => (
              <div key={item.key} className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr_0.55fr_0.8fr_auto] gap-2 rounded-md bg-background p-3 border">
                <div>
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={item.category}
                    onValueChange={(category) => setFeeItems((items) => items.map((row, i) => i === index ? { ...row, category } : row))}
                  >
                    <SelectTrigger data-testid={`select-proposal-fee-category-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FEE_CATEGORIES.map((category) => (
                        <SelectItem key={category.value} value={category.value}>{category.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={item.description}
                    onChange={(e) => setFeeItems((items) => items.map((row, i) => i === index ? { ...row, description: e.target.value } : row))}
                    placeholder="e.g. Visa consultation"
                    data-testid={`input-proposal-fee-description-${index}`}
                  />
                </div>
                <div>
                  <Label className="text-xs">Qty</Label>
                  <Input
                    value={item.quantity}
                    onChange={(e) => setFeeItems((items) => items.map((row, i) => i === index ? { ...row, quantity: e.target.value } : row))}
                    type="number"
                    min="1"
                    inputMode="numeric"
                    data-testid={`input-proposal-fee-quantity-${index}`}
                  />
                </div>
                <div>
                  <Label className="text-xs">Amount</Label>
                  <Input
                    value={item.unitPrice}
                    onChange={(e) => setFeeItems((items) => items.map((row, i) => i === index ? { ...row, unitPrice: e.target.value } : row))}
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    data-testid={`input-proposal-fee-amount-${index}`}
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setFeeItems((items) => items.length > 1 ? items.filter((_, i) => i !== index) : items)}
                    disabled={feeItems.length === 1}
                    data-testid={`button-remove-proposal-fee-${index}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm">
            <span className="text-muted-foreground">Proposal total</span>
            <span className="font-semibold">₹{feeTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            If fees are added, the customer sees a payment estimate after submitting.
          </p>
        </div>

        <div>
          <Label htmlFor="p-notes">Message to the client (optional)</Label>
          <Textarea
            id="p-notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="e.g. Hi Priya — please complete this short application so we can start your visa process. Let me know if you have any questions!"
            rows={3}
            data-testid="input-notes"
          />
        </div>

        {checklistPreview.length > 0 && (
          <div className="rounded-md border bg-muted/40 p-3">
            <div className="flex items-center gap-2 mb-2 text-sm font-medium">
              <ClipboardList className="w-4 h-4" />
              Documents your client will see ({checklistPreview.length})
            </div>
            <ul className="text-xs text-muted-foreground space-y-0.5 max-h-40 overflow-y-auto">
              {checklistPreview.map((d) => (
                <li key={d.type} className="flex gap-1.5">
                  <span className={d.required ? "text-red-500" : "text-muted-foreground"}>•</span>
                  <span>
                    <span className="text-foreground">{d.name}</span>
                    {!d.required && <span className="text-muted-foreground"> (optional)</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        </div>
      </div>

      <DialogFooter className="border-t bg-background px-6 py-4">
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!canSubmit || createMutation.isPending}
          data-testid="button-create-proposal"
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          Create & get link
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// =====================================================================
// Share dialog (QR + copy link)
// =====================================================================

function ShareDialog({
  proposal, onOpenChange,
}: {
  proposal: Proposal | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const url = proposal ? buildShareUrl(proposal.token) : "";

  useEffect(() => {
    let cancelled = false;
    if (!proposal) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(buildShareUrl(proposal.token), {
      width: 320,
      margin: 1,
      color: { dark: "#0f172a", light: "#ffffff" },
    }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    }).catch(() => {
      if (!cancelled) setQrDataUrl(null);
    });
    return () => { cancelled = true; };
  }, [proposal?.token]); // eslint-disable-line

  return (
    <Dialog open={!!proposal} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share with your client</DialogTitle>
          <DialogDescription>
            Send this link by email/WhatsApp, or print the QR for in-person handoff.
          </DialogDescription>
        </DialogHeader>

        {proposal && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{proposal.customerName}</span>
              {" · "}{proposal.destinationCountry} · {proposal.visaType}
            </div>

            <div className="flex justify-center bg-white rounded-md p-4 border">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Proposal QR code" className="w-56 h-56" data-testid="img-qr-code" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Input value={url} readOnly className="font-mono text-xs" data-testid="input-share-url" />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(url);
                  toast({ title: "Link copied" });
                }}
                data-testid="button-copy-link"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2">
              <Button asChild variant="outline" className="flex-1" data-testid="button-open-link">
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="w-4 h-4 mr-1.5" /> Preview
                </a>
              </Button>
              {qrDataUrl && (
                <Button asChild variant="outline" data-testid="button-download-qr">
                  <a href={qrDataUrl} download={`proposal-${proposal.token.slice(0, 8)}.png`}>
                    <QrCode className="w-4 h-4 mr-1.5" /> Download QR
                  </a>
                </Button>
              )}
            </div>

            {proposal.customerEmail && (
              <Button
                variant="default"
                className="w-full"
                asChild
                data-testid="button-email-link"
              >
                <a
                  href={`mailto:${proposal.customerEmail}?subject=${encodeURIComponent(`Your ${proposal.destinationCountry} ${proposal.visaType} application`)}&body=${encodeURIComponent(`Hi ${proposal.customerName},\n\nPlease use this link to start your application — it includes the full document checklist:\n\n${url}\n\nLet me know if you have any questions.`)}`}
                >
                  <LinkIcon className="w-4 h-4 mr-1.5" /> Email this link
                </a>
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
