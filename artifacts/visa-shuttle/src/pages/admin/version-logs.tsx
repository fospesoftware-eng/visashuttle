import { GitBranch, Plus, Rocket } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const logs = [
  { version: "v1.8", title: "Visa Tools, credits, and B2C plan upgrades", status: "Published" },
  { version: "v1.7", title: "Visa Desk proposal and customer portal improvements", status: "Published" },
  { version: "v1.6", title: "Payments, public policy pages, and business pages", status: "Published" },
];

export default function AdminVersionLogsPage() {
  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <GitBranch className="h-6 w-6 text-primary" />
              Version Logs
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage product release notes shown in the support/version log section.</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Version
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {logs.map((log) => (
                <div key={log.version} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Rocket className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{log.version} · {log.title}</p>
                      <p className="text-sm text-muted-foreground">Visible on public version logs</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="w-fit bg-emerald-50 text-emerald-700">{log.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
