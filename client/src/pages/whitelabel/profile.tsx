import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, User, Mail, Phone, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Tenant, CustomerAccount } from "@shared/schema";

export default function WhiteLabelProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const [customerId, setCustomerId] = useState<string | null>(null);

  useEffect(() => {
    const storedId = sessionStorage.getItem("wl_customer_id");
    if (!storedId) {
      setLocation(`/w/${slug}/login`);
      return;
    }
    setCustomerId(storedId);
  }, [slug, setLocation]);

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/w", slug, "tenant"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/tenant`);
      if (!res.ok) throw new Error("Agency not found");
      return res.json();
    }
  });

  // For now we'll get basic info from session storage
  const storedEmail = sessionStorage.getItem("wl_email") || "john@example.com";
  const storedName = sessionStorage.getItem("wl_name") || "Customer";

  const handleLogout = () => {
    sessionStorage.removeItem("wl_customer_id");
    sessionStorage.removeItem("wl_tenant_id");
    sessionStorage.removeItem("wl_email");
    sessionStorage.removeItem("wl_name");
    sessionStorage.removeItem("wl_phone");
    setLocation(`/w/${slug}/login`);
  };

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
        <h1 className="font-semibold">Profile</h1>
      </header>

      <main className="flex-1 p-4 max-w-xl mx-auto w-full space-y-6">
        <div className="flex flex-col items-center py-6">
          <Avatar className="w-24 h-24 mb-4">
            <AvatarFallback 
              className="text-2xl"
              style={{ backgroundColor: tenant.primaryColor ? `${tenant.primaryColor}20` : undefined, color: tenant.primaryColor || undefined }}
            >
              {storedName?.charAt(0).toUpperCase() || "C"}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-semibold">{storedName || "Customer"}</h2>
          <p className="text-muted-foreground">{storedEmail}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{storedEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{storedName || "Not provided"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Agency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tenant.contactEmail && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <a href={`mailto:${tenant.contactEmail}`} className="text-primary hover:underline">
                  {tenant.contactEmail}
                </a>
              </div>
            )}
            {tenant.contactPhone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <a href={`tel:${tenant.contactPhone}`} className="text-primary hover:underline">
                  {tenant.contactPhone}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        <Button 
          variant="outline" 
          className="w-full gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          onClick={handleLogout}
          data-testid="button-logout"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
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
