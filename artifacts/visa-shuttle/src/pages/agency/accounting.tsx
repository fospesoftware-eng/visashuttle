import { useState, useMemo, useEffect } from "react";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus, Trash2, Edit, Receipt, FileText, Banknote, Settings as SettingsIcon,
  TrendingUp, AlertCircle, CheckCircle2, Clock, Send, Eye, Download,
  ChevronDown, X, Mail, FileDown, Image as ImageIcon, Copy,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getCountryVisaConfig } from "@/data/country-visa-types";
import { PhoneInput, defaultPhoneCodeFrom } from "@/components/phone-input";
import type {
  FeeTemplate, InvoiceSettings, Invoice, InvoiceItem, Payment, Case,
} from "@workspace/db";
import { PAYMENT_METHODS } from "@/shared/schema-constants";

// ---------- helpers ----------
import { COUNTRIES as COUNTRIES_LIST, VISA_TYPES } from "@/shared/destinations";

// Master-derived fallback for visa-type pickers in fee templates: drop the
// "Schengen Visa" + "Other" labels (always-on filters don't need them).
const VISA_TYPE_FALLBACK = VISA_TYPES.filter(t => t !== "Other" && t !== "Schengen Visa");

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

// Reference-label hints per payment method — surfaces the right placeholder
// (UTR / UPI Txn / Auth Code…) in the "Record a payment" form.
const PAYMENT_REFERENCE_LABELS: Record<string, string> = {
  bank_transfer: "UTR / Bank reference",
  upi:           "UPI transaction ID",
  card:          "Auth code",
  cash:          "Receipt number (optional)",
  gateway:       "Gateway order ID",
  other:         "Reference (optional)",
};

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
// View modes:
//  - "invoices": dedicated Invoices page (only invoices, no extra tabs)
//  - "settings": Accounting Settings hub with sub-tabs (Overview, Payments,
//                Fee Templates, Invoice Template). This is what's reached from
//                the sidebar's "Accounting → Settings" entry.
interface AccountingPageProps {
  view?: "invoices" | "payments" | "settings";
  defaultSettingsTab?: "overview" | "payments" | "templates" | "invoice-template";
}

