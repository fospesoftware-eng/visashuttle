import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wallet, Edit2, Building2, Search, Loader2 } from "lucide-react";
import { format } from "date-fns";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type SubRow = {
  sub: {
    id: string;
    tenantId: string;
    plan: string;
    status: string;
    monthlyPriceCents: number;
    currency: string;
    trialEndsAt: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    notes: string | null;
  };
  tenantName: string | null;
  tenantSlug: string | null;
  tenantStatus: string | null;
};
type Orphan = { sub: null; tenantId: string; tenantName: string; tenantSlug: string; tenantStatus: string; plan: string };

const STATUS_BADGE: Record<string, string> = {
  trialing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  past_due: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  canceled: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function fmtMoney(cents: number, ccy: string) {
  const v = (cents / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return ccy === "INR" ? `₹${v}` : `${ccy} ${v}`;
}

export default function AdminSubscriptionsPage() {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<SubRow | Orphan | null>(null);
  const [form, setForm] = useState({ plan: "lite", status: "trialing", monthlyPriceCents: 199900, currency: "INR", notes: "" });
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ subscriptions: SubRow[]; unconfigured: Orphan[] }>({
    queryKey: ["/api/admin/subscriptions"],
  });

  const subs = data?.subscriptions ?? [];
  const orphans = data?.unconfigured ?? [];

  const all = useMemo(() => {
    const q = search.trim().toLowerCase();
    const merged: Array<{ key: string; tenantId: string; tenantName: string | null; status: string | null; plan: string; price?: number; ccy?: string; periodEnd?: string | null; isOrphan: boolean; row: SubRow | Orphan }> = [];
    for (const r of subs) merged.push({
      key: r.sub.id, tenantId: r.sub.tenantId, tenantName: r.tenantName, status: r.sub.status,
      plan: r.sub.plan, price: r.sub.monthlyPriceCents, ccy: r.sub.currency, periodEnd: r.sub.currentPeriodEnd,
      isOrphan: false, row: r,
    });
    for (const o of orphans) merged.push({
      key: `orphan-${o.tenantId}`, tenantId: o.tenantId, tenantName: o.tenantName, status: null,
      plan: o.plan, isOrphan: true, row: o,
    });
    return q ? merged.filter(m => (m.tenantName ?? "").toLowerCase().includes(q)) : merged;
  }, [subs, orphans, search]);

  const editMut = useMutation({
    mutationFn: ({ tenantId, payload }: { tenantId: string; payload: any }) =>
      apiRequest("PATCH", `/api/admin/subscriptions/${tenantId}`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/subscriptions"] });
      setEditing(null);
      toast({ title: "Subscription saved" });
    },
    onError: (e: any) => toast({ title: "Failed", description: e?.message ?? "Try again", variant: "destructive" }),
  });

  function openEdit(row: SubRow | Orphan) {
    setEditing(row);
    if ("sub" in row && row.sub) {
      setForm({
        plan: normalizePlan(row.sub.plan), status: row.sub.status,
        monthlyPriceCents: row.sub.monthlyPriceCents, currency: row.sub.currency,
        notes: row.sub.notes ?? "",
      });
    } else {
      const plan = normalizePlan(row.plan);
      setForm({ plan, status: "trialing", monthlyPriceCents: planPrice(plan), currency: "INR", notes: "" });
    }
  }

  const totals = useMemo(() => {
    const active = subs.filter(s => s.sub.status === "active");
    const mrr = active.reduce((sum, s) => sum + s.sub.monthlyPriceCents, 0);
    return {
      total: subs.length,
      active: active.length,
      pastDue: subs.filter(s => s.sub.status === "past_due").length,
      mrr,
      unconfigured: orphans.length,
    };
  }, [subs, orphans]);

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Wallet className="w-6 h-6 text-primary" /> Subscriptions</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage each agency's monthly subscription to Visa Shuttle.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Active", value: totals.active, hint: `of ${totals.total} configured`, color: "text-emerald-600" },
            { label: "MRR", value: fmtMoney(totals.mrr, "INR"), hint: "Active monthly revenue", color: "text-foreground" },
            { label: "Past due", value: totals.pastDue, hint: "Need attention", color: "text-amber-600" },
            { label: "Unconfigured", value: totals.unconfigured, hint: "Agencies without a price set", color: "text-red-600" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className={`text-2xl font-bold ${s.color}`}>{isLoading ? "—" : s.value}</p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.hint}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <div className="p-4 border-b flex items-center gap-3">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search agency name…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agency</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Period ends</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-8" /></TableCell></TableRow>
                ))
              ) : all.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No agencies found.</TableCell></TableRow>
              ) : all.map(m => (
                <TableRow key={m.key}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{m.tenantName ?? m.tenantId}</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{m.plan}</Badge></TableCell>
                  <TableCell>
                    {m.isOrphan ? (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Not configured</Badge>
                    ) : (
                      <Badge variant="secondary" className={STATUS_BADGE[m.status ?? ""] ?? ""}>{m.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {m.isOrphan ? <span className="text-muted-foreground text-sm">—</span> : fmtMoney(m.price ?? 0, m.ccy ?? "INR")}
                  </TableCell>
                  <TableCell>
                    {m.periodEnd ? format(new Date(m.periodEnd), "dd MMM yyyy") : <span className="text-muted-foreground text-sm">—</span>}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => openEdit(m.row)}><Edit2 className="w-3.5 h-3.5" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit subscription</DialogTitle>
            <DialogDescription>
              {editing && ("tenantName" in editing
                ? editing.tenantName
                : (editing as SubRow).tenantName ?? (editing as SubRow).sub.tenantId)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={v => setForm({ ...form, plan: v, monthlyPriceCents: planPrice(v), currency: "INR" })}>
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
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trialing">Trialing</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="past_due">Past due</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monthly price (in cents / paise)</Label>
                <Input type="number" min={0} value={form.monthlyPriceCents}
                  onChange={e => setForm({ ...form, monthlyPriceCents: Math.max(0, Number(e.target.value) || 0) })} />
                <p className="text-xs text-muted-foreground">{fmtMoney(form.monthlyPriceCents, form.currency)} / month</p>
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">INR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Internal notes</Label>
              <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={3}
                placeholder="Discount agreed, custom terms, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button disabled={editMut.isPending} onClick={() => {
              if (!editing) return;
              const tenantId = "sub" in editing && editing.sub ? editing.sub.tenantId : (editing as Orphan).tenantId;
              editMut.mutate({ tenantId, payload: form });
            }}>
              {editMut.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function planPrice(plan: string) {
  const prices: Record<string, number> = { lite: 199900, go: 399900, power: 799900 };
  return prices[plan] ?? prices.lite;
}

function normalizePlan(plan?: string | null) {
  if (plan === "professional") return "go";
  if (plan === "enterprise") return "power";
  if (plan === "go" || plan === "power") return plan;
  return "lite";
}
