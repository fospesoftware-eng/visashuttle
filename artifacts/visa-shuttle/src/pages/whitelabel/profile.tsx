import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, User, Mail, Phone, LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import type { Tenant } from "@workspace/db";

interface ProfileData {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
}

export default function WhiteLabelProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

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

  // Fetch profile data from server
  const { data: profile, isLoading: profileLoading } = useQuery<ProfileData>({
    queryKey: ["/api/w", slug, "portal/profile"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/portal/profile`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
    enabled: !!authData?.authenticated
  });

  const handleLogout = async () => {
    await apiRequest("POST", `/api/w/${slug}/auth/logout`, {});
    queryClient.invalidateQueries({ queryKey: ["/api/w", slug] });
    setLocation(`/w/${slug}/login`);
  };

  if (!tenant || authLoading || profileLoading) {
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
              {profile?.name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || "C"}
            </AvatarFallback>
          </Avatar>
          <h2 className="text-xl font-semibold">{profile?.name || "Customer"}</h2>
          <p className="text-muted-foreground">{profile?.email}</p>
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
                <p className="font-medium">{profile?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{profile?.name || "Not provided"}</p>
              </div>
            </div>
            {profile?.phone && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{profile.phone}</p>
                </div>
              </div>
            )}
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