export default function AccountingPage({
  view = "invoices",
  defaultSettingsTab = "overview",
}: AccountingPageProps = {}) {
  const { data: authData } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;
  const [settingsTab, setSettingsTab] = useState<string>(defaultSettingsTab);

  useEffect(() => { setSettingsTab(defaultSettingsTab); }, [defaultSettingsTab]);

  if (!tenantId) {
    return (
      <DashboardLayout type="agency">
        <div className="p-8">Loading...</div>
      </DashboardLayout>
    );
  }

  // Invoices-only view (the only thing left under "Accounting" in the sidebar)
  if (view === "invoices") {
    return (
      <DashboardLayout type="agency">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Invoices</h1>
            <p className="text-muted-foreground">
              Create, send, and track all customer invoices.
            </p>
          </div>
          <InvoicesTab tenantId={tenantId} />
        </div>
      </DashboardLayout>
    );
  }

  // Standalone Payments page — sidebar entry "Accounting → Payments". Lists
  // every payment ever recorded against any invoice for this tenant, with
  // a "Record Payment" action and per-row gateway payment-link sharing.
  if (view === "payments") {
    return (
      <DashboardLayout type="agency">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Payments</h1>
            <p className="text-muted-foreground">
              Every payment recorded against your invoices, in one place. Record a payment manually or share a gateway payment link — confirmed gateway payments auto-credit the invoice.
            </p>
          </div>
          <PaymentsTab tenantId={tenantId} showRecordAction />
        </div>
      </DashboardLayout>
    );
  }

  // Settings hub — Overview / Payments / Fee Templates / Invoice Template
  const settingsTitle: Record<string, { title: string; subtitle: string }> = {
    overview:           { title: "Accounting Settings", subtitle: "Overview of billing, tax, and revenue." },
    payments:           { title: "Payments",            subtitle: "Every payment recorded against your invoices, in one place." },
    templates:          { title: "Fee Templates",       subtitle: "Reusable line items for faster invoicing." },
    "invoice-template": { title: "Invoice Template",    subtitle: "Branding, logo, currency, tax, and payment instructions." },
  };
  const header = settingsTitle[settingsTab] ?? settingsTitle.overview;

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">{header.title}</h1>
          <p className="text-muted-foreground">{header.subtitle}</p>
        </div>

        <Tabs value={settingsTab} onValueChange={setSettingsTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="payments" data-testid="tab-payments">Payments</TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">Fee Templates</TabsTrigger>
            <TabsTrigger value="invoice-template" data-testid="tab-invoice-template">Invoice Template</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab tenantId={tenantId} onJump={setSettingsTab} /></TabsContent>
          <TabsContent value="payments"><PaymentsTab tenantId={tenantId} /></TabsContent>
          <TabsContent value="templates"><FeeTemplatesTab tenantId={tenantId} /></TabsContent>
          <TabsContent value="invoice-template"><InvoiceSettingsTab tenantId={tenantId} /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

// ============================================================
// Payments tab — tenant-wide payments list
// ============================================================
function PaymentsTab({
  tenantId,
  showRecordAction = false,
}: { tenantId: string; showRecordAction?: boolean }) {
  const { toast } = useToast();
  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/tenants", tenantId, "payments"],
  });
  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/tenants", tenantId, "invoices"],
  });
  const { data: settings } = useQuery<InvoiceSettings | null>({
    queryKey: ["/api/tenants", tenantId, "invoice-settings"],
  });
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const invoicesById = useMemo(() => {
    const m = new Map<string, Invoice>();
    invoices.forEach((inv) => m.set(inv.id, inv));
    return m;
  }, [invoices]);

  const currency = settings?.currency ?? "USD";

  const sortedPayments = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return [...payments]
      .filter((p) => {
        if (methodFilter !== "all" && p.method !== methodFilter) return false;
        if (!term) return true;
        const inv = invoicesById.get(p.invoiceId);
        return (
          (inv?.invoiceNumber || "").toLowerCase().includes(term) ||
          (inv?.customerName || "").toLowerCase().includes(term) ||
          (p.reference || "").toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const ta = a.paidAt ? new Date(a.paidAt).getTime() : 0;
        const tb = b.paidAt ? new Date(b.paidAt).getTime() : 0;
        return tb - ta;
      });
  }, [payments, invoicesById, methodFilter, searchTerm]);

  const totalCollected = sortedPayments.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/payments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoices", "stats"] });
      toast({ title: "Payment removed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // ----- Record Payment dialog state (only used when showRecordAction) -----
  // Lists of unpaid invoices the staff can pick from + manual record fields.
  // The "Send Payment Link" mode lazily generates a public payment URL via
  // /api/invoices/:id/share-link. The customer then pays via Cashfree on the
  // public page, which auto-credits a payment row through
  // /api/public/invoice/:token/confirm — so balances reconcile automatically.
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordInvoiceId, setRecordInvoiceId] = useState<string>("");
  const [recordMode, setRecordMode] = useState<"manual" | "link">("manual");
  const [recordAmount, setRecordAmount] = useState<string>("");
  const [recordMethod, setRecordMethod] = useState<string>("cash");
  const [recordRef, setRecordRef] = useState<string>("");
  const [recordNotes, setRecordNotes] = useState<string>("");
  const [recordLinkUrl, setRecordLinkUrl] = useState<string>("");
  const [recordLinkCopied, setRecordLinkCopied] = useState(false);

  const unpaidInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        if (inv.status === "cancelled") return false;
        const bal = Math.max(0, (inv.total ?? 0) - (inv.paidAmount ?? 0));
        return bal > 0;
      })
      .sort((a, b) => {
        const ta = a.issuedAt ? new Date(a.issuedAt).getTime() : 0;
        const tb = b.issuedAt ? new Date(b.issuedAt).getTime() : 0;
        return tb - ta;
      });
  }, [invoices]);

  const recordSelectedInvoice = invoicesById.get(recordInvoiceId);
  const recordSelectedBalance = recordSelectedInvoice
    ? Math.max(0, (recordSelectedInvoice.total ?? 0) - (recordSelectedInvoice.paidAmount ?? 0))
    : 0;

  const resetRecordForm = () => {
    setRecordInvoiceId("");
    setRecordMode("manual");
    setRecordAmount("");
    setRecordMethod("cash");
    setRecordRef("");
    setRecordNotes("");
    setRecordLinkUrl("");
    setRecordLinkCopied(false);
  };

  const recordPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!recordInvoiceId) throw new Error("Pick an invoice");
      const cents = toCents(recordAmount);
      if (cents <= 0) throw new Error("Enter an amount greater than zero");
      const res = await apiRequest("POST", `/api/invoices/${recordInvoiceId}/payments`, {
        amount: cents,
        method: recordMethod,
        reference: recordRef || null,
        notes: recordNotes || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "invoices", "stats"] });
      toast({ title: "Payment recorded" });
      setRecordOpen(false);
      resetRecordForm();
    },
    onError: (e: Error) =>
      toast({ title: "Could not record payment", description: e.message, variant: "destructive" }),
  });

  const generateLinkMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await apiRequest("POST", `/api/invoices/${invoiceId}/share-link`, {});
      return res.json() as Promise<{ token: string; url: string }>;
    },
    onSuccess: (data) => {
      setRecordLinkUrl(data.url);
      setRecordLinkCopied(false);
    },
    onError: (e: Error) =>
      toast({ title: "Could not generate link", description: e.message, variant: "destructive" }),
  });

  // Pull labels from the shared PAYMENT_METHODS enum so every method
  // (including auto-credited "gateway" rows from the public payment page,
  // plus "upi") is first-class in this list. Keeps the agency UI in sync
  // with whatever the backend whitelist allows.
  const methodLabel = (m: string) =>
    PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;

  const methodBadgeClass = (m: string) => ({
    cash:          "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    card:          "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
    bank_transfer: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
    upi:           "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300",
    gateway:       "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
    online:        "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
    other:         "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  } as Record<string, string>)[m] ?? "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card data-testid="kpi-payments-count">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Payments Recorded</p>
                <p className="text-2xl font-bold mt-1">{payments.length}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted text-blue-600 dark:text-blue-400">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="kpi-payments-collected">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collected (filtered)</p>
                <p className="text-2xl font-bold mt-1">{fmtMoney(totalCollected, currency)}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card data-testid="kpi-payments-invoices">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Invoices with Payments</p>
                <p className="text-2xl font-bold mt-1">
                  {new Set(payments.map((p) => p.invoiceId)).size}
                </p>
              </div>
              <div className="p-2 rounded-lg bg-muted text-violet-600 dark:text-violet-400">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by invoice #, customer, or reference…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
          data-testid="input-payments-search"
        />
        <Select value={methodFilter} onValueChange={setMethodFilter}>
          <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-payment-method">
            <SelectValue placeholder="Filter by method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All methods</SelectItem>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showRecordAction && (
          <Button
            onClick={() => { resetRecordForm(); setRecordOpen(true); }}
            className="text-white shrink-0"
            style={{ background: "linear-gradient(90deg, #4055FF 0%, #9033F5 50%, #FF2060 100%)" }}
            data-testid="button-open-record-payment"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Record Payment
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading payments...</div>
          ) : sortedPayments.length === 0 ? (
            <div className="p-12 text-center">
              <Banknote className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="font-medium">No payments yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Open an invoice and record a payment — it will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPayments.map((p) => {
                  const inv = invoicesById.get(p.invoiceId);
                  return (
                    <TableRow key={p.id} data-testid={`row-payment-${p.id}`}>
                      <TableCell className="text-sm">{p.paidAt ? fmtDate(p.paidAt) : "—"}</TableCell>
                      <TableCell className="font-mono text-sm">{inv?.invoiceNumber ?? "—"}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{inv?.customerName ?? "—"}</div>
                        {inv?.customerEmail && (
                          <div className="text-xs text-muted-foreground">{inv.customerEmail}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={methodBadgeClass(p.method)} variant="secondary">
                          {methodLabel(p.method)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.reference || "—"}</TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {fmtMoney(p.amount, currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {inv && (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Open invoice"
                              onClick={() => { window.location.href = `/app/accounting/invoices?open=${inv.id}`; }}
                              data-testid={`button-open-invoice-${p.id}`}
                            >
                              <FileText className="w-4 h-4 text-muted-foreground" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm("Remove this payment? The invoice balance will be updated.")) {
                                deleteMutation.mutate(p.id);
                              }
                            }}
                            data-testid={`button-delete-payment-${p.id}`}
                          >
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

      {/* Record Payment dialog — manual entry OR generate a Cashfree payment
          link the agency can share. The public payment page already
          auto-credits a payment row on successful Cashfree confirmation. */}
      <Dialog
        open={recordOpen}
        onOpenChange={(o) => {
          setRecordOpen(o);
          if (!o) resetRecordForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Record a payment</DialogTitle>
            <DialogDescription>
              Pick an invoice with an outstanding balance, then either log a payment your agency already collected, or send the customer a payment link that auto-credits when paid.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Invoice</label>
              <Select
                value={recordInvoiceId}
                onValueChange={(v) => {
                  setRecordInvoiceId(v);
                  setRecordLinkUrl("");
                  const inv = invoicesById.get(v);
                  if (inv) {
                    const bal = Math.max(0, (inv.total ?? 0) - (inv.paidAmount ?? 0));
                    setRecordAmount(fromCents(bal));
                  }
                }}
              >
                <SelectTrigger data-testid="select-record-invoice">
                  <SelectValue placeholder={
                    unpaidInvoices.length === 0
                      ? "No invoices with an outstanding balance"
                      : "Select an invoice…"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {unpaidInvoices.map((inv) => {
                    const bal = Math.max(0, (inv.total ?? 0) - (inv.paidAmount ?? 0));
                    return (
                      <SelectItem key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} · {inv.customerName} · {fmtMoney(bal, inv.currency || currency)} due
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {recordSelectedInvoice && (
                <p className="text-xs text-muted-foreground">
                  Balance due: {fmtMoney(recordSelectedBalance, recordSelectedInvoice.currency || currency)}
                </p>
              )}
            </div>

            {recordInvoiceId && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={recordMode === "manual" ? "default" : "outline"}
                  onClick={() => setRecordMode("manual")}
                  data-testid="button-mode-manual"
                >
                  <Banknote className="w-4 h-4 mr-1.5" /> Log manually
                </Button>
                <Button
                  type="button"
                  variant={recordMode === "link" ? "default" : "outline"}
                  onClick={() => { setRecordMode("link"); setRecordLinkUrl(""); }}
                  data-testid="button-mode-link"
                >
                  <Send className="w-4 h-4 mr-1.5" /> Send payment link
                </Button>
              </div>
            )}

            {recordInvoiceId && recordMode === "manual" && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Amount</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={recordAmount}
                      onChange={(e) => setRecordAmount(e.target.value)}
                      data-testid="input-record-amount"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground">Method</label>
                    <Select value={recordMethod} onValueChange={setRecordMethod}>
                      <SelectTrigger data-testid="select-record-method"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">
                    {PAYMENT_REFERENCE_LABELS[recordMethod] ?? "Reference (optional)"}
                  </label>
                  <Input
                    value={recordRef}
                    onChange={(e) => setRecordRef(e.target.value)}
                    data-testid="input-record-ref"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Notes (optional)</label>
                  <Input
                    value={recordNotes}
                    onChange={(e) => setRecordNotes(e.target.value)}
                    data-testid="input-record-notes"
                  />
                </div>
              </div>
            )}

            {recordInvoiceId && recordMode === "link" && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Generate a secure payment link the customer can open to pay online via card, UPI, or net-banking. The invoice will be auto-credited on successful payment.
                </p>
                {!recordLinkUrl ? (
                  <Button
                    type="button"
                    onClick={() => generateLinkMutation.mutate(recordInvoiceId)}
                    disabled={generateLinkMutation.isPending}
                    data-testid="button-generate-link"
                  >
                    {generateLinkMutation.isPending ? "Generating…" : "Generate payment link"}
                  </Button>
                ) : (
                  <>
                    <div className="flex gap-1.5">
                      <Input
                        readOnly
                        value={recordLinkUrl}
                        className="text-xs font-mono"
                        onFocus={(e) => e.currentTarget.select()}
                        data-testid="input-record-link-url"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        onClick={async () => {
                          try { await navigator.clipboard.writeText(recordLinkUrl); } catch { /* ignore */ }
                          setRecordLinkCopied(true);
                          window.setTimeout(() => setRecordLinkCopied(false), 1500);
                        }}
                        data-testid="button-copy-record-link"
                      >
                        {recordLinkCopied
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <a
                        href={`mailto:${recordSelectedInvoice?.customerEmail ?? ""}?subject=${encodeURIComponent(`Invoice ${recordSelectedInvoice?.invoiceNumber ?? ""}`)}&body=${encodeURIComponent(`Hi ${recordSelectedInvoice?.customerName ?? ""},\n\nYou can view and pay your invoice here:\n${recordLinkUrl}\n\nThanks!`)}`}
                        className="text-xs rounded-md border px-2 py-1.5 text-center hover-elevate"
                        data-testid="button-record-share-email"
                      >Email</a>
                      <a
                        href={`https://wa.me/${(recordSelectedInvoice?.customerPhone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(`Invoice ${recordSelectedInvoice?.invoiceNumber ?? ""}: ${recordLinkUrl}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs rounded-md border px-2 py-1.5 text-center hover-elevate"
                        data-testid="button-record-share-whatsapp"
                      >WhatsApp</a>
                      <a
                        href={`sms:${recordSelectedInvoice?.customerPhone ?? ""}?body=${encodeURIComponent(`Invoice ${recordSelectedInvoice?.invoiceNumber ?? ""}: ${recordLinkUrl}`)}`}
                        className="text-xs rounded-md border px-2 py-1.5 text-center hover-elevate"
                        data-testid="button-record-share-sms"
                      >SMS</a>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Once paid, the payment will appear in this list automatically.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRecordOpen(false)} data-testid="button-cancel-record">
              {recordMode === "link" && recordLinkUrl ? "Done" : "Cancel"}
            </Button>
            {recordMode === "manual" && (
              <Button
                onClick={() => recordPaymentMutation.mutate()}
                disabled={!recordInvoiceId || recordPaymentMutation.isPending}
                className="text-white"
                style={{ background: "linear-gradient(90deg, #4055FF 0%, #9033F5 50%, #FF2060 100%)" }}
                data-testid="button-submit-record-payment"
              >
                {recordPaymentMutation.isPending ? "Saving…" : "Record Payment"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Overview tab — KPIs + recent invoices
// ============================================================
function OverviewTab({ tenantId, onJump }: { tenantId: string; onJump: (t: string) => void }) {
  const { toast } = useToast();
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
  const { data: settings } = useQuery<InvoiceSettings | null>({
    queryKey: ["/api/tenants", tenantId, "invoice-settings"],
  });

  const now = new Date();
  const [reportYear, setReportYear] = useState<string>(String(now.getFullYear()));
  const [reportMonth, setReportMonth] = useState<string>(String(now.getMonth() + 1));
  const [downloading, setDownloading] = useState(false);

  const downloadGstReport = async () => {
    setDownloading(true);
    try {
      const url = `/api/tenants/${tenantId}/gst-reports/monthly?year=${reportYear}&month=${reportMonth}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to download report" }));
        throw new Error(err.error ?? "Download failed");
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `GST-Report-${reportYear}-${String(reportMonth).padStart(2, "0")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      toast({ title: "GST report downloaded" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  const displayCurrency = settings?.currency ?? "USD";
  const kpis = [
    { label: "Total Billed",    value: fmtMoney(stats?.totalBilled ?? 0,      displayCurrency), icon: Receipt,    color: "text-blue-600 dark:text-blue-400" },
    { label: "Total Collected", value: fmtMoney(stats?.totalPaid ?? 0,        displayCurrency), icon: Banknote,   color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Outstanding",     value: fmtMoney(stats?.totalOutstanding ?? 0, displayCurrency), icon: Clock,      color: "text-amber-600 dark:text-amber-400" },
    { label: "Overdue",         value: fmtMoney(stats?.totalOverdue ?? 0,     displayCurrency), icon: AlertCircle, color: "text-red-600 dark:text-red-400" },
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => { window.location.href = "/app/accounting"; }}
            data-testid="button-view-all-invoices"
          >
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

      {settings?.gstEnabled && (
        <Card data-testid="card-gst-report">
          <CardHeader>
            <CardTitle>GST monthly report</CardTitle>
            <CardDescription>
              Download a GSTR-1 style Excel workbook for any month.
              {settings.gstin ? ` GSTIN: ${settings.gstin}` : " (Add a GSTIN in Settings.)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Year</Label>
                <Select value={reportYear} onValueChange={setReportYear}>
                  <SelectTrigger className="w-28" data-testid="select-report-year"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 6 }, (_, i) => now.getFullYear() - i).map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Month</Label>
                <Select value={reportMonth} onValueChange={setReportMonth}>
                  <SelectTrigger className="w-40" data-testid="select-report-month"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={downloadGstReport} disabled={downloading} data-testid="button-download-gst-report">
                <Download className="w-4 h-4 mr-2" />
                {downloading ? "Preparing..." : "Download Excel"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

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
                      <TableCell className="text-right font-medium">{fmtMoney(inv.total, displayCurrency)}</TableCell>
                      <TableCell className="text-right text-amber-700 dark:text-amber-400 font-medium">
                        {fmtMoney(Math.max(0, inv.total - inv.paidAmount), displayCurrency)}
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

  // Honor "?open=<invoiceId>" so deep-links from the Payments page (and
  // anywhere else) auto-open the invoice detail dialog. We strip the query
  // param after consuming it so a back/forward navigation doesn't reopen it.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const openId = params.get("open");
    if (openId) {
      setViewInvoiceId(openId);
      params.delete("open");
      const qs = params.toString();
      const newUrl = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  const { data: invoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/tenants", tenantId, "invoices"],
  });
  const { data: settings } = useQuery<InvoiceSettings | null>({
    queryKey: ["/api/tenants", tenantId, "invoice-settings"],
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
                      <TableCell className="text-right font-medium">{fmtMoney(inv.total, settings?.currency ?? inv.currency)}</TableCell>
                      <TableCell className="text-right text-emerald-700 dark:text-emerald-400">
                        {fmtMoney(inv.paidAmount, settings?.currency ?? inv.currency)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={balance > 0 ? "text-amber-700 dark:text-amber-400 font-medium" : "text-muted-foreground"}>
                          {fmtMoney(balance, settings?.currency ?? inv.currency)}
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
type DraftItem = {
  description: string;
  category: string;
  quantity: number;
  unitPrice: string;
  hsnCode?: string;
  taxRate?: string; // percent string, e.g. "18"
  taxable: boolean; // false for government fees etc. — line excluded from tax
};

// Default taxability for a category. Government fees are non-taxable by default.
const defaultTaxableForCategory = (category: string) => category !== "government_fee";

const GST_STATES: Array<{ code: string; name: string }> = [
  { code: "01", name: "Jammu & Kashmir" }, { code: "02", name: "Himachal Pradesh" },
  { code: "03", name: "Punjab" }, { code: "04", name: "Chandigarh" },
  { code: "05", name: "Uttarakhand" }, { code: "06", name: "Haryana" },
  { code: "07", name: "Delhi" }, { code: "08", name: "Rajasthan" },
  { code: "09", name: "Uttar Pradesh" }, { code: "10", name: "Bihar" },
  { code: "11", name: "Sikkim" }, { code: "12", name: "Arunachal Pradesh" },
  { code: "13", name: "Nagaland" }, { code: "14", name: "Manipur" },
  { code: "15", name: "Mizoram" }, { code: "16", name: "Tripura" },
  { code: "17", name: "Meghalaya" }, { code: "18", name: "Assam" },
  { code: "19", name: "West Bengal" }, { code: "20", name: "Jharkhand" },
  { code: "21", name: "Odisha" }, { code: "22", name: "Chhattisgarh" },
  { code: "23", name: "Madhya Pradesh" }, { code: "24", name: "Gujarat" },
  { code: "26", name: "Dadra & Nagar Haveli and Daman & Diu" },
  { code: "27", name: "Maharashtra" }, { code: "29", name: "Karnataka" },
  { code: "30", name: "Goa" }, { code: "31", name: "Lakshadweep" },
  { code: "32", name: "Kerala" }, { code: "33", name: "Tamil Nadu" },
  { code: "34", name: "Puducherry" }, { code: "35", name: "Andaman & Nicobar Islands" },
  { code: "36", name: "Telangana" }, { code: "37", name: "Andhra Pradesh" },
  { code: "38", name: "Ladakh" },
  { code: "96", name: "Foreign Country" }, { code: "97", name: "Other Territory" },
];

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
  const { data: authData } = useCurrentUser();
  const agencyPhoneCode = defaultPhoneCodeFrom((authData?.tenant as any)?.baseCountry ?? (authData?.tenant as any)?.country ?? (authData?.tenant as any)?.contactPhone);

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
    { description: "", category: "agency_fee", quantity: 1, unitPrice: "", hsnCode: "", taxRate: "", taxable: true },
  ]);
  const [customerGstin, setCustomerGstin] = useState("");
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState<string>("");
  const [reverseCharge, setReverseCharge] = useState(false);

  const gstEnabled = !!settings?.gstEnabled;
  const supplierStateCode = settings?.gstStateCode ?? "";
  const effectivePosCode = placeOfSupplyCode || supplierStateCode;
  const isIntraState = !!supplierStateCode && !!effectivePosCode && supplierStateCode === effectivePosCode;

  const reset = () => {
    setCustomerName(""); setCustomerEmail(""); setCustomerPhone("");
    setDestinationCountry(""); setVisaType(""); setCaseId("");
    setPaymentType("upfront"); setAdvancePercent("50");
    setStatus("draft"); setDueDate(""); setNotes("");
    setItems([{ description: "", category: "agency_fee", quantity: 1, unitPrice: "", hsnCode: "", taxRate: "", taxable: true }]);
    setCustomerGstin(""); setPlaceOfSupplyCode(""); setReverseCharge(false);
  };

  const applyTemplate = (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    const firstCountry = (tpl.destinationCountries && tpl.destinationCountries[0]) ?? tpl.destinationCountry ?? null;
    if (firstCountry) setDestinationCountry(firstCountry);
    if (tpl.visaType) setVisaType(tpl.visaType);
    setPaymentType(tpl.defaultPaymentType);
    if (tpl.advancePercent != null) setAdvancePercent(String(tpl.advancePercent));
    const next: DraftItem[] = [];
    const defRate = gstEnabled ? ((settings?.taxRate ?? 0) / 100).toString() : "";
    if (tpl.agencyFee > 0)     next.push({ description: "Agency Fee",     category: "agency_fee",     quantity: 1, unitPrice: fromCents(tpl.agencyFee),     hsnCode: "", taxRate: defRate, taxable: true });
    if (tpl.governmentFee > 0) next.push({ description: "Government Fee", category: "government_fee", quantity: 1, unitPrice: fromCents(tpl.governmentFee), hsnCode: "", taxRate: "",      taxable: false });
    if (tpl.serviceFee > 0)    next.push({ description: "Service Charge", category: "service_charge", quantity: 1, unitPrice: fromCents(tpl.serviceFee),    hsnCode: "", taxRate: defRate, taxable: true });
    if (tpl.otherFee > 0)      next.push({ description: tpl.otherFeeLabel ?? "Other", category: "other", quantity: 1, unitPrice: fromCents(tpl.otherFee),  hsnCode: "", taxRate: defRate, taxable: true });
    if (next.length === 0) next.push({ description: "", category: "agency_fee", quantity: 1, unitPrice: "", hsnCode: "", taxRate: defRate, taxable: true });
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
  // Per-line GST when enabled, else fall back to flat tax rate.
  // Empty/blank rate => fall back to settings.taxRate; explicit "0" => exempt.
  // Lines flagged `taxable: false` (e.g. government fees) are skipped entirely.
  const perLineTax = items.reduce((s, i) => {
    if (!i.taxable) return s;
    const amt = toCents(i.unitPrice) * (i.quantity || 1);
    const raw = (i.taxRate ?? "").trim();
    const rateBps = gstEnabled
      ? (raw === "" ? taxRate : Math.round((parseFloat(raw) || 0) * 100))
      : taxRate;
    return s + Math.round((amt * rateBps) / 10000);
  }, 0);
  const taxedSubtotalCents = items
    .filter((i) => i.taxable)
    .reduce((s, i) => s + toCents(i.unitPrice) * (i.quantity || 1), 0);
  const taxAmount = gstEnabled ? perLineTax : Math.round((taxedSubtotalCents * taxRate) / 10000);
  // Mirror server contract: only split when supplier state is set.
  const canSplit = gstEnabled && !!supplierStateCode;
  const cgst = canSplit && isIntraState ? Math.round(taxAmount / 2) : 0;
  const sgst = canSplit && isIntraState ? taxAmount - cgst : 0;
  const igst = canSplit && !isIntraState ? taxAmount : 0;
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
        customerGstin: gstEnabled ? (customerGstin.trim() || null) : null,
        placeOfSupplyCode: gstEnabled ? (placeOfSupplyCode || null) : null,
        placeOfSupplyName: gstEnabled
          ? (GST_STATES.find((s) => s.code === placeOfSupplyCode)?.name ?? null)
          : null,
        reverseCharge: gstEnabled ? reverseCharge : false,
        items: items
          .filter((i) => i.description.trim() && toCents(i.unitPrice) > 0)
          .map((i, idx) => ({
            description: i.description.trim(),
            category: i.category,
            quantity: i.quantity || 1,
            unitPrice: toCents(i.unitPrice),
            amount: toCents(i.unitPrice) * (i.quantity || 1),
            sortOrder: idx,
            hsnCode: gstEnabled ? (i.hsnCode?.trim() || null) : null,
            // Send null when blank so the server falls back to settings.taxRate;
            // an explicit "0" is preserved as exempt. Non-taxable lines are
            // excluded server-side regardless of this rate.
            taxRate: gstEnabled
              ? ((i.taxRate ?? "").trim() === "" ? null : Math.round((parseFloat(i.taxRate || "0") || 0) * 100))
              : 0,
            taxable: i.taxable,
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
    : VISA_TYPE_FALLBACK;

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
              <PhoneInput
                value={customerPhone}
                onChange={setCustomerPhone}
                defaultCountryCode={agencyPhoneCode}
                testId="input-customer-phone"
              />
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

          {/* GST customer details (only when GST is enabled in settings) */}
          {gstEnabled && (
            <>
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">GST details</Label>
                    <p className="text-xs text-muted-foreground">
                      Supplier state: {supplierStateCode ? `${supplierStateCode} - ${settings?.gstStateName ?? ""}` : "not set (configure in Settings)"}
                    </p>
                  </div>
                  <Badge variant="outline" data-testid="badge-gst-mode">
                    {!supplierStateCode
                      ? "Flat tax (set supplier state)"
                      : isIntraState
                      ? "Intra-state (CGST + SGST)"
                      : "Inter-state (IGST)"}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Customer GSTIN (optional)</Label>
                    <Input value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                      placeholder="15-char GSTIN" maxLength={15} data-testid="input-customer-gstin" />
                  </div>
                  <div className="space-y-2">
                    <Label>Place of supply</Label>
                    <Select value={placeOfSupplyCode || supplierStateCode} onValueChange={setPlaceOfSupplyCode}>
                      <SelectTrigger data-testid="select-place-of-supply"><SelectValue placeholder="Select state" /></SelectTrigger>
                      <SelectContent>
                        {GST_STATES.map((s) => (
                          <SelectItem key={s.code} value={s.code}>{s.code} - {s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={reverseCharge} onCheckedChange={setReverseCharge} data-testid="switch-reverse-charge" />
                  <Label className="font-normal">Reverse charge applicable</Label>
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Line items</Label>
              <Button type="button" variant="outline" size="sm" onClick={() =>
                setItems([...items, { description: "", category: "agency_fee", quantity: 1, unitPrice: "", hsnCode: "", taxRate: gstEnabled ? ((settings?.taxRate ?? 0) / 100).toString() : "", taxable: true }])
              } data-testid="button-add-item">
                <Plus className="w-4 h-4 mr-1" /> Add item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="space-y-2 border-b pb-2 last:border-b-0 last:pb-0">
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-12 sm:col-span-4 space-y-1">
                      {idx === 0 && <Label className="text-xs">Description</Label>}
                      <Input value={it.description} placeholder="Service description"
                        onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, description: e.target.value } : x))}
                        data-testid={`input-item-desc-${idx}`} />
                    </div>
                    <div className="col-span-6 sm:col-span-3 space-y-1">
                      {idx === 0 && <Label className="text-xs">Category</Label>}
                      <Select value={it.category}
                        onValueChange={(v) => setItems(items.map((x, i) => {
                          if (i !== idx) return x;
                          // Reset taxability to the new category's default whenever the
                          // category changes (gov fee → non-taxable; everything else → taxable).
                          return { ...x, category: v, taxable: defaultTaxableForCategory(v) };
                        }))}>
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
                  {gstEnabled && (
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-6 sm:col-span-4 space-y-1">
                        {idx === 0 && <Label className="text-xs">HSN / SAC code</Label>}
                        <Input value={it.hsnCode ?? ""} placeholder="e.g. 998551"
                          onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, hsnCode: e.target.value } : x))}
                          data-testid={`input-item-hsn-${idx}`}
                          disabled={!it.taxable} />
                      </div>
                      <div className="col-span-6 sm:col-span-3 space-y-1">
                        {idx === 0 && <Label className="text-xs">GST rate (%)</Label>}
                        <Input type="number" step="0.01" min="0" max="100"
                          placeholder={it.taxable ? "18" : "Non-taxable"} value={it.taxable ? (it.taxRate ?? "") : ""}
                          onChange={(e) => setItems(items.map((x, i) => i === idx ? { ...x, taxRate: e.target.value } : x))}
                          data-testid={`input-item-tax-rate-${idx}`}
                          disabled={!it.taxable} />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2 pl-1">
                    <Switch
                      checked={it.taxable}
                      onCheckedChange={(v) => setItems(items.map((x, i) => i === idx ? { ...x, taxable: v } : x))}
                      data-testid={`switch-item-taxable-${idx}`}
                    />
                    <Label className="font-normal text-xs text-muted-foreground">
                      {it.taxable
                        ? "Taxable (apply tax to this line)"
                        : "Non-taxable (e.g. government fee — tax is not applied)"}
                    </Label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg border p-4 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span data-testid="text-subtotal">{fmtMoney(subtotalCents, settings?.currency)}</span></div>
            {gstEnabled ? (
              <>
                {cgst > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>CGST</span><span data-testid="text-cgst">{fmtMoney(cgst, settings?.currency)}</span>
                  </div>
                )}
                {sgst > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>SGST</span><span data-testid="text-sgst">{fmtMoney(sgst, settings?.currency)}</span>
                  </div>
                )}
                {igst > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>IGST</span><span data-testid="text-igst">{fmtMoney(igst, settings?.currency)}</span>
                  </div>
                )}
              </>
            ) : taxRate > 0 ? (
              <div className="flex justify-between text-muted-foreground">
                <span>{settings?.taxLabel ?? "Tax"} ({(taxRate / 100).toFixed(2)}%)</span><span>{fmtMoney(taxAmount, settings?.currency)}</span>
              </div>
            ) : null}
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

  const [emailOpen, setEmailOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareCopied, setShareCopied] = useState(false);
  const downloadPdf = () => {
    if (!invoiceId) return;
    window.open(`/api/invoices/${invoiceId}/pdf`, "_blank", "noopener");
  };

  // Lazily generates a public payment-link the first time the agency
  // clicks "Share payment link", then caches the URL for subsequent clicks.
  const shareLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/invoices/${invoiceId}/share-link`, {});
      return res.json() as Promise<{ token: string; url: string }>;
    },
    onSuccess: (data) => {
      setShareUrl(data.url);
      setShareOpen(true);
    },
    onError: (e: Error) => toast({ title: "Could not generate link", description: e.message, variant: "destructive" }),
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
  const accent = settings?.invoiceAccentColor || undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {accent && <div className="h-1 -mt-6 -mx-6 mb-3 rounded-t-lg" style={{ backgroundColor: accent }} />}
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              {settings?.logoUrl && (
                <img
                  src={settings.logoUrl}
                  alt="Company logo"
                  className="h-12 w-12 object-contain rounded border bg-white p-1"
                  data-testid="img-invoice-logo"
                />
              )}
              <div className="min-w-0">
                <DialogTitle className="font-mono text-xl">{invoice.invoiceNumber}</DialogTitle>
                <DialogDescription>
                  Issued {fmtDate(invoice.issuedAt)} · Due {fmtDate(invoice.dueDate)}
                </DialogDescription>
              </div>
            </div>
            <Badge className={conf.className}>{conf.label}</Badge>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={downloadPdf} data-testid="button-download-pdf">
              <FileDown className="w-4 h-4 mr-1.5" /> Download PDF
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEmailOpen(true)} data-testid="button-email-invoice">
              <Mail className="w-4 h-4 mr-1.5" /> Email invoice
            </Button>
            <Popover
              open={shareOpen}
              onOpenChange={(open) => {
                if (open && !shareUrl && !shareLinkMutation.isPending) {
                  shareLinkMutation.mutate();
                  return;
                }
                setShareOpen(open);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={shareLinkMutation.isPending}
                  data-testid="button-share-payment-link"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  {shareLinkMutation.isPending ? "Generating…" : "Share payment link"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 space-y-2">
                <p className="text-sm font-medium">Public payment link</p>
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can view the invoice and pay online or offline.
                </p>
                <div className="flex gap-1.5">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="text-xs font-mono h-8"
                    data-testid="input-share-link-url"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 shrink-0"
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(shareUrl); } catch { /* ignore */ }
                      setShareCopied(true);
                      window.setTimeout(() => setShareCopied(false), 1500);
                    }}
                    data-testid="button-copy-share-link"
                  >
                    {shareCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <a
                    href={`mailto:${invoice.customerEmail ?? ""}?subject=${encodeURIComponent(`Invoice ${invoice.invoiceNumber}`)}&body=${encodeURIComponent(`Hi ${invoice.customerName},\n\nYou can view and pay your invoice here:\n${shareUrl}\n\nThanks!`)}`}
                    className="text-xs rounded-md border px-2 py-1.5 text-center hover-elevate"
                    data-testid="button-share-email"
                  >Email</a>
                  <a
                    href={`https://wa.me/${(invoice.customerPhone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(`Invoice ${invoice.invoiceNumber}: ${shareUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs rounded-md border px-2 py-1.5 text-center hover-elevate"
                    data-testid="button-share-whatsapp"
                  >WhatsApp</a>
                  <a
                    href={`sms:${invoice.customerPhone ?? ""}?body=${encodeURIComponent(`Invoice ${invoice.invoiceNumber}: ${shareUrl}`)}`}
                    className="text-xs rounded-md border px-2 py-1.5 text-center hover-elevate"
                    data-testid="button-share-sms"
                  >SMS</a>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </DialogHeader>
        <EmailInvoiceDialog
          invoiceId={invoiceId}
          defaultEmail={invoice.customerEmail}
          open={emailOpen}
          onOpenChange={setEmailOpen}
        />

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
                  const nonTaxable = (it as any).taxable === false;
                  return (
                    <TableRow key={it.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>{it.description}</span>
                          {nonTaxable && (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Non-taxable
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{cat?.label ?? it.category}</Badge></TableCell>
                      <TableCell className="text-right">{it.quantity}</TableCell>
                      <TableCell className="text-right">{fmtMoney(it.unitPrice, (settings?.currency ?? invoice.currency))}</TableCell>
                      <TableCell className="text-right font-medium">{fmtMoney(it.amount, (settings?.currency ?? invoice.currency))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{fmtMoney(invoice.subtotal, (settings?.currency ?? invoice.currency))}</span></div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground"><span>{settings?.taxLabel ?? "Tax"}</span><span>{fmtMoney(invoice.taxAmount, (settings?.currency ?? invoice.currency))}</span></div>
              )}
              <div className="flex justify-between font-semibold text-base border-t pt-1 mt-1"><span>Total</span><span>{fmtMoney(invoice.total, (settings?.currency ?? invoice.currency))}</span></div>
              <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><span>Paid</span><span>{fmtMoney(invoice.paidAmount, (settings?.currency ?? invoice.currency))}</span></div>
              <div className="flex justify-between font-semibold text-amber-700 dark:text-amber-400"><span>Balance due</span><span>{fmtMoney(balance, (settings?.currency ?? invoice.currency))}</span></div>
              {advanceTarget != null && (
                <div className="text-xs text-muted-foreground pt-1">
                  Advance ({invoice.advancePercent}%): {fmtMoney(advanceTarget, (settings?.currency ?? invoice.currency))}
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
                        <TableCell className="text-right font-medium">{fmtMoney(p.amount, (settings?.currency ?? invoice.currency))}</TableCell>
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
                  <Input
                    placeholder={PAYMENT_REFERENCE_LABELS[payMethod] ?? "Reference (optional)"}
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    data-testid="input-pay-ref"
                  />
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
  const { data: settings } = useQuery<InvoiceSettings | null>({
    queryKey: ["/api/tenants", tenantId, "invoice-settings"],
  });
  const tenantCurrency = settings?.currency ?? "USD";

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
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base">{tpl.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {tpl.visaType ?? "Any visa type"}
                      </CardDescription>
                      {(() => {
                        const countries = Array.from(new Set([
                          ...(tpl.destinationCountries ?? []),
                          ...(tpl.destinationCountry ? [tpl.destinationCountry] : []),
                        ]));
                        if (countries.length === 0) {
                          return <p className="text-xs text-muted-foreground mt-1.5 italic">Applies to any country</p>;
                        }
                        return (
                          <div className="flex flex-wrap gap-1 mt-1.5" data-testid={`countries-template-${tpl.id}`}>
                            {countries.slice(0, 4).map((c) => (
                              <Badge key={c} variant="outline" className="text-[10px] font-normal">{c}</Badge>
                            ))}
                            {countries.length > 4 && (
                              <Badge variant="outline" className="text-[10px] font-normal">+{countries.length - 4} more</Badge>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                    {!tpl.active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="space-y-1">
                    {tpl.agencyFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Agency</span><span>{fmtMoney(tpl.agencyFee, tenantCurrency)}</span></div>}
                    {tpl.governmentFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Government</span><span>{fmtMoney(tpl.governmentFee, tenantCurrency)}</span></div>}
                    {tpl.serviceFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span>{fmtMoney(tpl.serviceFee, tenantCurrency)}</span></div>}
                    {tpl.otherFee > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{tpl.otherFeeLabel ?? "Other"}</span><span>{fmtMoney(tpl.otherFee, tenantCurrency)}</span></div>}
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold"><span>Total</span><span>{fmtMoney(total, tenantCurrency)}</span></div>
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
    name: "", destinationCountries: [] as string[], visaType: "",
    agencyFee: "", governmentFee: "", serviceFee: "", otherFee: "", otherFeeLabel: "",
    defaultPaymentType: "upfront", advancePercent: "50", description: "", active: true,
  }), []);

  const [form, setForm] = useState(empty);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  // sync when template changes
  useMemo(() => {
    if (template) {
      const countries = Array.from(new Set([
        ...(template.destinationCountries ?? []),
        ...(template.destinationCountry ? [template.destinationCountry] : []),
      ]));
      setForm({
        name: template.name,
        destinationCountries: countries,
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

  // Visa options: union of categories across selected countries (or generic list when no country picked)
  const visaOptions: string[] = useMemo(() => {
    if (form.destinationCountries.length === 0) {
      return VISA_TYPE_FALLBACK;
    }
    const set = new Set<string>();
    for (const c of form.destinationCountries) {
      const conf = getCountryVisaConfig(c);
      if (conf) {
        for (const arr of Object.values(conf.categories)) {
          if (Array.isArray(arr)) arr.forEach((v: any) => set.add(v.label as string));
        }
      }
    }
    return set.size > 0 ? Array.from(set).sort() : VISA_TYPE_FALLBACK;
  }, [form.destinationCountries]);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRIES_LIST;
    return COUNTRIES_LIST.filter((c) => c.toLowerCase().includes(q));
  }, [countrySearch]);

  const toggleCountry = (c: string) =>
    setForm((f) => ({
      ...f,
      destinationCountries: f.destinationCountries.includes(c)
        ? f.destinationCountries.filter((x) => x !== c)
        : [...f.destinationCountries, c],
    }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        destinationCountry: form.destinationCountries[0] ?? null,
        destinationCountries: form.destinationCountries.length > 0 ? form.destinationCountries : null,
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
          <div className="space-y-2">
            <Label>Applicable countries</Label>
            <p className="text-xs text-muted-foreground">
              Pick one or more countries. Leave empty to make the template available for any country.
            </p>
            <Popover open={countryPickerOpen} onOpenChange={setCountryPickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between font-normal"
                  data-testid="button-template-pick-countries"
                >
                  <span className="text-muted-foreground">
                    {form.destinationCountries.length === 0
                      ? "Click to pick countries…"
                      : `${form.destinationCountries.length} ${form.destinationCountries.length === 1 ? "country" : "countries"} selected`}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div className="p-2 border-b">
                  <Input
                    placeholder="Search countries…"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    className="h-8"
                    data-testid="input-country-search"
                  />
                </div>
                <ScrollArea className="h-64">
                  <ul className="p-1">
                    {filteredCountries.length === 0 ? (
                      <li className="px-3 py-6 text-center text-sm text-muted-foreground">No matches.</li>
                    ) : (
                      filteredCountries.map((c) => {
                        const checked = form.destinationCountries.includes(c);
                        return (
                          <li key={c}>
                            <button
                              type="button"
                              onClick={() => toggleCountry(c)}
                              className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded hover:bg-accent text-left"
                              data-testid={`option-country-${c}`}
                            >
                              <Checkbox checked={checked} className="pointer-events-none" />
                              <span className="flex-1">{c}</span>
                            </button>
                          </li>
                        );
                      })
                    )}
                  </ul>
                </ScrollArea>
              </PopoverContent>
            </Popover>
            {form.destinationCountries.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.destinationCountries.map((c) => (
                  <Badge key={c} variant="secondary" className="gap-1 pr-1" data-testid={`chip-country-${c}`}>
                    {c}
                    <button
                      type="button"
                      onClick={() => toggleCountry(c)}
                      className="ml-0.5 rounded hover:bg-background/60 p-0.5"
                      aria-label={`Remove ${c}`}
                      data-testid={`button-remove-country-${c}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-muted-foreground"
                  onClick={() => setForm((f) => ({ ...f, destinationCountries: [] }))}
                  data-testid="button-clear-countries"
                >
                  Clear all
                </Button>
              </div>
            )}
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
// Email invoice dialog
// ============================================================
function EmailInvoiceDialog({
  invoiceId,
  defaultEmail,
  open,
  onOpenChange,
}: {
  invoiceId: string | null;
  defaultEmail: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { toast } = useToast();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    if (open) {
      setTo(defaultEmail ?? "");
      setSubject("");
      setBody("");
    }
  }, [open, defaultEmail]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceId) throw new Error("Missing invoice");
      const res = await apiRequest("POST", `/api/invoices/${invoiceId}/email`, {
        to: to.trim(),
        subject: subject.trim() || undefined,
        body: body.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.fallback?.mailto) {
        window.open(data.fallback.mailto, "_blank", "noopener");
        toast({
          title: "Opened in your email client",
          description: "We don't have email sending configured — your default email app was opened with the message ready to send.",
        });
      } else {
        toast({ title: "Email sent", description: `Invoice sent to ${to}.` });
      }
      onOpenChange(false);
    },
    onError: (e: Error) => toast({ title: "Could not send", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Email invoice</DialogTitle>
          <DialogDescription>
            Send a copy of this invoice. When email sending is configured, a PDF
            is attached automatically — otherwise we'll open your default email
            client with the message ready and a link to download the PDF.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>To *</Label>
            <Input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@example.com"
              data-testid="input-email-to"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Subject (optional)</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Defaults to: Invoice from your agency"
              data-testid="input-email-subject"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Message (optional)</Label>
            <Textarea
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="A short note to your customer…"
              data-testid="input-email-body"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} data-testid="button-email-cancel">Cancel</Button>
          <Button
            onClick={() => {
              if (!to.trim()) {
                toast({ title: "Add a recipient", variant: "destructive" });
                return;
              }
              sendMutation.mutate();
            }}
            disabled={sendMutation.isPending}
            data-testid="button-email-send"
          >
            {sendMutation.isPending ? "Sending..." : "Send"}
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
    logoUrl: "", invoiceAccentColor: "",
    currency: "USD", taxRate: "0", taxLabel: "Tax", invoicePrefix: "INV",
    paymentTerms: "Due on receipt", paymentInstructions: "", bankDetails: "",
    upiId: "", upiQrFileUrl: "",
    footerText: "", notes: "",
    gstEnabled: false, gstin: "", gstStateCode: "", gstLegalName: "",
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
        logoUrl: settings.logoUrl ?? "",
        invoiceAccentColor: settings.invoiceAccentColor ?? "",
        currency: settings.currency,
        taxRate: ((settings.taxRate ?? 0) / 100).toString(),
        taxLabel: settings.taxLabel ?? "Tax",
        invoicePrefix: settings.invoicePrefix,
        paymentTerms: settings.paymentTerms ?? "",
        paymentInstructions: settings.paymentInstructions ?? "",
        bankDetails: settings.bankDetails ?? "",
        upiId: (settings as any).upiId ?? "",
        upiQrFileUrl: (settings as any).upiQrFileUrl ?? "",
        footerText: settings.footerText ?? "",
        notes: settings.notes ?? "",
        gstEnabled: !!settings.gstEnabled,
        gstin: settings.gstin ?? "",
        gstStateCode: settings.gstStateCode ?? "",
        gstLegalName: settings.gstLegalName ?? "",
      });
      setHydrated(true);
    }
  }, [settings, hydrated]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const stateName = GST_STATES.find((s) => s.code === form.gstStateCode)?.name ?? null;
      const payload = {
        ...form,
        logoUrl: form.logoUrl.trim() || null,
        invoiceAccentColor: form.invoiceAccentColor.trim() || null,
        taxRate: Math.round(parseFloat(form.taxRate || "0") * 100), // convert % to basis points
        gstin: form.gstin.trim() || null,
        gstStateCode: form.gstStateCode || null,
        gstStateName: stateName,
        gstLegalName: form.gstLegalName.trim() || null,
        upiId: form.upiId.trim() || null,
        upiQrFileUrl: form.upiQrFileUrl || null,
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
              <PhoneInput
                value={form.companyPhone}
                onChange={(companyPhone) => setForm({ ...form, companyPhone })}
                defaultCountryCode={defaultPhoneCodeFrom(form.companyPhone)}
                testId="input-company-phone"
              />
            </div>
            <div className="space-y-2">
              <Label>Tax ID</Label>
              <Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} data-testid="input-tax-id" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Logo URL</Label>
              <Input
                value={form.logoUrl}
                onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                data-testid="input-logo-url"
              />
              <p className="text-xs text-muted-foreground">Paste a public URL to your company logo. It appears on the invoice header and PDF.</p>
              {form.logoUrl && (
                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={form.logoUrl}
                    alt="Logo preview"
                    className="h-12 w-12 object-contain rounded border bg-white p-1"
                    data-testid="img-logo-preview"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <span className="text-xs text-muted-foreground">Preview</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Invoice accent color</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={form.invoiceAccentColor || "#1f2937"}
                  onChange={(e) => setForm({ ...form, invoiceAccentColor: e.target.value })}
                  className="h-10 w-16 p-1"
                  data-testid="input-accent-color"
                />
                <Input
                  value={form.invoiceAccentColor}
                  onChange={(e) => setForm({ ...form, invoiceAccentColor: e.target.value })}
                  placeholder="#1f2937"
                  className="flex-1 font-mono text-sm"
                  data-testid="input-accent-color-hex"
                />
                {form.invoiceAccentColor && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setForm({ ...form, invoiceAccentColor: "" })}
                    data-testid="button-clear-accent"
                  >Clear</Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger data-testid="select-currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[
                    // Common globals
                    "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "SGD", "CHF", "HKD",
                    // India + GCC / Middle East (covers AED, BHD, SAR, OMR + neighbours)
                    "INR", "AED", "SAR", "QAR", "KWD", "BHD", "OMR",
                  ].map((c) =>
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
          <CardTitle>GST (India)</CardTitle>
          <CardDescription>
            Enable GST to capture GSTIN, place of supply and CGST/SGST/IGST splits on every invoice,
            and to download monthly GSTR-1 reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              checked={form.gstEnabled}
              onCheckedChange={(v) => setForm({ ...form, gstEnabled: v })}
              data-testid="switch-gst-enabled"
            />
            <Label>Enable GST on invoices</Label>
          </div>
          {form.gstEnabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Legal name (as per GSTIN)</Label>
                <Input value={form.gstLegalName}
                  onChange={(e) => setForm({ ...form, gstLegalName: e.target.value })}
                  data-testid="input-gst-legal-name" />
              </div>
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  placeholder="15-character GSTIN" maxLength={15}
                  data-testid="input-gstin" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Registered state</Label>
                <Select value={form.gstStateCode} onValueChange={(v) => setForm({ ...form, gstStateCode: v })}>
                  <SelectTrigger data-testid="select-gst-state"><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    {GST_STATES.map((s) => (
                      <SelectItem key={s.code} value={s.code}>{s.code} - {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Used to compute CGST/SGST (intra-state) vs IGST (inter-state).
                </p>
              </div>
            </div>
          )}
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
            <Textarea
              value={form.bankDetails}
              onChange={(e) => setForm({ ...form, bankDetails: e.target.value })}
              placeholder={"Account name: Acme Travel\nBank: HDFC Bank\nA/c No: 1234567890\nIFSC: HDFC0000123\nSWIFT: HDFCINBB"}
              data-testid="input-bank-details"
            />
            <p className="text-xs text-muted-foreground">
              Shown on the public payment page (Pay Offline tab) and in the bank-transfer instructions.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>UPI ID (India)</Label>
              <Input
                value={form.upiId}
                onChange={(e) => setForm({ ...form, upiId: e.target.value.trim() })}
                placeholder="myagency@hdfcbank"
                data-testid="input-upi-id"
              />
              <p className="text-xs text-muted-foreground">
                Customer can pay you directly into this UPI VPA from any UPI app.
              </p>
            </div>
            <div className="space-y-2">
              <Label>UPI QR image (optional)</Label>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 500_000) {
                    toast({ title: "Image too large", description: "Please upload a QR image under 500 KB.", variant: "destructive" });
                    e.target.value = "";
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setForm((f) => ({ ...f, upiQrFileUrl: String(reader.result || "") }));
                  reader.readAsDataURL(file);
                }}
                data-testid="input-upi-qr-file"
              />
              {form.upiQrFileUrl && (
                <div className="flex items-center gap-3 pt-1">
                  <img
                    src={form.upiQrFileUrl}
                    alt="UPI QR preview"
                    className="h-20 w-20 object-contain rounded border bg-white p-1"
                    data-testid="img-upi-qr-preview"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setForm({ ...form, upiQrFileUrl: "" })}
                    data-testid="button-remove-upi-qr"
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
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
