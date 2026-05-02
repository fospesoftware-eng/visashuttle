import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Plus, Trash2, Edit, Receipt, FileText, Banknote, Settings as SettingsIcon,
  TrendingUp, AlertCircle, CheckCircle2, Clock, Send, Eye,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getCountryVisaConfig } from "@/data/country-visa-types";
import type {
  FeeTemplate, InvoiceSettings, Invoice, InvoiceItem, Payment, Case,
} from "@shared/schema";

// ---------- helpers ----------
const COUNTRIES_LIST = [
  "United States", "Canada", "United Kingdom", "France", "Germany", "Italy", "Spain",
  "Netherlands", "Belgium", "Switzerland", "Austria", "Australia", "New Zealand",
  "Japan", "South Korea", "Singapore", "United Arab Emirates", "Saudi Arabia",
  "China", "India", "Brazil", "Mexico", "South Africa", "Turkey", "Russia",
];

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  upfront: "Pay Upfront (100%)",
  advance: "Advance + Balance",
  installments: "Installments",
  on_completion: "On Completion",
};

const STATUS_BADGE: Record<string, { label: string; className: string; icon: any }> = {
  draft:     { label: "Draft",     className: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200", icon: Edit },
  sent:      { label: "Sent",      className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300", icon: Send },
  partial:   { label: "Partial",   className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300", icon: Clock },
  paid:      { label: "Paid",      className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300", icon: CheckCircle2 },
  overdue:   { label: "Overdue",   className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300", icon: AlertCircle },
  cancelled: { label: "Cancelled", className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400", icon: Trash2 },
};

const ITEM_CATEGORIES = [
  { value: "agency_fee",      label: "Agency Fee" },
  { value: "government_fee",  label: "Government Fee" },
  { value: "service_charge",  label: "Service Charge" },
  { value: "other",           label: "Other" },
  { value: "discount",        label: "Discount" },
];

const PAYMENT_METHODS = [
  { value: "cash",          label: "Cash" },
  { value: "card",          label: "Card" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "online",        label: "Online" },
  { value: "other",         label: "Other" },
];

function fmtMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents ?? 0) / 100);
}
function toCents(v: string | number): number {
  const n = typeof v === "number" ? v : parseFloat(v);
  return isNaN(n) ? 0 : Math.round(n * 100);
}
function fromCents(c: number): string {
  return ((c ?? 0) / 100).toFixed(2);
}
function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ---------- main page ----------
export default function AccountingPage() {
  const { data: authData } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;
  const [tab, setTab] = useState("overview");

  if (!tenantId) {
    return (
      <DashboardLayout type="agency">
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Accounting</h1>
          <p className="text-muted-foreground">Manage invoices, payments, fee templates, and billing settings.</p>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="invoices" data-testid="tab-invoices">Invoices</TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">Fee Templates</TabsTrigger>
            <TabsTrigger value="settings" data-testid="tab-settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab tenantId={tenantId} onJump={setTab} /></TabsContent>
          <TabsContent value="invoices"><InvoicesTab tenantId={tenantId} /></TabsContent>
          <TabsContent value="templates"><FeeTemplatesTab tenantId={tenantId} /></TabsContent>
          <TabsContent value="settings"><InvoiceSettingsTab tenantId={tenantId} /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ============================================================
// Overview tab — KPIs + recent invoices
// ============================================================
function OverviewTab({ tenantId, onJump }: { tenantId: string; onJump: (t: string) => void }) {
  const { data: stats } = useQuery<{
    totalBilled: number; totalPaid: number; totalOutstanding: number; totalOverdue: number;
    draftCount: number; sentCount: number; partialCount: number; paidCount: number;
    overdueCount: number; count: number;
  }>({
    queryKey: ["/api/tenants", tenantId, "invoices", "stats"],
  });
  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/tenants", tenantId, "invoices"],
  });

  const kpis = [
    { label: "Total Billed",    value: fmtMoney(stats?.totalBilled ?? 0),      icon: Receipt,    color: "text-blue-600 dark:text-blue-400" },
    { label: "Total Collected", value: fmtMoney(stats?.totalPaid ?? 0),        icon: Banknote,   color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Outstanding",     value: fmtMoney(stats?.totalOutstanding ?? 0), icon: Clock,      color: "text-amber-600 dark:text-amber-400" },
    { label: "Overdue",         value: fmtMoney(stats?.totalOverdue ?? 0),     icon: AlertCircle, color: "text-red-600 dark:text-red-400" },
  ];

  const recent = invoices.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label} data-testid={`kpi-${k.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{k.label}</p>
                    <p className="text-2xl font-bold mt-1">{k.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-muted ${k.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Status breakdown</CardTitle>
            <CardDescription>{stats?.count ?? 0} total invoices</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => onJump("invoices")} data-testid="button-view-all-invoices">
            View all
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(["draft", "sent", "partial", "paid", "overdue"] as const).map((s) => {
              const conf = STATUS_BADGE[s];
              const Icon = conf.icon;
              const count = stats?.[`${s}Count` as const] ?? 0;
              return (
                <div key={s} className="rounded-lg border p-3 flex items-center gap-3">
                  <div className={`p-2 rounded-md ${conf.className}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground capitalize">{s}</p>
                    <p className="font-semibold" data-testid={`stat-${s}-count`}>{count}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((inv) => {
                  const conf = STATUS_BADGE[inv.status] ?? STATUS_BADGE.draft;
                  return (
                    <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                      <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.customerName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(inv.issuedAt)}</TableCell>
                      <TableCell><Badge className={conf.className}>{conf.label}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{fmtMoney(inv.total, inv.currency)}</TableCell>
                      <TableCell className="text-right text-amber-700 dark:text-amber-400 font-medium">
                        {fmtMoney(Math.max(0, inv.total - inv.paidAmount), inv.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Invoices tab
// ============================================================
function InvoicesTab({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/tenants", tenantId, "invoices"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoices", "stats"] });
      toast({ title: "Invoice deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{invoices.length} invoices</p>
        <Button onClick={() => setComposeOpen(true)} data-testid="button-new-invoice">
          <Plus className="w-4 h-4 mr-2" /> New Invoice
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading invoices...</div>
          ) : invoices.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium">No invoices yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first invoice to start tracking payments.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Visa</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-32"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const conf = STATUS_BADGE[inv.status] ?? STATUS_BADGE.draft;
                  const balance = Math.max(0, inv.total - inv.paidAmount);
                  return (
                    <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                      <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                      <TableCell>
                        <div className="font-medium">{inv.customerName}</div>
                        {inv.customerEmail && <div className="text-xs text-muted-foreground">{inv.customerEmail}</div>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {[inv.destinationCountry, inv.visaType].filter(Boolean).join(" · ") || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(inv.issuedAt)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmtDate(inv.dueDate)}</TableCell>
                      <TableCell><Badge className={conf.className}>{conf.label}</Badge></TableCell>
                      <TableCell className="text-right font-medium">{fmtMoney(inv.total, inv.currency)}</TableCell>
                      <TableCell className="text-right text-emerald-700 dark:text-emerald-400">
                        {fmtMoney(inv.paidAmount, inv.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={balance > 0 ? "text-amber-700 dark:text-amber-400 font-medium" : "text-muted-foreground"}>
                          {fmtMoney(balance, inv.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => setViewInvoiceId(inv.id)} data-testid={`button-view-${inv.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => {
                            if (confirm(`Delete invoice ${inv.invoiceNumber}?`)) deleteMutation.mutate(inv.id);
                          }} data-testid={`button-delete-${inv.id}`}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ComposeInvoiceDialog
        tenantId={tenantId}
        open={composeOpen}
        onOpenChange={setComposeOpen}
      />
      {viewInvoiceId && (
        <InvoiceDetailDialog
          tenantId={tenantId}
          invoiceId={viewInvoiceId}
          open={!!viewInvoiceId}
          onOpenChange={(o) => { if (!o) setViewInvoiceId(null); }}
        />
      )}
    </div>
  );
}

// ============================================================
// Compose / Create Invoice
// ============================================================
type DraftItem = { description: string; category: string; quantity: number; unitPrice: string };

function ComposeInvoiceDialog({
  tenantId, open, onOpenChange,
}: { tenantId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const { data: templates = [] } = useQuery<FeeTemplate[]>({
    queryKey: ["/api/tenants", tenantId, "fee-templates"],
  });
  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/tenants", tenantId, "cases"],
  });
  const { data: settings } = useQuery<InvoiceSettings | null>({
    queryKey: ["/api/tenants", tenantId, "invoice-settings"],
  });

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [visaType, setVisaType] = useState("");
  const [caseId, setCaseId] = useState<string>("");
  const [paymentType, setPaymentType] = useState("upfront");
  const [advancePercent, setAdvancePercent] = useState("50");
  const [status, setStatus] = useState("draft");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftItem[]>([
    { description: "", category: "agency_fee", quantity: 1, unitPrice: "" },
  ]);

  const reset = () => {
    setCustomerName(""); setCustomerEmail(""); setCustomerPhone("");
    setDestinationCountry(""); setVisaType(""); setCaseId("");
    setPaymentType("upfront"); setAdvancePercent("50");
    setStatus("draft"); setDueDate(""); setNotes("");
    setItems([{ description: "", category: "agency_fee", quantity: 1, unitPrice: "" }]);
  };

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    if (tpl.destinationCountry) setDestinationCountry(tpl.destinationCountry);
    if (tpl.visaType) setVisaType(tpl.visaType);
    setPaymentType(tpl.defaultPaymentType);
    if (tpl.advancePercent != null) setAdvancePercent(String(tpl.advancePercent));
    const next: DraftItem[] = [];
    if (tpl.agencyFee > 0)     next.push({ description: "Agency Fee",     category: "agency_fee",     quantity: 1, unitPrice: fromCents(tpl.agencyFee) });
    if (tpl.governmentFee > 0) next.push({ description: "Government Fee", category: "government_fee", quantity: 1, unitPrice: fromCents(tpl.governmentFee) });
    if (tpl.serviceFee > 0)    next.push({ description: "Service Charge", category: "service_charge", quantity: 1, unitPrice: fromCents(tpl.serviceFee) });
    if (tpl.otherFee > 0)      next.push({ description: tpl.otherFeeLabel ?? "Other", category: "other", quantity: 1, unitPrice: fromCents(tpl.otherFee) });
    if (next.length === 0) next.push({ description: "", category: "agency_fee", quantity: 1, unitPrice: "" });
    setItems(next);
  };

  const applyCase = (cid: string) => {
    setCaseId(cid);
    const c = cases.find((x) => x.id === cid);
    if (!c) return;
    if (c.applicantName) setCustomerName(c.applicantName);
    if (c.destinationCountry) setDestinationCountry(c.destinationCountry);
    if (c.visaType) setVisaType(c.visaType);
  };

  const subtotalCents = items.reduce((s, i) => s + toCents(i.unitPrice) * (i.quantity || 1), 0);
  const taxRate = settings?.taxRate ?? 0;
  const taxAmount = Math.round((subtotalCents * taxRate) / 10000);
  const total = subtotalCents + taxAmount;

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        customerName,
        customerEmail: customerEmail || null,
        customerPhone: customerPhone || null,
        destinationCountry: destinationCountry || null,
        visaType: visaType || null,
        caseId: caseId || null,
        paymentType,
        advancePercent: paymentType === "advance" ? parseInt(advancePercent) || 50 : null,
        status,
        dueDate: dueDate || null,
        notes: notes || null,
        currency: settings?.currency ?? "USD",
        items: items
          .filter((i) => i.description.trim() && toCents(i.unitPrice) > 0)
          .map((i, idx) => ({
            description: i.description.trim(),
            category: i.category,
            quantity: i.quantity || 1,
            unitPrice: toCents(i.unitPrice),
            amount: toCents(i.unitPrice) * (i.quantity || 1),
            sortOrder: idx,
          })),
      };
      const res = await apiRequest("POST", `/api/tenants/${tenantId}/invoices`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoices", "stats"] });
      toast({ title: "Invoice created" });
      reset();
      onOpenChange(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!customerName.trim()) {
      toast({ title: "Customer name required", variant: "destructive" });
      return;
    }
    if (items.filter((i) => i.description.trim() && toCents(i.unitPrice) > 0).length === 0) {
      toast({ title: "Add at least one line item", variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  const visaConf = destinationCountry ? getCountryVisaConfig(destinationCountry) : null;
  const visaOptions: string[] = visaConf
    ? Object.values(visaConf.categories).flatMap((arr: any) =>
        Array.isArray(arr) ? arr.map((v: any) => v.label as string) : [],
      )
    : ["Tourist Visa", "Business Visa", "Student Visa", "Work Visa", "Visit Visa", "Transit Visa"];

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Invoice</DialogTitle>
          <DialogDescription>Create an invoice for a customer or linked case.</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Quick fillers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Use fee template</Label>
              <Select value="" onValueChange={applyTemplate}>
                <SelectTrigger data-testid="select-fee-template">
                  <SelectValue placeholder={templates.length === 0 ? "No templates yet" : "Choose a template"} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Link to case (optional)</Label>
              <Select value={caseId} onValueChange={applyCase}>
                <SelectTrigger data-testid="select-case">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {cases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.applicantName ?? c.caseNumber} — {c.visaType ?? "Case"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Customer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Customer name *</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} data-testid="input-customer-name" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} data-testid="input-customer-email" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} data-testid="input-customer-phone" />
            </div>
            <div className="space-y-2">
              <Label>Destination country</Label>
              <Select value={destinationCountry} onValueChange={(v) => { setDestinationCountry(v); setVisaType(""); }}>
                <SelectTrigger data-testid="select-destination-country"><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES_LIST.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Visa type</Label>
              <Select value={visaType} onValueChange={setVisaType}>
                <SelectTrigger data-testid="select-visa-type"><SelectValue placeholder="Select visa type" /></SelectTrigger>
                <SelectContent>
                  {visaOptions.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Line items</Label>
              <Button type="button" variant="outline" size="sm" onClick={() =>
                setItems([...items, { description: "", category: "agency_fee", quantity: 1, unitPrice: "" }])
              } data-testid="button-add-item">
                <Plus className="w-4 h-4 mr-1" /> Add item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-4 space-y-1">
                    {idx === 0 && <Label className="text-xs">Description</Label>}
                    <Input value={it.description} placeholder="Service description"
                      onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                      data-testid={`input-item-desc-${idx}`} />
                  </div>
                  <div className="col-span-6 sm:col-span-3 space-y-1">
                    {idx === 0 && <Label className="text-xs">Category</Label>}
                    <Select value={it.category}
                      onValueChange={(v) => setItems(items.map((x, i) => i === idx ? { ...x, category: v } : x))}>
                      <SelectTrigger data-testid={`select-item-category-${idx}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ITEM_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    {idx === 0 && <Label className="text-xs">Qty</Label>}
                    <Input type="number" min={1} value={it.quantity}
                      onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, quantity: parseInt(e.target.value) || 1 } : x))}
                      data-testid={`input-item-qty-${idx}`} />
                  </div>
                  <div className="col-span-3 sm:col-span-2 space-y-1">
                    {idx === 0 && <Label className="text-xs">Price</Label>}
                    <Input type="number" step="0.01" placeholder="0.00" value={it.unitPrice}
                      onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, unitPrice: e.target.value } : x))}
                      data-testid={`input-item-price-${idx}`} />
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <Button type="button" variant="ghost" size="icon"
                        onClick={() => setItems(items.filter((_, i) => i !== idx))}
                        data-testid={`button-remove-item-${idx}`}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg border p-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span data-testid="text-subtotal">{fmtMoney(subtotalCents, settings?.currency)}</span></div>
            {taxRate > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>{settings?.taxLabel ?? "Tax"} ({(taxRate / 100).toFixed(2)}%)</span><span>{fmtMoney(taxAmount, settings?.currency)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-base pt-1 border-t mt-1"><span>Total</span><span data-testid="text-total">{fmtMoney(total, settings?.currency)}</span></div>
          </div>

          <Separator />

          {/* Payment options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2 sm:col-span-2">
              <Label>Payment type</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger data-testid="select-payment-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {paymentType === "advance" && (
              <div className="space-y-2">
                <Label>Advance %</Label>
                <Input type="number" min={1} max={99} value={advancePercent}
                  onChange={(e) => setAdvancePercent(e.target.value)} data-testid="input-advance-percent" />
              </div>
            )}
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger data-testid="select-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Due date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="input-due-date" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes for the customer..." data-testid="input-notes" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} data-testid="button-create-invoice">
            {createMutation.isPending ? "Creating..." : "Create invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Invoice Detail Dialog (with payments)
// ============================================================
function InvoiceDetailDialog({
  tenantId, invoiceId, open, onOpenChange,
}: { tenantId: string; invoiceId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const { data: invoice, isLoading } = useQuery<Invoice & { items: InvoiceItem[]; payments: Payment[] }>({
    queryKey: ["/api/invoices", invoiceId],
  });
  const { data: settings } = useQuery<InvoiceSettings | null>({
    queryKey: ["/api/tenants", tenantId, "invoice-settings"],
  });

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("bank_transfer");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const balance = invoice ? Math.max(0, invoice.total - invoice.paidAmount) : 0;

  const addPaymentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        amount: toCents(payAmount),
        method: payMethod,
        reference: payRef || null,
        notes: payNotes || null,
      };
      const res = await apiRequest("POST", `/api/invoices/${invoiceId}/payments`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoices", "stats"] });
      setPayAmount(""); setPayRef(""); setPayNotes("");
      toast({ title: "Payment recorded" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoices", "stats"] });
      toast({ title: "Payment removed" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => apiRequest("PATCH", `/api/invoices/${invoiceId}`, { status: newStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoices", "stats"] });
      toast({ title: "Status updated" });
    },
  });

  if (isLoading || !invoice) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent><div className="p-8 text-center">Loading...</div></DialogContent>
      </Dialog>
    );
  }

  const conf = STATUS_BADGE[invoice.status] ?? STATUS_BADGE.draft;
  const advanceTarget = invoice.paymentType === "advance" && invoice.advancePercent
    ? Math.round(invoice.total * invoice.advancePercent / 100)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="font-mono text-xl">{invoice.invoiceNumber}</DialogTitle>
              <DialogDescription>
                Issued {fmtDate(invoice.issuedAt)} · Due {fmtDate(invoice.dueDate)}
              </DialogDescription>
            </div>
            <Badge className={conf.className}>{conf.label}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* From / To */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">From</p>
              <p className="font-semibold">{settings?.companyName ?? "—"}</p>
              {settings?.companyAddress && <p className="text-muted-foreground whitespace-pre-line">{settings.companyAddress}</p>}
              {settings?.companyEmail && <p className="text-muted-foreground">{settings.companyEmail}</p>}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Bill to</p>
              <p className="font-semibold">{invoice.customerName}</p>
              {invoice.customerEmail && <p className="text-muted-foreground">{invoice.customerEmail}</p>}
              {invoice.customerPhone && <p className="text-muted-foreground">{invoice.customerPhone}</p>}
              {(invoice.destinationCountry || invoice.visaType) && (
                <p className="text-muted-foreground mt-1">
                  {[invoice.destinationCountry, invoice.visaType].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>

          {/* Items */}
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((it) => {
                  const cat = ITEM_CATEGORIES.find((c) => c.value === it.category);
                  return (
                    <TableRow key={it.id}>
                      <TableCell>{it.description}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{cat?.label ?? it.category}</Badge></TableCell>
                      <TableCell className="text-right">{it.quantity}</TableCell>
                      <TableCell className="text-right">{fmtMoney(it.unitPrice, invoice.currency)}</TableCell>
                      <TableCell className="text-right font-medium">{fmtMoney(it.amount, invoice.currency)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtMoney(invoice.subtotal, invoice.currency)}</span></div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground"><span>{settings?.taxLabel ?? "Tax"}</span><span>{fmtMoney(invoice.taxAmount, invoice.currency)}</span></div>
              )}
              <div className="flex justify-between font-semibold text-base border-t pt-1 mt-1"><span>Total</span><span>{fmtMoney(invoice.total, invoice.currency)}</span></div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><span>Paid</span><span>{fmtMoney(invoice.paidAmount, invoice.currency)}</span></div>
              <div className="flex justify-between font-semibold text-amber-700 dark:text-amber-400"><span>Balance due</span><span>{fmtMoney(balance, invoice.currency)}</span></div>
              {advanceTarget != null && (
                <div className="text-xs text-muted-foreground pt-1">
                  Advance ({invoice.advancePercent}%): {fmtMoney(advanceTarget, invoice.currency)}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Payment recording */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Payments ({invoice.payments.length})</h3>
              <div className="flex gap-2">
                {invoice.status === "draft" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate("sent")} data-testid="button-mark-sent">
                    <Send className="w-3.5 h-3.5 mr-1" /> Mark sent
                  </Button>
                )}
                {invoice.status !== "cancelled" && invoice.status !== "paid" && (
                  <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate("cancelled")} data-testid="button-cancel-invoice">
                    Cancel
                  </Button>
                )}
              </div>
            </div>

            {invoice.payments.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((p) => {
                    const m = PAYMENT_METHODS.find((x) => x.value === p.method);
                    return (
                      <TableRow key={p.id} data-testid={`row-payment-${p.id}`}>
                        <TableCell className="text-sm">{fmtDate(p.paidAt)}</TableCell>
                        <TableCell>{m?.label ?? p.method}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.reference ?? "—"}</TableCell>
                        <TableCell className="text-right font-medium">{fmtMoney(p.amount, invoice.currency)}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" onClick={() => {
                            if (confirm("Remove this payment?")) deletePaymentMutation.mutate(p.id);
                          }} data-testid={`button-delete-payment-${p.id}`}>
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}

            {balance > 0 && (
              <div className="rounded-lg border p-3 bg-muted/30 space-y-2">
                <p className="text-sm font-medium">Record a payment</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <Input type="number" step="0.01" placeholder="Amount" value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)} data-testid="input-pay-amount" />
                  <Select value={payMethod} onValueChange={setPayMethod}>
                    <SelectTrigger data-testid="select-pay-method"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input placeholder="Reference (optional)" value={payRef} onChange={(e) => setPayRef(e.target.value)} data-testid="input-pay-ref" />
                  <Button onClick={() => {
                    if (toCents(payAmount) <= 0) {
                      toast({ title: "Enter an amount", variant: "destructive" });
                      return;
                    }
                    addPaymentMutation.mutate();
                  }} disabled={addPaymentMutation.isPending} data-testid="button-record-payment">
                    {addPaymentMutation.isPending ? "Saving..." : "Record"}
                  </Button>
                </div>
                <Input placeholder="Notes (optional)" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} data-testid="input-pay-notes" />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Fee Templates tab
// ============================================================
function FeeTemplatesTab({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<FeeTemplate | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery<FeeTemplate[]>({
    queryKey: ["/api/tenants", tenantId, "fee-templates"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/fee-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "fee-templates"] });
      toast({ title: "Template deleted" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{templates.length} templates</p>
        <Button onClick={() => { setEditing(null); setIsOpen(true); }} data-testid="button-new-template">
          <Plus className="w-4 h-4 mr-2" /> New Template
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-medium">No fee templates yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create reusable presets per visa type and country.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.map((tpl) => {
            const total = (tpl.agencyFee ?? 0) + (tpl.governmentFee ?? 0) + (tpl.serviceFee ?? 0) + (tpl.otherFee ?? 0);
            return (
              <Card key={tpl.id} data-testid={`card-template-${tpl.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{tpl.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {[tpl.destinationCountry, tpl.visaType].filter(Boolean).join(" · ") || "Generic"}
                      </CardDescription>
                    </div>
                    {!tpl.active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="space-y-1">
                    {tpl.agencyFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Agency</span><span>{fmtMoney(tpl.agencyFee, tpl.currency)}</span></div>}
                    {tpl.governmentFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Government</span><span>{fmtMoney(tpl.governmentFee, tpl.currency)}</span></div>}
                    {tpl.serviceFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span>{fmtMoney(tpl.serviceFee, tpl.currency)}</span></div>}
                    {tpl.otherFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{tpl.otherFeeLabel ?? "Other"}</span><span>{fmtMoney(tpl.otherFee, tpl.currency)}</span></div>}
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold"><span>Total</span><span>{fmtMoney(total, tpl.currency)}</span></div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <span>{PAYMENT_TYPE_LABELS[tpl.defaultPaymentType] ?? tpl.defaultPaymentType}</span>
                    {tpl.defaultPaymentType === "advance" && tpl.advancePercent != null && <span>{tpl.advancePercent}% advance</span>}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => { setEditing(tpl); setIsOpen(true); }} data-testid={`button-edit-template-${tpl.id}`}>
                      <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => {
                      if (confirm(`Delete template "${tpl.name}"?`)) deleteMutation.mutate(tpl.id);
                    }} data-testid={`button-delete-template-${tpl.id}`}>
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <FeeTemplateDialog
        tenantId={tenantId}
        template={editing}
        open={isOpen}
        onOpenChange={(o) => { setIsOpen(o); if (!o) setEditing(null); }}
      />
    </div>
  );
}

function FeeTemplateDialog({
  tenantId, template, open, onOpenChange,
}: { tenantId: string; template: FeeTemplate | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  const { toast } = useToast();
  const isEdit = !!template;

  const empty = useMemo(() => ({
    name: "", destinationCountry: "", visaType: "",
    agencyFee: "", governmentFee: "", serviceFee: "", otherFee: "", otherFeeLabel: "",
    defaultPaymentType: "upfront", advancePercent: "50", description: "", active: true,
  }), []);

  const [form, setForm] = useState(empty);

  // sync when template changes
  useMemo(() => {
    if (template) {
      setForm({
        name: template.name,
        destinationCountry: template.destinationCountry ?? "",
        visaType: template.visaType ?? "",
        agencyFee: template.agencyFee ? fromCents(template.agencyFee) : "",
        governmentFee: template.governmentFee ? fromCents(template.governmentFee) : "",
        serviceFee: template.serviceFee ? fromCents(template.serviceFee) : "",
        otherFee: template.otherFee ? fromCents(template.otherFee) : "",
        otherFeeLabel: template.otherFeeLabel ?? "",
        defaultPaymentType: template.defaultPaymentType,
        advancePercent: String(template.advancePercent ?? 50),
        description: template.description ?? "",
        active: template.active,
      });
    } else {
      setForm(empty);
    }
  }, [template, empty]);

  const visaConf = form.destinationCountry ? getCountryVisaConfig(form.destinationCountry) : null;
  const visaOptions: string[] = visaConf
    ? Object.values(visaConf.categories).flatMap((arr: any) =>
        Array.isArray(arr) ? arr.map((v: any) => v.label as string) : [],
      )
    : ["Tourist Visa", "Business Visa", "Student Visa", "Work Visa", "Visit Visa", "Transit Visa"];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        destinationCountry: form.destinationCountry || null,
        visaType: form.visaType || null,
        agencyFee: toCents(form.agencyFee),
        governmentFee: toCents(form.governmentFee),
        serviceFee: toCents(form.serviceFee),
        otherFee: toCents(form.otherFee),
        otherFeeLabel: form.otherFeeLabel || null,
        defaultPaymentType: form.defaultPaymentType,
        advancePercent: parseInt(form.advancePercent) || 50,
        description: form.description || null,
        active: form.active,
      };
      if (isEdit && template) {
        return apiRequest("PATCH", `/api/fee-templates/${template.id}`, payload);
      }
      return apiRequest("POST", `/api/tenants/${tenantId}/fee-templates`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "fee-templates"] });
      toast({ title: isEdit ? "Template updated" : "Template created" });
      onOpenChange(false);
      setForm(empty);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Fee Template" : "New Fee Template"}</DialogTitle>
          <DialogDescription>Reusable fee preset linked to a country and visa type.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Template name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Schengen Tourist Visa - France" data-testid="input-template-name" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Destination country</Label>
              <Select value={form.destinationCountry} onValueChange={(v) => setForm({ ...form, destinationCountry: v, visaType: "" })}>
                <SelectTrigger data-testid="select-template-country"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES_LIST.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visa type</Label>
              <Select value={form.visaType} onValueChange={(v) => setForm({ ...form, visaType: v })}>
                <SelectTrigger data-testid="select-template-visa-type"><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  {visaOptions.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Agency fee</Label>
              <Input type="number" step="0.01" value={form.agencyFee}
                onChange={(e) => setForm({ ...form, agencyFee: e.target.value })}
                placeholder="0.00" data-testid="input-template-agency-fee" />
            </div>
            <div className="space-y-2">
              <Label>Government fee</Label>
              <Input type="number" step="0.01" value={form.governmentFee}
                onChange={(e) => setForm({ ...form, governmentFee: e.target.value })}
                placeholder="0.00" data-testid="input-template-government-fee" />
            </div>
            <div className="space-y-2">
              <Label>Service charge</Label>
              <Input type="number" step="0.01" value={form.serviceFee}
                onChange={(e) => setForm({ ...form, serviceFee: e.target.value })}
                placeholder="0.00" data-testid="input-template-service-fee" />
            </div>
            <div className="space-y-2">
              <Label>Other fee</Label>
              <Input type="number" step="0.01" value={form.otherFee}
                onChange={(e) => setForm({ ...form, otherFee: e.target.value })}
                placeholder="0.00" data-testid="input-template-other-fee" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Other fee label</Label>
              <Input value={form.otherFeeLabel}
                onChange={(e) => setForm({ ...form, otherFeeLabel: e.target.value })}
                placeholder="e.g. Courier, VFS, biometrics" data-testid="input-template-other-fee-label" />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2 sm:col-span-2">
              <Label>Default payment type</Label>
              <Select value={form.defaultPaymentType} onValueChange={(v) => setForm({ ...form, defaultPaymentType: v })}>
                <SelectTrigger data-testid="select-template-payment-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PAYMENT_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.defaultPaymentType === "advance" && (
              <div className="space-y-2">
                <Label>Advance %</Label>
                <Input type="number" min={1} max={99} value={form.advancePercent}
                  onChange={(e) => setForm({ ...form, advancePercent: e.target.value })}
                  data-testid="input-template-advance-percent" />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Internal notes about this template..." data-testid="input-template-description" />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="template-active" className="font-medium">Active</Label>
              <p className="text-xs text-muted-foreground">Inactive templates won't appear in invoice creation.</p>
            </div>
            <Switch id="template-active" checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
              data-testid="switch-template-active" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => {
            if (!form.name.trim()) {
              toast({ title: "Template name is required", variant: "destructive" });
              return;
            }
            saveMutation.mutate();
          }} disabled={saveMutation.isPending} data-testid="button-save-template">
            {saveMutation.isPending ? "Saving..." : (isEdit ? "Save changes" : "Create template")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Invoice Settings tab
// ============================================================
function InvoiceSettingsTab({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<InvoiceSettings | null>({
    queryKey: ["/api/tenants", tenantId, "invoice-settings"],
  });

  const [form, setForm] = useState({
    companyName: "", companyAddress: "", companyEmail: "", companyPhone: "", taxId: "",
    currency: "USD", taxRate: "0", taxLabel: "Tax", invoicePrefix: "INV",
    paymentTerms: "Due on receipt", paymentInstructions: "", bankDetails: "",
    footerText: "", notes: "",
  });
  const [hydrated, setHydrated] = useState(false);

  useMemo(() => {
    if (settings && !hydrated) {
      setForm({
        companyName: settings.companyName ?? "",
        companyAddress: settings.companyAddress ?? "",
        companyEmail: settings.companyEmail ?? "",
        companyPhone: settings.companyPhone ?? "",
        taxId: settings.taxId ?? "",
        currency: settings.currency,
        taxRate: ((settings.taxRate ?? 0) / 100).toString(),
        taxLabel: settings.taxLabel ?? "Tax",
        invoicePrefix: settings.invoicePrefix,
        paymentTerms: settings.paymentTerms ?? "",
        paymentInstructions: settings.paymentInstructions ?? "",
        bankDetails: settings.bankDetails ?? "",
        footerText: settings.footerText ?? "",
        notes: settings.notes ?? "",
      });
      setHydrated(true);
    }
  }, [settings, hydrated]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        taxRate: Math.round(parseFloat(form.taxRate || "0") * 100), // convert % to basis points
      };
      const res = await apiRequest("PUT", `/api/tenants/${tenantId}/invoice-settings`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoice-settings"] });
      toast({ title: "Settings saved" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading && !hydrated) {
    return <Card><CardContent className="p-8 text-center text-muted-foreground">Loading...</CardContent></Card>;
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Company information</CardTitle>
          <CardDescription>This appears on every invoice.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Company name</Label>
            <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} data-testid="input-company-name" />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea value={form.companyAddress} onChange={(e) => setForm({ ...form, companyAddress: e.target.value })} data-testid="input-company-address" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={form.companyEmail} onChange={(e) => setForm({ ...form, companyEmail: e.target.value })} data-testid="input-company-email" />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={form.companyPhone} onChange={(e) => setForm({ ...form, companyPhone: e.target.value })} data-testid="input-company-phone" />
            </div>
            <div className="space-y-2">
              <Label>Tax ID</Label>
              <Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} data-testid="input-tax-id" />
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger data-testid="select-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["USD", "EUR", "GBP", "CAD", "AUD", "INR", "AED", "SGD", "JPY"].map((c) =>
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Invoice prefix</Label>
              <Input value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} data-testid="input-invoice-prefix" />
            </div>
            <div className="space-y-2">
              <Label>Tax label</Label>
              <Input value={form.taxLabel} onChange={(e) => setForm({ ...form, taxLabel: e.target.value })} data-testid="input-tax-label" />
            </div>
            <div className="space-y-2">
              <Label>Tax rate (%)</Label>
              <Input type="number" step="0.01" min="0" max="100" value={form.taxRate}
                onChange={(e) => setForm({ ...form, taxRate: e.target.value })} data-testid="input-tax-rate" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Default payment terms</Label>
            <Input value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} data-testid="input-payment-terms" />
          </div>
          <div className="space-y-2">
            <Label>Payment instructions</Label>
            <Textarea value={form.paymentInstructions} onChange={(e) => setForm({ ...form, paymentInstructions: e.target.value })} data-testid="input-payment-instructions" />
          </div>
          <div className="space-y-2">
            <Label>Bank details</Label>
            <Textarea value={form.bankDetails} onChange={(e) => setForm({ ...form, bankDetails: e.target.value })} data-testid="input-bank-details" />
          </div>
          <div className="space-y-2">
            <Label>Footer text</Label>
            <Input value={form.footerText} onChange={(e) => setForm({ ...form, footerText: e.target.value })} data-testid="input-footer-text" />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-settings">
          <SettingsIcon className="w-4 h-4 mr-2" />
          {saveMutation.isPending ? "Saving..." : "Save settings"}
        </Button>
      </div>
    </div>
  );
}
