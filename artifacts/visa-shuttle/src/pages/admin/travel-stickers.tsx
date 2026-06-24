import { useMemo, useState } from "react";
import { Download, Search, Ticket, DollarSign, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface PaymentRow {
  id: string;
  name: string;
  nationality: string | null;
  countryName: string;
  flag: string;
  amountCents: number | null;
  currency: string | null;
  captureId: string | null;
  createdAt: string | null;
}
interface Report {
  rows: PaymentRow[];
  totalCount: number;
  paidCount: number;
  totalRevenueCents: number;
}

function money(cents: number | null, currency: string | null) {
  if (cents == null) return "—";
  return `${currency || "USD"} ${(cents / 100).toFixed(2)}`;
}

export default function AdminTravelStickersPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<Report>({
    queryKey: ["/api/admin/travel-sticker-payments"],
  });

  const rows = data?.rows ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.countryName.toLowerCase().includes(q) ||
      (r.nationality || "").toLowerCase().includes(q) ||
      (r.captureId || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const handleExport = () => {
    const csv = ["date,name,nationality,destination,amount,currency,paypal_capture_id"]
      .concat(filtered.map(r => [
        r.createdAt ? format(new Date(r.createdAt), "yyyy-MM-dd HH:mm:ss") : "",
        `"${r.name.replace(/"/g, '""')}"`,
        r.nationality || "",
        r.countryName,
        r.amountCents != null ? (r.amountCents / 100).toFixed(2) : "",
        r.currency || "",
        r.captureId || "",
      ].join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `travel-sticker-payments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Travel Sticker Payments</h1>
          <p className="text-sm text-muted-foreground">Revenue and transactions from the B2C Travel Sticker ($1 PayPal checkout).</p>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="h-10 w-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Revenue</p>
                <p className="text-xl font-bold text-foreground">
                  {isLoading ? <Skeleton className="h-6 w-20" /> : `USD ${((data?.totalRevenueCents ?? 0) / 100).toFixed(2)}`}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Paid Stickers</p>
                <p className="text-xl font-bold text-foreground">
                  {isLoading ? <Skeleton className="h-6 w-12" /> : (data?.paidCount ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
                <Ticket className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Stickers</p>
                <p className="text-xl font-bold text-foreground">
                  {isLoading ? <Skeleton className="h-6 w-12" /> : (data?.totalCount ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, country, capture ID…" className="pl-9" />
          </div>
          <Button variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Nationality</th>
                    <th className="px-4 py-3 font-medium">Destination</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">PayPal Capture</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b"><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No travel sticker payments yet.</td></tr>
                  ) : (
                    filtered.map(r => (
                      <tr key={r.id} className="border-b hover:bg-muted/40">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                          {r.createdAt ? format(new Date(r.createdAt), "dd MMM yyyy, HH:mm") : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.nationality || "—"}</td>
                        <td className="px-4 py-3">{r.flag} {r.countryName}</td>
                        <td className="px-4 py-3 font-medium">{money(r.amountCents, r.currency)}</td>
                        <td className="px-4 py-3">
                          {r.captureId ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Paid</Badge>
                          ) : (
                            <Badge variant="secondary">Free / legacy</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.captureId || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
