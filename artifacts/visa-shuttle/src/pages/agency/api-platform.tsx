import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  KeyRound, Activity, Receipt, BookOpen, Users, LayoutDashboard,
  Plus, Copy, EyeOff, Trash2, Wallet, Sparkles, Code2,
} from "lucide-react";

type View = "overview" | "keys" | "usage" | "pricing" | "docs" | "resellers";

const BRAND_GRADIENT = "linear-gradient(90deg, #4055FF 0%, #9033F5 50%, #FF2060 100%)";

// USD cents → "$1.99" / "$0.25"
function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

interface Props { view: View }

export default function ApiPlatformPage({ view }: Props) {
  const { data: auth } = useCurrentUser();
  const tenantId = auth?.user?.tenantId as string | undefined;

  return (
    <DashboardLayout type="agency">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <div
            className="text-xs font-semibold uppercase tracking-widest mb-2 inline-block bg-clip-text text-transparent"
            style={{ backgroundImage: BRAND_GRADIENT }}
          >
            Agency API Platform
          </div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "Inter, sans-serif" }}>
            {view === "overview" && "Overview"}
            {view === "keys" && "API Keys"}
            {view === "usage" && "Usage & Billing"}
            {view === "pricing" && "Pricing"}
            {view === "docs" && "API Documentation"}
            {view === "resellers" && "Resellers"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Sell our visa intelligence APIs to your customers, branded as your own.
          </p>
        </div>

        {!tenantId && (
          <Card><CardContent className="p-6 text-muted-foreground">Loading workspace…</CardContent></Card>
        )}

        {tenantId && view === "overview"  && <OverviewView tenantId={tenantId} />}
        {tenantId && view === "keys"      && <KeysView tenantId={tenantId} />}
        {tenantId && view === "usage"     && <UsageView tenantId={tenantId} />}
        {tenantId && view === "pricing"   && <PricingView />}
        {tenantId && view === "docs"      && <DocsView />}
        {tenantId && view === "resellers" && <ResellersView tenantId={tenantId} />}
      </div>
    </DashboardLayout>
  );
}

