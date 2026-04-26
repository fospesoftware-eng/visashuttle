import { useState, useMemo } from "react";
import { Search, Download, User, Settings, FileText, Shield, Building2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow, format } from "date-fns";

const getActionIcon = (action: string) => {
  if (action.includes("user")) return User;
  if (action.includes("settings")) return Settings;
  if (action.includes("template") || action.includes("document")) return FileText;
  if (action.includes("tenant")) return Building2;
  if (action.includes("otp") || action.includes("auth")) return Globe;
  return Shield;
};

const getActionColor = (action: string) => {
  if (action.includes("deleted") || action.includes("suspended")) return "text-red-600 dark:text-red-400";
  if (action.includes("created") || action.includes("approved") || action.includes("verified")) return "text-emerald-600 dark:text-emerald-400";
  if (action.includes("updated") || action.includes("changed")) return "text-blue-600 dark:text-blue-400";
  return "text-muted-foreground";
};

const getBadgeStyle = (action: string) => {
  if (action.includes("deleted") || action.includes("suspended")) return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";
  if (action.includes("created") || action.includes("approved") || action.includes("verified")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  return "bg-muted text-muted-foreground";
};

const PAGE_SIZE = 20;

export default function AdminAuditPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data: logs = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/activity-logs"],
  });

  const filtered = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.details ?? {}).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesAction = actionFilter === "all" || log.action.startsWith(actionFilter);
      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, actionFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleExport = () => {
    const csv = ["timestamp,action,entity_type,entity_id,details"]
      .concat(filtered.map(l => [
        l.createdAt ? format(new Date(l.createdAt), "yyyy-MM-dd HH:mm:ss") : "",
        l.action,
        l.entityType ?? "",
        l.entityId ?? "",
        JSON.stringify(l.details ?? {}),
      ].join(",")))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Audit Logs</h1>
            <p className="text-muted-foreground text-sm mt-1">Track all administrative and system actions on the platform.</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={handleExport} data-testid="button-export">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid gap-3 md:grid-cols-3">
          <Card><CardContent className="p-4"><p className="text-xl font-bold">{logs.length}</p><p className="text-sm text-muted-foreground">Total Events</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xl font-bold">{logs.filter(l => l.createdAt && new Date(l.createdAt).toDateString() === new Date().toDateString()).length}</p><p className="text-sm text-muted-foreground">Events Today</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xl font-bold">{new Set(logs.map(l => l.action.split(".")[0])).size}</p><p className="text-sm text-muted-foreground">Action Categories</p></CardContent></Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search action or details…" className="pl-9" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} data-testid="input-search-logs" />
          </div>
          <Select value={actionFilter} onValueChange={v => { setActionFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]" data-testid="select-action-filter"><SelectValue placeholder="Filter by category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="tenant">Tenant</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="otp">Auth / OTP</SelectItem>
              <SelectItem value="case">Case</SelectItem>
              <SelectItem value="document">Document</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Logs list */}
        <Card>
          <CardContent className="p-0 divide-y">
            {isLoading ? (
              <div className="p-4 space-y-3">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
            ) : paginated.length === 0 ? (
              <div className="py-16 text-center">
                <Shield className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No audit logs found.</p>
              </div>
            ) : paginated.map(log => {
              const Icon = getActionIcon(log.action);
              const detailStr = log.details ? Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(", ") : null;
              return (
                <div key={log.id} className="flex items-start gap-4 p-4 hover:bg-muted/30 transition-colors" data-testid={`audit-log-${log.id}`}>
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getBadgeStyle(log.action)}`}>
                        {log.action}
                      </span>
                      {log.entityType && (
                        <span className="text-xs text-muted-foreground">{log.entityType}</span>
                      )}
                    </div>
                    {detailStr && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{detailStr}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-muted-foreground">
                      {log.tenantId && <span>Tenant: {log.tenantId}</span>}
                      {log.entityId && <span>ID: {log.entityId.slice(0, 8)}…</span>}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap mt-0.5">
                    {log.createdAt ? formatDistanceToNow(new Date(log.createdAt), { addSuffix: true }) : "—"}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} logs
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
