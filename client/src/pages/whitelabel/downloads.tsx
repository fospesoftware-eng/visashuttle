import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Tenant, Case } from "@shared/schema";

export default function WhiteLabelDownloadsPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/w", slug, "tenant"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/tenant`);
      if (!res.ok) throw new Error("Agency not found");
      return res.json();
    }
  });

  // Check auth status
  const { data: authData, isLoading: authLoading } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/w", slug, "auth/me"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/auth/me`, { credentials: "include" });
      if (!res.ok) return { authenticated: false };
      return res.json();
    }
  });

  if (!authLoading && !authData?.authenticated) {
    setLocation(`/w/${slug}/login`);
    return null;
  }

  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/w", slug, "portal/cases"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/portal/cases`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!authData?.authenticated
  });

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // For MVP, downloads are a placeholder feature
  const downloadableItems = [
    { id: "1", name: "Visa Application Checklist", type: "PDF", size: "245 KB" },
    { id: "2", name: "Document Requirements Guide", type: "PDF", size: "512 KB" },
    { id: "3", name: "Travel Insurance Info", type: "PDF", size: "128 KB" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b px-4 py-3 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation(`/w/${slug}/portal`)}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-semibold">Downloads</h1>
      </header>

      <main className="flex-1 p-4 max-w-xl mx-auto w-full space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Available Documents</CardTitle>
            <CardDescription>Resources and guides for your visa application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {downloadableItems.map((item) => (
              <div 
                key={item.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover-elevate cursor-pointer"
                data-testid={`download-${item.id}`}
              >
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: tenant.primaryColor ? `${tenant.primaryColor}20` : undefined }}
                >
                  <FileText className="w-5 h-5" style={{ color: tenant.primaryColor || undefined }} />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-muted-foreground">{item.type} - {item.size}</p>
                </div>
                <Button variant="ghost" size="icon">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {cases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Case Documents</CardTitle>
              <CardDescription>Download your uploaded documents</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-4">
                Document downloads will be available once your application is processed.
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {tenant.showPoweredBy && (
        <div className="py-2 text-center text-xs text-muted-foreground border-t">
          Powered by <span className="font-medium gradient-text">Visa Shuttle</span>
        </div>
      )}
    </div>
  );
}
