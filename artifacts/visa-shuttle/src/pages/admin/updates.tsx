import { CalendarClock, Edit3, Newspaper, Plus, Sparkles } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const updates = [
  { country: "United Kingdom", title: "Visitor visa evidence trends to watch", schedule: "Daily", status: "Ready" },
  { country: "Schengen Area", title: "Short-stay documentation readiness signals", schedule: "Daily", status: "Ready" },
  { country: "Canada", title: "Temporary resident profile strength notes", schedule: "Daily", status: "Ready" },
  { country: "Australia", title: "Visitor and student application watchlist", schedule: "Daily", status: "Ready" },
];

export default function AdminUpdatesPage() {
  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <Newspaper className="h-6 w-6 text-primary" />
              Updates
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage daily visa update posts, countries, images, and AI draft publishing.</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Update
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Daily posts</p><p className="mt-2 text-3xl font-black">{updates.length}</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Automation mode</p><p className="mt-2 text-3xl font-black">Daily</p></CardContent></Card>
          <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Draft queue</p><p className="mt-2 text-3xl font-black">0</p></CardContent></Card>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {updates.map((update) => (
                <div key={update.country} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{update.title}</p>
                      <p className="text-sm text-muted-foreground">{update.country} · {update.schedule} auto blog slot</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700">{update.status}</Badge>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Edit3 className="h-4 w-4" />
                      Manage
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          <CalendarClock className="mr-2 inline h-4 w-4 text-primary" />
          Daily automation is represented in the admin workflow. Connect a production scheduler/news ingestion worker to publish live country updates automatically.
        </div>
      </div>
    </DashboardLayout>
  );
}
