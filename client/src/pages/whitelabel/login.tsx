import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Tenant } from "@shared/schema";

export default function WhiteLabelLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const { data: tenant, isLoading: tenantLoading, error: tenantError } = useQuery<Tenant>({
    queryKey: ["/api/w", slug, "tenant"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/tenant`);
      if (!res.ok) throw new Error("Agency not found");
      return res.json();
    }
  });

  const requestOTPMutation = useMutation({
    mutationFn: async (data: { email: string; name?: string; phone?: string }) => {
      return apiRequest("POST", `/api/w/${slug}/auth/request-otp`, data);
    },
    onSuccess: () => {
      sessionStorage.setItem("wl_email", email);
      sessionStorage.setItem("wl_name", name);
      sessionStorage.setItem("wl_phone", phone);
      setLocation(`/w/${slug}/verify`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive"
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: "Email required", description: "Please enter your email address", variant: "destructive" });
      return;
    }
    requestOTPMutation.mutate({ email, name, phone });
  };

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tenantError || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Agency Not Found</CardTitle>
            <CardDescription>The agency you're looking for doesn't exist.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const brandStyle = {
    "--brand-primary": tenant.primaryColor || "#00B4D8",
    "--brand-secondary": tenant.secondaryColor || "#E056A0",
  } as React.CSSProperties;

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={brandStyle}
    >
      <div 
        className="flex-1 flex items-center justify-center p-4"
        style={{
          background: `linear-gradient(135deg, ${tenant.primaryColor || "#00B4D8"}20, ${tenant.secondaryColor || "#E056A0"}20)`
        }}
      >
        <Card className="max-w-md w-full">
          <CardHeader className="text-center space-y-4">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-12 mx-auto" />
            ) : (
              <h1 
                className="text-2xl font-bold"
                style={{ color: tenant.primaryColor || "#00B4D8" }}
              >
                {tenant.name}
              </h1>
            )}
            <div>
              <CardTitle className="text-xl">Welcome</CardTitle>
              <CardDescription>Sign in to track your visa application</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name (optional)</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  data-testid="input-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  data-testid="input-phone"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full gap-2"
                disabled={requestOTPMutation.isPending}
                style={{ backgroundColor: tenant.primaryColor || undefined }}
                data-testid="button-continue"
              >
                {requestOTPMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Continue with Email
                <ArrowRight className="w-4 h-4" />
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-4">
              We'll send you a one-time code to verify your email
            </p>
          </CardContent>
        </Card>
      </div>
      {tenant.showPoweredBy && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          Powered by <span className="font-medium gradient-text">Visa Shuttle</span>
        </div>
      )}
    </div>
  );
}
