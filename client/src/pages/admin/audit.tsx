import { useState } from "react";
import { Search, Download, Filter, User, Settings, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { formatDistanceToNow } from "date-fns";

const auditLogs = [
  { id: "1", action: "user.login", actor: "admin@visashuttle.com", target: null, ip: "192.168.1.1", timestamp: new Date(Date.now() - 1000 * 60 * 5), details: "Successful login" },
  { id: "2", action: "tenant.created", actor: "admin@visashuttle.com", target: "Quick Visa Services", ip: "192.168.1.1", timestamp: new Date(Date.now() - 1000 * 60 * 30), details: "New tenant account created" },
  { id: "3", action: "template.updated", actor: "admin@visashuttle.com", target: "Schengen Tourist", ip: "192.168.1.1", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), details: "Updated visa requirements" },
  { id: "4", action: "user.password_reset", actor: "support@visashuttle.com", target: "owner@demoagency.com", ip: "192.168.1.2", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), details: "Password reset initiated" },
  { id: "5", action: "tenant.suspended", actor: "admin@visashuttle.com", target: "Express Visa Hub", ip: "192.168.1.1", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), details: "Account suspended for policy violation" },
  { id: "6", action: "settings.changed", actor: "admin@visashuttle.com", target: "AI Quota Limits", ip: "192.168.1.1", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), details: "Increased default quota" },
];

const getActionIcon = (action: string) => {
  if (action.startsWith("user.")) return User;
  if (action.startsWith("settings.")) return Settings;
  if (action.startsWith("template.") || action.startsWith("document.")) return FileText;
  return Shield;
};

const getActionColor = (action: string) => {
  if (action.includes("suspended") || action.includes("deleted")) return "text-red-600 dark:text-red-400";
  if (action.includes("created") || action.includes("approved")) return "text-emerald-600 dark:text-emerald-400";
  return "text-muted-foreground";
};

export default function AdminAuditPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.target && log.target.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesAction = actionFilter === "all" || log.action.startsWith(actionFilter);
    return matchesSearch && matchesAction;
  });

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Audit Logs</h1>
            <p className="text-muted-foreground">Track all administrative actions on the platform.</p>
          </div>
          <Button variant="outline" className="gap-2" data-testid="button-export">
            <Download className="w-4 h-4" />
            Export Logs
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-search-logs"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-action-filter">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="user">User Actions</SelectItem>
              <SelectItem value="tenant">Tenant Actions</SelectItem>
              <SelectItem value="template">Template Actions</SelectItem>
              <SelectItem value="settings">Settings Actions</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0 divide-y">
            {filteredLogs.map((log) => {
              const Icon = getActionIcon(log.action);
              return (
                <div 
                  key={log.id}
                  className="flex items-start gap-4 p-4 hover:bg-muted/50"
                  data-testid={`audit-log-${log.id}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${getActionColor(log.action)}`}>
                        {log.action.replace(".", ": ").replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{log.details}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span>By: {log.actor}</span>
                      {log.target && <span>Target: {log.target}</span>}
                      <span>IP: {log.ip}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {auditLogs.length} logs
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <Button variant="outline" size="sm">Next</Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
