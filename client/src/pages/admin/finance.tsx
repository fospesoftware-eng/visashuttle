import { useMemo, useState } from "react";
import { Search, Building2, Receipt, Banknote, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

// Cross-tenant Finance console for the saas_admin. Shows every Invoice
// and every Payment across the platform. KPI tiles roll up totals across
// agencies (after the user's chosen filters).

type AdminInvoice = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  tenantSlug: string | null;
  invoiceNumber: string;
  customerName: string;
  customerEmail: string | null;
  status: string;
  currency: string;
  total: number;
  paidAmount: number;
  issuedAt: string | null;
  dueDate: string | null;
  publicToken: string | null;
};

type AdminPayment = {
  id: string;
  tenantId: string;
  tenantName: string | null;
  tenantSlug: string | null;
  invoiceId: string;
  invoiceNumber: string | null;
  invoiceCustomer: string | null;
  invoiceCurrency: string | null;
  amount: number;
  method: string;
  // schema field is `reference` (UTR / UPI Txn ID / auth code etc.)
  reference: string | null;
  paidAt: string | null;
  notes: string | null;
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  sent: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  overdue: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  cancelled: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const METHOD_COLORS: Record<string, string> = {
  bank_transfer: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  upi: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  cash: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  card: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  gateway: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  other: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

function fmtTimeAgo(d: string | null): string {
  if (!d) return "—";
  try {
    return formatDistanceToNow(new Date(d), { addSuffix: true });
  } catch {
    return "—";
  }
}

function fmtMoney(cents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

function TenantCell({ name }: { name: string | null }) {
  if (!name) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="truncate">{name}</span>
    </div>
  );
}

function KpiTile({
  label, value, hint, testId,
}: { label: string; value: string; hint?: string; testId?: string }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="p-4">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
        <div className="text-2xl font-semibold tabular-nums mt-2">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
      </CardContent>
    </Card>
  );
}

export default function AdminFinancePage() {
  const [tab, setTab] = useState<"invoices" | "payments">("invoices");
  const [search, setSearch] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const tenantsQuery = useQuery<any[]>({ queryKey: ["/api/admin/tenants"] });
  const invoicesQuery = useQuery<AdminInvoice[]>({ queryKey: ["/api/admin/invoices"] });
  const paymentsQuery = useQuery<AdminPayment[]>({ queryKey: ["/api/admin/payments"] });

  const filteredInvoices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (invoicesQuery.data ?? []).filter((inv) => {
      if (tenantFilter !== "all" && inv.tenantId !== tenantFilter) return false;
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (!q) return true;
      return (
        inv.invoiceNumber.toLowerCase().includes(q)
        || inv.customerName.toLowerCase().includes(q)
        || (inv.customerEmail ?? "").toLowerCase().includes(q)
        || (inv.tenantName ?? "").toLowerCase().includes(q)
      );
    });
  }, [invoicesQuery.data, search, tenantFilter, statusFilter]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (paymentsQuery.data ?? []).filter((p) => {
      if (tenantFilter !== "all" && p.tenantId !== tenantFilter) return false;
      if (statusFilter !== "all" && p.method !== statusFilter) return false;
      if (!q) return true;
      return (
        (p.invoiceNumber ?? "").toLowerCase().includes(q)
        || (p.invoiceCustomer ?? "").toLowerCase().includes(q)
        || (p.reference ?? "").toLowerCase().includes(q)
        || (p.tenantName ?? "").toLowerCase().includes(q)
      );
    });
  }, [paymentsQuery.data, search, tenantFilter, statusFilter]);

  // KPI rollups across the *filtered* invoice set so the totals always
  // match what's visible in the table.
  const kpis = useMemo(() => {
    let billed = 0, collected = 0, outstanding = 0, paidCount = 0, overdueCount = 0;
    let currency = "USD";
    for (const inv of filteredInvoices) {
      currency = inv.currency || currency;
      billed += inv.total;
      collected += inv.paidAmount;
      outstanding += Math.max(0, inv.total - inv.paidAmount);
      if (inv.status === "paid") paidCount += 1;
      if (inv.status === "overdue") overdueCount += 1;
    }
    return { billed, collected, outstanding, paidCount, overdueCount, currency };
  }, [filteredInvoices]);

  const onTabChange = (v: string) => {
    setTab(v as typeof tab);
    setStatusFilter("all");
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-finance-title">
            Finance
          </h1>
          <p className="text-sm text-muted-foreground">
            Every invoice and payment across all agencies on the platform.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile
            label="Total billed"
            value={fmtMoney(kpis.billed, kpis.currency)}
            hint={`${filteredInvoices.length} invoices`}
            testId="kpi-billed"
          />
          <KpiTile
            label="Collected"
            value={fmtMoney(kpis.collected, kpis.currency)}
            hint={`${kpis.paidCount} paid`}
            testId="kpi-collected"
          />
          <KpiTile
            label="Outstanding"
            value={fmtMoney(kpis.outstanding, kpis.currency)}
            hint={`${kpis.overdueCount} overdue`}
            testId="kpi-outstanding"
          />
          <KpiTile
            label="Payments"
            value={String(filteredPayments.length)}
            hint={(paymentsQuery.data?.length ?? 0) === filteredPayments.length
              ? "across all agencies"
              : `${paymentsQuery.data?.length ?? 0} total`}
            testId="kpi-payments"
          />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div className="relative md:w-72">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices, customers, refs…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  data-testid="input-search"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={tenantFilter} onValueChange={setTenantFilter}>
                  <SelectTrigger className="w-48" data-testid="select-tenant">
                    <SelectValue placeholder="All agencies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All agencies</SelectItem>
                    {(tenantsQuery.data ?? []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44" data-testid="select-status">
                    <SelectValue placeholder={tab === "invoices" ? "All statuses" : "All methods"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{tab === "invoices" ? "All statuses" : "All methods"}</SelectItem>
                    {tab === "invoices" && (
                      <>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="partial">Partial</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </>
                    )}
                    {tab === "payments" && (
                      <>
                        <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="gateway">Online (Gateway)</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={onTabChange}>
              <TabsList>
                <TabsTrigger value="invoices" data-testid="tab-invoices">
                  <Receipt className="w-4 h-4 mr-1.5" />
                  Invoices
                  <Badge variant="secondary" className="ml-2">
                    {invoicesQuery.data?.length ?? 0}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="payments" data-testid="tab-payments">
                  <Banknote className="w-4 h-4 mr-1.5" />
                  Payments
                  <Badge variant="secondary" className="ml-2">
                    {paymentsQuery.data?.length ?? 0}
                  </Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="invoices" className="mt-4">
                {invoicesQuery.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Agency</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Issued</TableHead>
                          <TableHead>Pay link</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                              No invoices match the current filters.
                            </TableCell>
                          </TableRow>
                        ) : filteredInvoices.map((inv) => {
                          const balance = Math.max(0, inv.total - inv.paidAmount);
                          return (
                            <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                              <TableCell className="font-mono text-xs">{inv.invoiceNumber}</TableCell>
                              <TableCell>
                                <div className="font-medium">{inv.customerName}</div>
                                {inv.customerEmail && (
                                  <div className="text-xs text-muted-foreground">{inv.customerEmail}</div>
                                )}
                              </TableCell>
                              <TableCell>
                                <TenantCell name={inv.tenantName} />
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {fmtMoney(inv.total, inv.currency)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums">
                                {fmtMoney(inv.paidAmount, inv.currency)}
                              </TableCell>
                              <TableCell className="text-right tabular-nums font-medium">
                                {fmtMoney(balance, inv.currency)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className={INVOICE_STATUS_COLORS[inv.status] ?? ""}>
                                  {inv.status}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {fmtTimeAgo(inv.issuedAt)}
                              </TableCell>
                              <TableCell>
                                {inv.publicToken ? (
                                  <a
                                    href={`/pay/invoice/${inv.publicToken}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-sm hover:underline"
                                    data-testid={`link-pay-${inv.id}`}
                                  >
                                    Open <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="payments" className="mt-4">
                {paymentsQuery.isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Paid</TableHead>
                          <TableHead>Invoice</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Agency</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Reference</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                              No payments match the current filters.
                            </TableCell>
                          </TableRow>
                        ) : filteredPayments.map((p) => (
                          <TableRow key={p.id} data-testid={`row-payment-${p.id}`}>
                            <TableCell className="text-muted-foreground text-sm">
                              {fmtTimeAgo(p.paidAt)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {p.invoiceNumber ?? "—"}
                            </TableCell>
                            <TableCell>
                              {p.invoiceCustomer ?? <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell>
                              <TenantCell name={p.tenantName} />
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-medium">
                              {fmtMoney(p.amount, p.invoiceCurrency ?? "USD")}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={METHOD_COLORS[p.method] ?? ""}>
                                {p.method.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {p.reference ?? <span className="text-muted-foreground">—</span>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
