import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Home, FileText, MessageSquare, User, LogOut, Plus, Upload,
  Clock, CheckCircle2, AlertCircle, Loader2, ChevronRight, Plane, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Tenant, Case } from "@workspace/db";

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  pending: { label: "Pending", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-100 dark:bg-amber-950", icon: Clock },
  in_progress: { label: "In Progress", color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-100 dark:bg-blue-950", icon: Loader2 },
  documents_required: { label: "Documents Required", color: "text-orange-700 dark:text-orange-400", bgColor: "bg-orange-100 dark:bg-orange-950", icon: AlertCircle },
  under_review: { label: "Under Review", color: "text-purple-700 dark:text-purple-400", bgColor: "bg-purple-100 dark:bg-purple-950", icon: FileText },
  approved: { label: "Approved", color: "text-emerald-700 dark:text-emerald-400", bgColor: "bg-emerald-100 dark:bg-emerald-950", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-100 dark:bg-red-950", icon: AlertCircle },
};

export default function WhiteLabelPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [referenceId, setReferenceId] = useState("");
  const [lastName, setLastName] = useState("");

  // Auto-open claim dialog if ?ref= param is present
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref")
      || sessionStorage.getItem("wl_ref");
    if (ref) {
      setReferenceId(ref.toUpperCase());
      setClaimDialogOpen(true);
      sessionStorage.removeItem("wl_ref");
      // Clean URL without reload
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/w", slug, "tenant"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/tenant`);
      if (!res.ok) throw new Error("Agency not found");
      return res.json();
    }
  });

  const { data: authData, isLoading: authLoading } = useQuery<{ authenticated: boolean; customer?: any }>({
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

  const { data: cases = [], isLoading: casesLoading, refetch: refetchCases } = useQuery<Case[]>({
    queryKey: ["/api/w", slug, "portal/cases"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/portal/cases`, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) return [];
        throw new Error("Failed to load cases");
      }
      return res.json();
    },
    enabled: !!authData?.authenticated
  });

  const handleLogout = async () => {
    await apiRequest("POST", `/api/w/${slug}/auth/logout`, {});
    queryClient.invalidateQueries({ queryKey: ["/api/w", slug] });
    setLocation(`/w/${slug}/login`);
  };

  const handleClaimCase = async () => {
    if (!referenceId) return;
    try {
      await apiRequest("POST", `/api/w/${slug}/portal/claim-case`, {
        referenceId,
        lastName
      });
      toast({ title: "Success", description: "Application linked to your account!" });
      setClaimDialogOpen(false);
      setReferenceId("");
      setLastName("");
      refetchCases();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Could not link application", 
        variant: "destructive" 
      });
    }
  };

  if (!tenant || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const primaryColor = tenant.primaryColor || "#00B4D8";

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header 
        className="sticky top-0 z-50 border-b bg-white dark:bg-slate-900"
        style={{ borderBottomColor: `${primaryColor}30` }}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-8" />
            ) : (
              <span className="font-bold text-lg" style={{ color: primaryColor }}>
                {tenant.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:block">
              {authData?.customer?.name || authData?.customer?.email}
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">
        <div 
          className="py-8 px-4 mb-6"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}15, ${tenant.secondaryColor || "#E056A0"}15)`
          }}
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  Welcome back{authData?.customer?.name ? `, ${authData.customer.name.split(" ")[0]}` : ""}!
                </h1>
                <p className="text-muted-foreground">Track and manage your visa applications</p>
              </div>
              <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="gap-2 shadow-lg"
                    style={{ backgroundColor: primaryColor }}
                    data-testid="button-claim-case"
                  >
                    <Plus className="w-4 h-4" />
                    New Application
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Track Your Application</DialogTitle>
                    <DialogDescription>
                      Enter the reference ID your travel agent shared with you to track your visa application.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="refId">Reference ID</Label>
                      <Input
                        id="refId"
                        placeholder="REF-ABC123"
                        value={referenceId}
                        onChange={(e) => setReferenceId(e.target.value.toUpperCase())}
                        className="font-mono"
                        data-testid="input-reference-id"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name (for verification)</Label>
                      <Input
                        id="lastName"
                        placeholder="Smith"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        data-testid="input-last-name"
                      />
                    </div>
                    <Button 
                      className="w-full"
                      onClick={handleClaimCase}
                      style={{ backgroundColor: primaryColor }}
                      data-testid="button-submit-claim"
                    >
                      Track Application
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 space-y-6">
          {casesLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : cases.length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <div 
                  className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Plane className="w-10 h-10" style={{ color: primaryColor }} />
                </div>
                <h3 className="font-bold text-xl mb-2">No Applications Yet</h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  You don't have any visa applications yet. Use the reference ID your travel agent shared with you to get started.
                </p>
                <Button 
                  size="lg"
                  onClick={() => setClaimDialogOpen(true)}
                  style={{ backgroundColor: primaryColor }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Application
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Your Applications ({cases.length})</h2>
              {cases.map((caseItem) => {
                const status = statusConfig[caseItem.status] || statusConfig.pending;
                const StatusIcon = status.icon;
                return (
                  <Card 
                    key={caseItem.id} 
                    className="hover-elevate cursor-pointer border-0 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-slate-900"
                    onClick={() => setLocation(`/w/${slug}/portal/case/${caseItem.id}`)}
                    data-testid={`case-card-${caseItem.id}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${primaryColor}15` }}
                        >
                          <Plane className="w-6 h-6" style={{ color: primaryColor }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-mono text-sm text-muted-foreground">
                              {caseItem.referenceId}
                            </span>
                            <Badge className={`${status.bgColor} ${status.color} border-0`}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {status.label}
                            </Badge>
                          </div>
                          <h3 className="font-semibold text-lg mb-1">
                            {caseItem.visaType} - {caseItem.destinationCountry}
                          </h3>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {caseItem.travelDate ? new Date(caseItem.travelDate).toLocaleDateString() : "Date TBD"}
                            </span>
                          </div>
                          <div className="mt-4">
                            {(() => {
                              const score = caseItem.readinessScore ??
                                (caseItem.status === "approved" ? 100 :
                                 caseItem.status === "under_review" || caseItem.status === "submitted" ? 85 :
                                 caseItem.status === "in_progress" ? 60 :
                                 caseItem.status === "documents_required" ? 40 : 20);
                              return (
                                <>
                                  <div className="flex items-center justify-between text-sm mb-2">
                                    <span className="text-muted-foreground">Application Progress</span>
                                    <span className="font-semibold" style={{ color: primaryColor }}>{score}%</span>
                                  </div>
                                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{ width: `${score}%`, backgroundColor: primaryColor }}
                                    />
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-4" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {tenant.whatsappNumber && (
            <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-emerald-900 dark:text-emerald-100">Need Help?</h3>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">Chat with us on WhatsApp for quick support</p>
                </div>
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                  onClick={() => window.open(`https://wa.me/${tenant.whatsappNumber?.replace(/\D/g, "")}`, "_blank")}
                  data-testid="button-whatsapp"
                >
                  Chat Now
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-white dark:bg-slate-900 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-around">
          <Button 
            variant="ghost" 
            className="flex-col gap-1 h-16 flex-1 rounded-none" 
            data-testid="nav-home"
          >
            <Home className="w-5 h-5" style={{ color: primaryColor }} />
            <span className="text-xs font-medium" style={{ color: primaryColor }}>Home</span>
          </Button>
          <Button 
            variant="ghost" 
            className="flex-col gap-1 h-16 flex-1 rounded-none"
            onClick={() => setLocation(`/w/${slug}/portal/uploads`)}
            data-testid="nav-uploads"
          >
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Upload</span>
          </Button>
          <Button 
            variant="ghost" 
            className="flex-col gap-1 h-16 flex-1 rounded-none"
            onClick={() => setLocation(`/w/${slug}/portal/messages`)}
            data-testid="nav-messages"
          >
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Messages</span>
          </Button>
          <Button 
            variant="ghost" 
            className="flex-col gap-1 h-16 flex-1 rounded-none"
            onClick={() => setLocation(`/w/${slug}/portal/profile`)}
            data-testid="nav-profile"
          >
            <User className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Profile</span>
          </Button>
        </div>
      </nav>

      {tenant.showPoweredBy && (
        <div className="fixed bottom-16 left-0 right-0 py-2 text-center text-xs text-muted-foreground bg-slate-50 dark:bg-slate-950 border-t">
          Powered by <span className="font-semibold gradient-text">Visa Shuttle</span>
        </div>
      )}
    </div>
  );
}
