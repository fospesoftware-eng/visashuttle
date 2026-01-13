import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Home, FileText, MessageSquare, User, LogOut, Plus,
  Clock, CheckCircle2, AlertCircle, Loader2, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { Tenant, Case } from "@shared/schema";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "text-amber-600", icon: Clock },
  in_progress: { label: "In Progress", color: "text-blue-600", icon: Loader2 },
  documents_required: { label: "Documents Required", color: "text-orange-600", icon: AlertCircle },
  under_review: { label: "Under Review", color: "text-purple-600", icon: FileText },
  approved: { label: "Approved", color: "text-emerald-600", icon: CheckCircle2 },
  rejected: { label: "Rejected", color: "text-red-600", icon: AlertCircle },
};

export default function WhiteLabelPortalPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [referenceId, setReferenceId] = useState("");
  const [lastName, setLastName] = useState("");

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/w", slug, "tenant"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/tenant`);
      if (!res.ok) throw new Error("Agency not found");
      return res.json();
    }
  });

  // Check authentication status
  const { data: authData, isLoading: authLoading } = useQuery<{ authenticated: boolean; customer?: any }>({
    queryKey: ["/api/w", slug, "auth/me"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/auth/me`, { credentials: "include" });
      if (!res.ok) return { authenticated: false };
      return res.json();
    }
  });

  // Redirect if not authenticated
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
      toast({ title: "Success", description: "Case linked to your account!" });
      setClaimDialogOpen(false);
      setReferenceId("");
      setLastName("");
      refetchCases();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "Could not claim case", 
        variant: "destructive" 
      });
    }
  };

  if (!tenant || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header 
        className="border-b px-4 py-3 flex items-center justify-between"
        style={{ borderBottomColor: tenant.primaryColor ? `${tenant.primaryColor}30` : undefined }}
      >
        <div className="flex items-center gap-3">
          {tenant.logoUrl ? (
            <img src={tenant.logoUrl} alt={tenant.name} className="h-8" />
          ) : (
            <span className="font-bold text-lg" style={{ color: tenant.primaryColor || undefined }}>
              {tenant.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={handleLogout}
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Applications</h1>
            <p className="text-muted-foreground">Track your visa application progress</p>
          </div>
          <Dialog open={claimDialogOpen} onOpenChange={setClaimDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-claim-case">
                <Plus className="w-4 h-4" />
                Claim Case
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Claim Your Case</DialogTitle>
                <DialogDescription>
                  Enter your reference ID to link an existing case to your account
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
                  style={{ backgroundColor: tenant.primaryColor || undefined }}
                  data-testid="button-submit-claim"
                >
                  Claim Case
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {casesLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : cases.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No Applications Yet</h3>
              <p className="text-muted-foreground mb-4">
                You don't have any visa applications linked to your account.
              </p>
              <Button 
                onClick={() => setClaimDialogOpen(true)}
                style={{ backgroundColor: tenant.primaryColor || undefined }}
              >
                Claim an Existing Case
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {cases.map((caseItem) => {
              const status = statusConfig[caseItem.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              return (
                <Card 
                  key={caseItem.id} 
                  className="hover-elevate cursor-pointer"
                  onClick={() => setLocation(`/w/${slug}/portal/case/${caseItem.id}`)}
                  data-testid={`case-card-${caseItem.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-muted-foreground">
                            {caseItem.referenceId}
                          </span>
                          <span className={`text-sm flex items-center gap-1 ${status.color}`}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.label}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg">
                          {caseItem.visaType} - {caseItem.destinationCountry}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Travel Date: {caseItem.travelDate ? new Date(caseItem.travelDate).toLocaleDateString() : "Not set"}
                        </p>
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{caseItem.readinessScore || 0}%</span>
                          </div>
                          <Progress value={caseItem.readinessScore || 0} className="h-2" />
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {tenant.whatsappNumber && (
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4 flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#25D36620" }}
              >
                <MessageSquare className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Need Help?</h3>
                <p className="text-sm text-muted-foreground">Chat with us on WhatsApp</p>
              </div>
              <Button 
                variant="outline" 
                className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                onClick={() => window.open(`https://wa.me/${tenant.whatsappNumber?.replace(/\D/g, "")}`, "_blank")}
                data-testid="button-whatsapp"
              >
                Chat Now
              </Button>
            </CardContent>
          </Card>
        )}
      </main>

      <nav className="border-t bg-background sticky bottom-0">
        <div className="max-w-4xl mx-auto flex items-center justify-around py-2">
          <Button variant="ghost" className="flex-col gap-1 h-auto py-2" data-testid="nav-home">
            <Home className="w-5 h-5" style={{ color: tenant.primaryColor || undefined }} />
            <span className="text-xs" style={{ color: tenant.primaryColor || undefined }}>Home</span>
          </Button>
          <Button 
            variant="ghost" 
            className="flex-col gap-1 h-auto py-2"
            onClick={() => cases[0] && setLocation(`/w/${slug}/portal/case/${cases[0].id}`)}
            data-testid="nav-documents"
          >
            <FileText className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Documents</span>
          </Button>
          <Button 
            variant="ghost" 
            className="flex-col gap-1 h-auto py-2"
            onClick={() => setLocation(`/w/${slug}/portal/messages`)}
            data-testid="nav-messages"
          >
            <MessageSquare className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Messages</span>
          </Button>
          <Button 
            variant="ghost" 
            className="flex-col gap-1 h-auto py-2"
            onClick={() => setLocation(`/w/${slug}/portal/profile`)}
            data-testid="nav-profile"
          >
            <User className="w-5 h-5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Profile</span>
          </Button>
        </div>
      </nav>

      {tenant.showPoweredBy && (
        <div className="py-2 text-center text-xs text-muted-foreground border-t">
          Powered by <span className="font-medium gradient-text">Visa Shuttle</span>
        </div>
      )}
    </div>
  );
}
