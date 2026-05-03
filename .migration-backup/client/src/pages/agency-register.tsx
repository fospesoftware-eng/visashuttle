import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, ArrowRight, ArrowLeft, Check, Loader2, Globe, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";

const STEPS = [
  { id: 1, label: "Agency Details" },
  { id: 2, label: "Admin Account" },
  { id: 3, label: "Review & Launch" },
];

export default function AgencyRegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [agencyForm, setAgencyForm] = useState({
    agencyName: "",
    slug: "",
    contactPhone: "",
  });

  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const slugFromName = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleAgencyNameChange = (name: string) => {
    setAgencyForm(prev => ({
      ...prev,
      agencyName: name,
      slug: prev.slug || slugFromName(name),
    }));
  };

  const validateStep1 = () => {
    if (!agencyForm.agencyName.trim()) {
      toast({ title: "Agency name is required", variant: "destructive" });
      return false;
    }
    if (!agencyForm.slug.trim() || agencyForm.slug.length < 3) {
      toast({ title: "URL slug must be at least 3 characters", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!adminForm.name.trim() || !adminForm.email.trim() || !adminForm.password.trim()) {
      toast({ title: "All fields are required", variant: "destructive" });
      return false;
    }
    if (adminForm.password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" });
      return false;
    }
    if (adminForm.password !== adminForm.confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(s => s + 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/agency-register", {
        agencyName: agencyForm.agencyName,
        slug: agencyForm.slug,
        contactPhone: agencyForm.contactPhone,
        name: adminForm.name,
        email: adminForm.email,
        password: adminForm.password,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      localStorage.setItem("agency_tenant_slug", agencyForm.slug);
      toast({ title: "Agency created!", description: "Welcome to VisaShuttle." });
      setLocation("/app");
    } catch (e: any) {
      toast({ title: "Registration failed", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">VisaShuttle</span>
          </div>
          <p className="text-muted-foreground text-sm">Set up your agency in 3 simple steps</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-all ${
                step > s.id ? "bg-emerald-500 text-white" :
                step === s.id ? "bg-primary text-white" :
                "bg-muted text-muted-foreground"
              }`}>
                {step > s.id ? <Check className="w-4 h-4" /> : s.id}
              </div>
              <span className={`text-xs hidden sm:block ${step === s.id ? "font-medium" : "text-muted-foreground"}`}>{s.label}</span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-muted mx-2" />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{STEPS[step - 1].label}</CardTitle>
            <CardDescription>
              {step === 1 && "Tell us about your agency — this will be used for your customer portal."}
              {step === 2 && "Create the admin account you'll use to log in."}
              {step === 3 && "Review your details before launching your agency."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Agency Name *</Label>
                  <Input
                    value={agencyForm.agencyName}
                    onChange={e => handleAgencyNameChange(e.target.value)}
                    placeholder="Apex Travel Agency"
                    data-testid="input-agency-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Agency URL Slug *</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-2 border rounded-lg bg-muted text-sm text-muted-foreground whitespace-nowrap">
                      <Globe className="w-3.5 h-3.5" />
                      visashuttle.com/w/
                    </div>
                    <Input
                      value={agencyForm.slug}
                      onChange={e => setAgencyForm({ ...agencyForm, slug: slugFromName(e.target.value) })}
                      placeholder="apex-travel"
                      data-testid="input-slug"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your customers will access their portal at this URL. Lowercase letters, numbers and hyphens only.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Contact Phone</Label>
                  <Input
                    value={agencyForm.contactPhone}
                    onChange={e => setAgencyForm({ ...agencyForm, contactPhone: e.target.value })}
                    placeholder="+1 234 567 8900"
                    data-testid="input-phone"
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Your Name *</Label>
                  <Input
                    value={adminForm.name}
                    onChange={e => setAdminForm({ ...adminForm, name: e.target.value })}
                    placeholder="Jane Smith"
                    data-testid="input-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Address *</Label>
                  <Input
                    type="email"
                    value={adminForm.email}
                    onChange={e => setAdminForm({ ...adminForm, email: e.target.value })}
                    placeholder="jane@apextravel.com"
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password *</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={adminForm.password}
                      onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                      placeholder="At least 8 characters"
                      data-testid="input-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password *</Label>
                  <Input
                    type="password"
                    value={adminForm.confirmPassword}
                    onChange={e => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    data-testid="input-confirm-password"
                  />
                </div>
              </>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-xl border divide-y">
                  <div className="p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Agency</p>
                    <p className="font-semibold">{agencyForm.agencyName}</p>
                    <p className="text-sm text-muted-foreground">visashuttle.com/w/{agencyForm.slug}</p>
                    {agencyForm.contactPhone && <p className="text-sm text-muted-foreground">{agencyForm.contactPhone}</p>}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Admin Account</p>
                    <p className="font-semibold">{adminForm.name}</p>
                    <p className="text-sm text-muted-foreground">{adminForm.email}</p>
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Starting Plan</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Starter — Free</Badge>
                      <span className="text-sm text-muted-foreground">Up to 3 staff • 30 cases/month</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  By creating an account you agree to the{" "}
                  <Link href="/terms-and-conditions" className="underline">Terms of Service</Link>{" "}
                  and{" "}
                  <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              )}
              {step < 3 ? (
                <Button className="flex-1 gap-2" onClick={handleNext} data-testid="button-next">
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={isLoading} data-testid="button-launch">
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Launch My Agency
                </Button>
              )}
            </div>

            {step === 1 && (
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/sign-in" className="text-primary hover:underline font-medium">Sign in</Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
