import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Mail, ArrowRight, Loader2, Plane, Shield, Clock, Globe } from "lucide-react";
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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tenantError || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle>Agency Not Found</CardTitle>
            <CardDescription>The agency you're looking for doesn't exist.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const primaryColor = tenant.primaryColor || "#00B4D8";
  const secondaryColor = tenant.secondaryColor || "#E056A0";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div 
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-10 w-80 h-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="mb-12">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-16 brightness-0 invert" />
            ) : (
              <h1 className="text-4xl font-bold">{tenant.name}</h1>
            )}
          </div>
          
          <h2 className="text-3xl font-bold mb-4">
            Your Visa Journey<br />Starts Here
          </h2>
          <p className="text-lg text-white/80 mb-12">
            Track your application, upload documents, and stay updated on your visa status in real-time.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Real-time Updates</h3>
                <p className="text-sm text-white/70">Get instant notifications on your application status</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Secure & Private</h3>
                <p className="text-sm text-white/70">Your documents are encrypted and protected</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Expert Support</h3>
                <p className="text-sm text-white/70">Our team is here to guide you every step</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-8 left-12 right-12 flex items-center justify-between text-white/60 text-sm">
          {tenant.contactEmail && (
            <span>{tenant.contactEmail}</span>
          )}
          {tenant.contactPhone && (
            <span>{tenant.contactPhone}</span>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-screen lg:min-h-0">
        <div 
          className="lg:hidden p-6 text-white"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt={tenant.name} className="h-10 brightness-0 invert" />
            ) : (
              <h1 className="text-xl font-bold">{tenant.name}</h1>
            )}
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Plane className="w-4 h-4" />
            <span className="text-sm">Your Visa Journey Starts Here</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="w-full max-w-md">
            <div className="text-center mb-8 lg:mb-10">
              <div 
                className="hidden lg:flex w-16 h-16 rounded-2xl mx-auto mb-6 items-center justify-center"
                style={{ backgroundColor: `${primaryColor}15` }}
              >
                <Mail className="w-8 h-8" style={{ color: primaryColor }} />
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
                {mode === "signin" ? "Welcome Back" : "Create Account"}
              </h2>
              <p className="text-muted-foreground">
                {mode === "signin" ? "Sign in to track your visa application" : "Sign up to get started with your visa journey"}
              </p>
            </div>

            <Card className="border-0 shadow-xl">
              <CardContent className="p-6 lg:p-8">
                <div className="flex rounded-lg bg-muted p-1 mb-6">
                  <button
                    type="button"
                    onClick={() => setMode("signin")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      mode === "signin" 
                        ? "bg-background shadow text-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="tab-signin"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                      mode === "signup" 
                        ? "bg-background shadow text-foreground" 
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid="tab-signup"
                  >
                    Sign Up
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="h-12"
                      data-testid="input-email"
                    />
                  </div>
                  
                  {mode === "signup" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="John Smith"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="h-12"
                          data-testid="input-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+1 234 567 8900"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="h-12"
                          data-testid="input-phone"
                        />
                      </div>
                    </>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full h-12 text-base font-medium gap-2"
                    disabled={requestOTPMutation.isPending}
                    style={{ backgroundColor: primaryColor }}
                    data-testid="button-continue"
                  >
                    {requestOTPMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {mode === "signin" ? "Sign In" : "Create Account"}
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                </form>
                
                <div className="mt-6 p-3 rounded-lg bg-muted/50 border border-dashed">
                  <p className="text-xs text-muted-foreground text-center">
                    Demo: Use code <span className="font-mono font-bold text-foreground">123456</span> for testing
                  </p>
                </div>
                
                <p className="text-xs text-muted-foreground text-center mt-4">
                  We'll send you a one-time code to verify your email. No password required.
                </p>
              </CardContent>
            </Card>

            {(tenant.contactEmail || tenant.contactPhone) && (
              <div className="mt-8 text-center lg:hidden">
                <p className="text-sm text-muted-foreground mb-2">Need help?</p>
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                  {tenant.contactEmail && (
                    <a href={`mailto:${tenant.contactEmail}`} className="hover:underline" style={{ color: primaryColor }}>
                      {tenant.contactEmail}
                    </a>
                  )}
                  {tenant.contactPhone && (
                    <a href={`tel:${tenant.contactPhone}`} className="hover:underline" style={{ color: primaryColor }}>
                      {tenant.contactPhone}
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {tenant.showPoweredBy && (
          <div className="py-4 text-center text-sm text-muted-foreground bg-slate-50 dark:bg-slate-950">
            Powered by <span className="font-semibold gradient-text">Visa Shuttle</span>
          </div>
        )}
      </div>
    </div>
  );
}
