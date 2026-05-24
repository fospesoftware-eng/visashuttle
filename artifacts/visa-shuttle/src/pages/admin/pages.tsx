import { Edit3, FileText, Globe2, Plus, Save } from "lucide-react";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const pages = [
  { title: "About Visa Shuttle", slug: "/about", status: "Published", owner: "Marketing" },
  { title: "Contact", slug: "/contact", status: "Published", owner: "Support" },
  { title: "Terms and Conditions", slug: "/terms-and-conditions", status: "Published", owner: "Legal" },
  { title: "Refund Policy", slug: "/refund-policy", status: "Published", owner: "Legal" },
  { title: "Data Policy", slug: "/data-policy", status: "Published", owner: "Legal" },
  { title: "3rd Party Integration Policy", slug: "/third-party-integration-policy", status: "Published", owner: "Legal" },
];

export default function AdminPagesPage() {
  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <FileText className="h-6 w-6 text-primary" />
              Pages
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage public website pages, policies, and page ownership.</p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Page
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Published pages", pages.length],
            ["Policy pages", 4],
            ["Draft changes", 0],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-black">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {pages.map((page) => (
                <div key={page.slug} className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Globe2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{page.title}</p>
                      <p className="text-sm text-muted-foreground">{page.slug} · {page.owner}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700">{page.status}</Badge>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Edit3 className="h-4 w-4" />
                      Edit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          <Save className="mr-2 inline h-4 w-4 text-primary" />
          Publishing storage can be connected to the production CMS/database table when dynamic page editing is enabled.
        </div>
      </div>
    </DashboardLayout>
  );
}