// ── Overview ──────────────────────────────────────────────────────────────
function OverviewView({ tenantId }: { tenantId: string }) {
  const { data: wallet } = useQuery<{ wallet: { balanceCents: number; currency: string }; ledger: any[] }>({
    queryKey: [`/api/agency/${tenantId}/api/wallet`],
  });
  const { data: usage } = useQuery<{ usage: any[]; kpis: { callsToday: number; callsMonth: number; spendCentsMonth: number } }>({
    queryKey: [`/api/agency/${tenantId}/api/usage`],
  });
  const { data: keys } = useQuery<any[]>({ queryKey: [`/api/agency/${tenantId}/api/keys`] });

  const balance = wallet?.wallet?.balanceCents ?? 0;
  const kpis = usage?.kpis ?? { callsToday: 0, callsMonth: 0, spendCentsMonth: 0 };
  const activeKeys = (keys ?? []).filter((k: any) => k.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard icon={<Wallet className="w-5 h-5" />} label="Wallet balance" value={fmt(balance)} />
        <KpiCard icon={<Activity className="w-5 h-5" />} label="Calls today" value={String(kpis.callsToday)} />
        <KpiCard icon={<Activity className="w-5 h-5" />} label="Calls this month" value={String(kpis.callsMonth)} />
        <KpiCard icon={<Receipt className="w-5 h-5" />} label="Spend this month" value={fmt(kpis.spendCentsMonth)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>What you can sell</CardTitle>
          <CardDescription>Two production APIs, billed per call. Mark up to your customers as you wish.</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4">
          <ProductCard title="Deep Check API" desc="Embassy-style risk assessment with dimension scores, risks, and an action plan." endpoint="/api/v1/deep-check" />
          <ProductCard title="Visa Requirement API" desc="Required documents, processing time, and visa-free / e-visa status by nationality + destination." endpoint="/api/v1/visa-requirements" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Get started</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>1. Create an API key in <strong>API Keys</strong>. The full secret is shown only once.</p>
          <p>2. Top up your wallet to cover per-call costs.</p>
          <p>3. Call the endpoints with header <code className="px-1 py-0.5 bg-muted rounded">Authorization: Bearer vs_…</code>.</p>
          <p>4. Track every call in <strong>Usage</strong>. Active keys: <strong>{activeKeys}</strong>.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">{icon}{label}</div>
        <div className="text-2xl font-bold" style={{ fontFamily: "Inter, sans-serif" }}>{value}</div>
      </CardContent>
    </Card>
  );
}

function ProductCard({ title, desc, endpoint }: { title: string; desc: string; endpoint: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div
        className="text-xs font-semibold uppercase tracking-widest mb-2 inline-block bg-clip-text text-transparent"
        style={{ backgroundImage: BRAND_GRADIENT }}
      >Production</div>
      <div className="font-semibold text-lg">{title}</div>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      <code className="text-xs block mt-3 px-2 py-1 bg-muted rounded">POST {endpoint}</code>
    </div>
  );
}

// ── Keys ─────────────────────────────────────────────────────────────────
function KeysView({ tenantId }: { tenantId: string }) {
  const toast = useToast();
  const { data: keys = [], isLoading } = useQuery<any[]>({ queryKey: [`/api/agency/${tenantId}/api/keys`] });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [revealed, setRevealed] = useState<{ secret: string; prefix: string } | null>(null);

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/agency/${tenantId}/api/keys`, { name });
      return res.json();
    },
    onSuccess: (data: any) => {
      setRevealed({ secret: data.secret, prefix: data.prefix });
      setName("");
      queryClient.invalidateQueries({ queryKey: [`/api/agency/${tenantId}/api/keys`] });
    },
    onError: (e: any) => toast.toast({ title: "Failed", description: e?.message ?? "Could not create key", variant: "destructive" }),
  });
  const revokeMut = useMutation({
    mutationFn: async (id: string) => (await apiRequest("POST", `/api/agency/${tenantId}/api/keys/${id}/revoke`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/agency/${tenantId}/api/keys`] }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Your API keys</CardTitle>
            <CardDescription>The plaintext secret is shown <strong>only once</strong>. Store it safely.</CardDescription>
          </div>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setRevealed(null); }}>
            <DialogTrigger asChild>
              <Button style={{ backgroundImage: BRAND_GRADIENT }} className="text-white border-0"><Plus className="w-4 h-4 mr-1" />New key</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{revealed ? "Save your secret" : "Create API key"}</DialogTitle>
                <DialogDescription>{revealed ? "We will not show this secret again." : "Give the key a label so you can find it later."}</DialogDescription>
              </DialogHeader>
              {!revealed ? (
                <>
                  <div className="space-y-2">
                    <Label>Key name</Label>
                    <Input placeholder="Production" value={name} onChange={(e) => setName(e.target.value)} />
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button disabled={!name || createMut.isPending} onClick={() => createMut.mutate()}>Create</Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">Copy it now — this is the last time you'll see it.</p>
                    <div className="flex gap-2">
                      <Input readOnly value={revealed.secret} className="font-mono text-xs" />
                      <Button variant="outline" onClick={() => { navigator.clipboard.writeText(revealed.secret); toast.toast({ title: "Copied" }); }}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">Prefix: <code>{revealed.prefix}</code></p>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => { setOpen(false); setRevealed(null); }}>Done</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground py-4">Loading…</div>
          ) : keys.length === 0 ? (
            <div className="text-muted-foreground py-4 flex items-center gap-2"><KeyRound className="w-4 h-4" /> No keys yet. Create your first one.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow><TableHead>Name</TableHead><TableHead>Prefix</TableHead><TableHead>Status</TableHead><TableHead>Last used</TableHead><TableHead>Created</TableHead><TableHead></TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell><code className="text-xs">vs_{k.prefix}_••••</code></TableCell>
                    <TableCell><Badge variant={k.status === "active" ? "default" : "secondary"}>{k.status}</Badge></TableCell>
                    <TableCell className="text-muted-foreground text-xs">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{k.createdAt ? new Date(k.createdAt).toLocaleDateString() : ""}</TableCell>
                    <TableCell className="text-right">
                      {k.status === "active" && (
                        <Button size="sm" variant="ghost" disabled={revokeMut.isPending} onClick={() => revokeMut.mutate(k.id)}>
                          <EyeOff className="w-4 h-4 mr-1" /> Revoke
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Cashfree drop-in SDK loader (shared shape with deep-check-payment.tsx).
declare global {
  interface Window {
    Cashfree?: (options: { mode: "sandbox" | "production" }) => {
      checkout: (options: { paymentSessionId: string; redirectTarget: "_self" | "_blank" | "_modal" }) => Promise<unknown>;
    };
  }
}
function loadCashfreeSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve();
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://sdk.cashfree.com/js/v3/cashfree.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Cashfree checkout")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Cashfree checkout"));
    document.body.appendChild(script);
  });
}

// ── Usage ────────────────────────────────────────────────────────────────
function UsageView({ tenantId }: { tenantId: string }) {
  const toast = useToast();
  const { data } = useQuery<{ usage: any[]; kpis: any }>({ queryKey: [`/api/agency/${tenantId}/api/usage`] });
  const { data: wallet } = useQuery<{ wallet: { balanceCents: number; currency: string }; ledger: any[] }>({
    queryKey: [`/api/agency/${tenantId}/api/wallet`],
  });
  const usage = data?.usage ?? [];
  const ledger = wallet?.ledger ?? [];

  // Self-serve Cashfree top-up. Two-step flow:
  //   1. /initiate-topup → opens Cashfree drop-in with paymentSessionId
  //   2. on return (?topup_order=…) → /confirm-topup credits the wallet
  //      ONCE (idempotent). Then we invalidate the queries so the new
  //      balance + ledger row appear instantly.
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState("25");
  const [busy, setBusy] = useState(false);

  // Auto-confirm on return from Cashfree.
  useEffect(() => {
    const url = new URL(window.location.href);
    const orderId = url.searchParams.get("topup_order");
    if (!orderId) return;
    (async () => {
      try {
        await apiRequest("POST", `/api/agency/${tenantId}/api/wallet/confirm-topup`, { orderId });
        toast.toast({ title: "Wallet topped up" });
        queryClient.invalidateQueries({ queryKey: [`/api/agency/${tenantId}/api/wallet`] });
        queryClient.invalidateQueries({ queryKey: [`/api/agency/${tenantId}/api/usage`] });
      } catch (e: any) {
        toast.toast({ title: "Could not confirm top-up", description: e?.message, variant: "destructive" });
      } finally {
        url.searchParams.delete("topup_order");
        window.history.replaceState({}, "", url.pathname + (url.search || ""));
      }
    })();
  }, [tenantId, toast]);

  async function startTopup() {
    setBusy(true);
    try {
      const cents = Math.round(parseFloat(topupAmount || "0") * 100);
      if (!Number.isFinite(cents) || cents <= 0) throw new Error("Enter an amount in USD greater than 0");
      const res = await apiRequest("POST", `/api/agency/${tenantId}/api/wallet/initiate-topup`, { amountCents: cents });
      const init = await res.json();
      if (!init?.paymentSessionId) throw new Error("Cashfree did not return a payment session");
      await loadCashfreeSdk();
      const cashfree = window.Cashfree?.({ mode: init.mode === "live" ? "production" : "sandbox" });
      if (!cashfree) throw new Error("Cashfree checkout unavailable");
      setTopupOpen(false);
      await cashfree.checkout({ paymentSessionId: init.paymentSessionId, redirectTarget: "_self" });
    } catch (e: any) {
      toast.toast({ title: "Top-up failed", description: e?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Wallet</CardTitle><CardDescription>Per-call charges debit this balance.</CardDescription></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-3xl font-bold">{fmt(wallet?.wallet?.balanceCents ?? 0)}</div>
            <Button onClick={() => setTopupOpen(true)} style={{ backgroundImage: BRAND_GRADIENT }} className="text-white border-0">
              <Wallet className="w-4 h-4 mr-2" /> Top up via Cashfree
            </Button>
          </div>
        </CardContent>
      </Card>
      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Top up your API wallet</DialogTitle>
            <DialogDescription>You'll be redirected to Cashfree to complete the payment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Amount (USD)</Label>
            <Input type="number" step="0.01" min="1" value={topupAmount} onChange={(e) => setTopupAmount(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTopupOpen(false)}>Cancel</Button>
            <Button disabled={busy} onClick={startTopup} style={{ backgroundImage: BRAND_GRADIENT }} className="text-white border-0">
              {busy ? "Starting…" : "Continue to Cashfree"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Card>
        <CardHeader><CardTitle>Recent calls</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Endpoint</TableHead><TableHead>Status</TableHead><TableHead>Cost</TableHead><TableHead>Latency</TableHead></TableRow></TableHeader>
            <TableBody>
              {usage.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground py-6">No calls yet.</TableCell></TableRow>}
              {usage.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="text-xs">{new Date(u.createdAt).toLocaleString()}</TableCell>
                  <TableCell><code className="text-xs">{u.endpoint}</code></TableCell>
                  <TableCell><Badge variant={u.status >= 200 && u.status < 300 ? "default" : "destructive"}>{u.status}</Badge></TableCell>
                  <TableCell>{fmt(u.costCents)}</TableCell>
                  <TableCell className="text-xs">{u.latencyMs}ms</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Wallet ledger</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Time</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Balance after</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
            <TableBody>
              {ledger.length === 0 && <TableRow><TableCell colSpan={5} className="text-muted-foreground py-6">No movements yet.</TableCell></TableRow>}
              {ledger.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">{new Date(l.createdAt).toLocaleString()}</TableCell>
                  <TableCell><Badge variant="outline">{l.type}</Badge></TableCell>
                  <TableCell className={l.amountCents < 0 ? "text-red-600" : "text-emerald-600"}>{fmt(l.amountCents)}</TableCell>
                  <TableCell>{fmt(l.balanceAfterCents)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{l.notes ?? ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Pricing ──────────────────────────────────────────────────────────────
function PricingView() {
  const { data } = useQuery<{ currency: string; endpoints: { endpoint: string; priceCents: number; currency: string; description: string | null }[] }>({
    queryKey: ["/api/api-pricing"],
  });
  const items = data?.endpoints ?? [];
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {items.map((p) => (
        <Card key={p.endpoint}>
          <CardHeader>
            <CardTitle className="capitalize">{p.endpoint.replace(/-/g, " ")}</CardTitle>
            <CardDescription>{p.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-1">
              <div
                className="text-4xl font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: BRAND_GRADIENT }}
              >{fmt(p.priceCents)}</div>
              <div className="text-sm text-muted-foreground">/ call</div>
            </div>
            <code className="text-xs block mt-3 px-2 py-1 bg-muted rounded">POST /api/v1/{p.endpoint}</code>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Docs ─────────────────────────────────────────────────────────────────
function DocsView() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> Authentication</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>All <code>/api/v1/*</code> calls require a Bearer token created in the API Keys page.</p>
          <pre className="bg-muted rounded p-3 text-xs overflow-x-auto"><code>{`curl -X POST https://YOUR_DOMAIN/api/v1/visa-requirements \\
  -H "Authorization: Bearer vs_xxxxxxx_yyyyyyyyyyyyyyyy" \\
  -H "Content-Type: application/json" \\
  -d '{"nationality":"India","destinationCountry":"Germany","visaType":"Tourist Visa"}'`}</code></pre>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Deep Check — POST /api/v1/deep-check</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Body:</p>
          <pre className="bg-muted rounded p-3 text-xs overflow-x-auto"><code>{`{
  "formData": {
    "nationality": "India",
    "destinationCountry": "Germany",
    "visaType": "Tourist Visa",
    "age": "32",
    "occupation": "Software Engineer",
    ...
  }
}`}</code></pre>
          <p>Returns <code>{"{ meta, result }"}</code> where <code>result</code> includes <code>approvalChance</code>, <code>profileGrade</code>, <code>dimensionScores</code>, <code>riskDetails</code>, and <code>actionPlan</code>.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Visa Requirement — POST /api/v1/visa-requirements</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>Body: <code>{"{ nationality, destinationCountry, visaType? }"}</code></p>
          <p>Returns visa-free / e-visa status, allowed visa types, processing time, fees, and required documents.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Errors</CardTitle></CardHeader>
        <CardContent className="text-sm">
          <p>All errors return <code>{`{ error: { code, message } }`}</code>. Codes: <code>unauthorized</code>, <code>bad_request</code>, <code>insufficient_balance</code> (HTTP 402), <code>upstream_error</code>, <code>internal_error</code>.</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Resellers ────────────────────────────────────────────────────────────
function ResellersView({ tenantId }: { tenantId: string }) {
  const toast = useToast();
  const { data } = useQuery<{ links: any[]; totalCommissionCents: number }>({
    queryKey: [`/api/agency/${tenantId}/api/resellers`],
  });
  const links = data?.links ?? [];
  const totalCommissionCents = data?.totalCommissionCents ?? 0;
  const [childTenantId, setChildTenantId] = useState("");
  const [commission, setCommission] = useState("10");
  const [mintFor, setMintFor] = useState<string | null>(null);
  const [mintName, setMintName] = useState("");
  const [mintRevealed, setMintRevealed] = useState<{ secret: string; prefix: string } | null>(null);

  const addMut = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/agency/${tenantId}/api/resellers`, {
      childTenantId, commissionCents: Math.round(parseFloat(commission || "0") * 100),
    })).json(),
    onSuccess: () => { setChildTenantId(""); queryClient.invalidateQueries({ queryKey: [`/api/agency/${tenantId}/api/resellers`] }); },
    onError: (e: any) => toast.toast({ title: "Failed", description: e?.message, variant: "destructive" }),
  });
  const removeMut = useMutation({
    mutationFn: async (id: string) => (await apiRequest("DELETE", `/api/agency/${tenantId}/api/resellers/${id}`)).json(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [`/api/agency/${tenantId}/api/resellers`] }),
  });
  const mintMut = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/agency/${tenantId}/api/resellers/${mintFor}/keys`, { name: mintName })).json(),
    onSuccess: (d: any) => setMintRevealed({ secret: d.secret, prefix: d.prefix }),
    onError: (e: any) => toast.toast({ title: "Failed", description: e?.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Total commission earned</CardTitle>
          <CardDescription>Across all sub-tenant API usage.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold bg-clip-text text-transparent" style={{ backgroundImage: BRAND_GRADIENT }}>
            {fmt(totalCommissionCents)}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Resellers under you</CardTitle>
          <CardDescription>Earn a fixed markup (in USD) every time a sub-tenant's key is used.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Sub-tenant ID</Label>
              <Input value={childTenantId} onChange={(e) => setChildTenantId(e.target.value)} placeholder="tenant uuid" />
            </div>
            <div>
              <Label>Markup per call (USD)</Label>
              <Input type="number" step="0.01" value={commission} onChange={(e) => setCommission(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button disabled={!childTenantId || addMut.isPending} onClick={() => addMut.mutate()}>Link reseller</Button>
            </div>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Child tenant</TableHead><TableHead>Markup/call</TableHead><TableHead>Active</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {links.length === 0 && <TableRow><TableCell colSpan={4} className="text-muted-foreground py-6 flex items-center gap-2"><Users className="w-4 h-4" /> No reseller links yet.</TableCell></TableRow>}
              {links.map((l: any) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.childTenantId}</TableCell>
                  <TableCell>{fmt(l.commissionCents)}</TableCell>
                  <TableCell><Badge variant={l.active ? "default" : "secondary"}>{l.active ? "active" : "inactive"}</Badge></TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="sm" variant="outline" onClick={() => { setMintFor(l.childTenantId); setMintName(""); setMintRevealed(null); }}>
                      <KeyRound className="w-4 h-4 mr-1" /> Mint sub-key
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => removeMut.mutate(l.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!mintFor} onOpenChange={(o) => { if (!o) { setMintFor(null); setMintRevealed(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mintRevealed ? "Save the sub-key secret" : "Mint a sub-key for this reseller"}</DialogTitle>
            <DialogDescription>
              {mintRevealed
                ? "Give this secret to your customer. We will not show it again."
                : "Sub-key calls debit the sub-tenant's wallet. Your markup is credited to your wallet automatically per call."}
            </DialogDescription>
          </DialogHeader>
          {!mintRevealed ? (
            <>
              <div className="space-y-2">
                <Label>Key name (for your records)</Label>
                <Input placeholder="Acme Travel Production" value={mintName} onChange={(e) => setMintName(e.target.value)} />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setMintFor(null)}>Cancel</Button>
                <Button disabled={!mintName || mintMut.isPending} onClick={() => mintMut.mutate()}>Mint</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Copy it now — this is the last time it will be shown.</p>
                <div className="flex gap-2">
                  <Input readOnly value={mintRevealed.secret} className="font-mono text-xs" />
                  <Button variant="outline" onClick={() => { navigator.clipboard.writeText(mintRevealed.secret); toast.toast({ title: "Copied" }); }}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Prefix: <code>{mintRevealed.prefix}</code></p>
              </div>
              <DialogFooter>
                <Button onClick={() => { setMintFor(null); setMintRevealed(null); }}>Done</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
