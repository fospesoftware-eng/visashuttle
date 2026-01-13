import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  ArrowLeft, Upload, CheckCircle2, Clock, AlertCircle, 
  FileText, Camera, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { Tenant, Case, Document } from "@shared/schema";

const docStatusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "Pending Review", color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30", icon: Clock },
  approved: { label: "Approved", color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-red-600", bg: "bg-red-100 dark:bg-red-900/30", icon: AlertCircle },
  needs_reupload: { label: "Needs Reupload", color: "text-orange-600", bg: "bg-orange-100 dark:bg-orange-900/30", icon: AlertCircle },
};

const docTypeIcons: Record<string, any> = {
  passport: FileText,
  photo: Camera,
  bank_statement: FileText,
  itinerary: FileText,
  accommodation: FileText,
  insurance: FileText,
  employment_letter: FileText,
};

export default function WhiteLabelCasePage() {
  const { slug, caseId } = useParams<{ slug: string; caseId: string }>();
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

  const { data: caseData, isLoading: caseLoading } = useQuery<Case>({
    queryKey: ["/api/w", slug, "portal/cases", caseId],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/portal/cases/${caseId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Case not found");
      return res.json();
    },
    enabled: !!authData?.authenticated && !!caseId
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/w", slug, "portal/cases", caseId, "documents"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/portal/cases/${caseId}/documents`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load documents");
      return res.json();
    },
    enabled: !!authData?.authenticated && !!caseId
  });

  if (!tenant || caseLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="font-semibold text-lg mb-2">Case Not Found</h2>
            <Button variant="outline" onClick={() => setLocation(`/w/${slug}/portal`)}>
              Back to Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const approvedDocs = documents.filter(d => d.status === "approved").length;
  const totalDocs = documents.length || 1;

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
        <div>
          <h1 className="font-semibold">Case Details</h1>
          <p className="text-sm text-muted-foreground font-mono">{caseData.referenceId}</p>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-xl font-semibold">{caseData.visaType}</h2>
                <p className="text-muted-foreground">{caseData.destinationCountry}</p>
              </div>
              <Badge 
                variant="secondary"
                className={caseData.status === "approved" ? "bg-emerald-100 text-emerald-700" : ""}
              >
                {caseData.status.replace("_", " ")}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Travel Date</span>
                <p className="font-medium">
                  {caseData.travelDate ? new Date(caseData.travelDate).toLocaleDateString() : "Not set"}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Case Number</span>
                <p className="font-medium font-mono">{caseData.caseNumber}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Document Progress</span>
                <span className="font-medium">{approvedDocs}/{totalDocs} approved</span>
              </div>
              <Progress value={(approvedDocs / totalDocs) * 100} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Documents</h3>
            <Button 
              size="sm" 
              className="gap-2"
              style={{ backgroundColor: tenant.primaryColor || undefined }}
              onClick={() => setLocation(`/w/${slug}/portal/uploads?caseId=${caseId}`)}
              data-testid="button-upload"
            >
              <Upload className="w-4 h-4" />
              Upload
            </Button>
          </div>
          
          <div className="space-y-2">
            {documents.map((doc) => {
              const status = docStatusConfig[doc.status] || docStatusConfig.pending;
              const StatusIcon = status.icon;
              const TypeIcon = docTypeIcons[doc.type] || FileText;
              return (
                <Card key={doc.id} data-testid={`doc-${doc.id}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status.bg}`}>
                      <TypeIcon className={`w-5 h-5 ${status.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <div className="flex items-center gap-2 text-xs">
                        <StatusIcon className={`w-3 h-3 ${status.color}`} />
                        <span className={status.color}>{status.label}</span>
                      </div>
                    </div>
                    {doc.status === "needs_reupload" && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setLocation(`/w/${slug}/portal/uploads?caseId=${caseId}&docType=${doc.type}`)}
                      >
                        Reupload
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        <Button 
          variant="outline" 
          className="w-full gap-2"
          onClick={() => setLocation(`/w/${slug}/portal/messages?caseId=${caseId}`)}
          data-testid="button-messages"
        >
          Chat with Agent
        </Button>
      </main>

      {tenant.showPoweredBy && (
        <div className="py-2 text-center text-xs text-muted-foreground border-t">
          Powered by <span className="font-medium gradient-text">Visa Shuttle</span>
        </div>
      )}
    </div>
  );
}
