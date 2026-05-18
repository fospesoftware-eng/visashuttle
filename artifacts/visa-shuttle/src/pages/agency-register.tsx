import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  MapPin,
  ReceiptText,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PhoneInput, defaultPhoneCodeFrom } from "@/components/phone-input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { COUNTRIES } from "@/shared/destinations";

const STEPS = [
  { id: 1, label: "Agency" },
  { id: 2, label: "Address" },
  { id: 3, label: "Plan" },
  { id: 4, label: "Admin" },
];

const ACTIVITIES = [
  "VISA Services",
  "Immigration Consultancy",
  "Counselling",
  "Tours & Travels",
  "Study Abroad",
  "Work Permit Services",
  "Document Assistance",
  "Ticketing",
];

const PLANS = [
  {
    key: "lite",
    name: "Lite",
    price: "₹1,999",
    summary: "Small agencies and startup consultants.",
    features: ["Up to 3 users", "100 applications / month", "Lead, proposal and application management", "Offline payment collection"],
  },
  {
    key: "go",
    name: "Go",
    price: "₹3,999",
    summary: "Growing agencies with higher volume.",
    features: ["Up to 5 users", "500 applications / month", "Agency visa landing page", "Online payments, SMS and UPI QR"],
    recommended: true,
  },
  {
    key: "power",
    name: "Power",
    price: "₹7,999",
    summary: "Professional immigration firms.",
    features: ["Up to 10 users", "Unlimited applications", "Agency website and custom domain", "WhatsApp and dedicated support"],
  },
];

function slugFromName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function recommendedPlan(activities: string[]) {
  if (activities.length >= 5 || activities.includes("Work Permit Services")) return "power";
  if (activities.length >= 3 || activities.includes("Immigration Consultancy") || activities.includes("Study Abroad")) return "go";
  return "lite";
}

export default function AgencyRegisterPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [planTouched, setPlanTouched] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const [agencyForm, setAgencyForm] = useState({
    agencyName: "",
    slug: "",
    email: "",
    mobile: "",
    activities: [] as string[],
    address: "",
    country: "India",
    pinCode: "",
    state: "",
    district: "",
    plan: "lite",
    paymentMode: "online",
  });

  const [adminForm, setAdminForm] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });

  const selectedPlan = useMemo(() => PLANS.find((p) => p.key === agencyForm.plan) || PLANS[0], [agencyForm.plan]);
  const phoneCode = defaultPhoneCodeFrom(agencyForm.country);
  const isIndia = agencyForm.country === "India";

  useEffect(() => {
    if (planTouched) return;
    setAgencyForm((prev) => ({ ...prev, plan: recommendedPlan(prev.activities) }));
  }, [agencyForm.activities, planTouched]);

  useEffect(() => {
    if (!isIndia || agencyForm.pinCode.replace(/\D/g, "").length !== 6) return;
    let cancelled = false;
    setPinLoading(true);
    fetch(`https://api.postalpincode.in/pincode/${agencyForm.pinCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const postOffice = data?.[0]?.PostOffice?.[0];
        if (postOffice) {
          setAgencyForm((prev) => ({
            ...prev,
            state: postOffice.State || prev.state,
            district: postOffice.District || prev.district,
          }));
        }
      })
      .catch(() => {
        if (!cancelled) toast({ title: "PIN lookup failed", description: "You can enter state and district manually.", variant: "destructive" });
      })
      .finally(() => !cancelled && setPinLoading(false));
    return () => { cancelled = true; };
  }, [agencyForm.pinCode, isIndia]); // eslint-disable-line react-hooks/exhaustive-deps

  function setAgency<K extends keyof typeof agencyForm>(key: K, value: typeof agencyForm[K]) {
    setAgencyForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleActivity(activity: string) {
    setAgencyForm((prev) => ({
      ...prev,
      activities: prev.activities.includes(activity)
        ? prev.activities.filter((a) => a !== activity)
        : [...prev.activities, activity],
    }));
  }

  function validateStep() {
    if (step === 1) {
      if (!agencyForm.agencyName.trim() || !agencyForm.email.trim() || !agencyForm.mobile.trim()) {
        toast({ title: "Agency name, email and mobile are required", variant: "destructive" });
        return false;
      }
      if (!agencyForm.slug.trim() || agencyForm.slug.length < 3) {
        toast({ title: "Agency URL must be at least 3 characters", variant: "destructive" });
        return false;
      }
      if (!agencyForm.activities.length) {
        toast({ title: "Select at least one agency activity", variant: "destructive" });
        return false;
      }
    }
    if (step === 2) {
      if (!agencyForm.address.trim() || !agencyForm.country.trim()) {
        toast({ title: "Agency address and country are required", variant: "destructive" });
        return false;
      }
      if (isIndia && !agencyForm.pinCode.trim()) {
        toast({ title: "PIN code is required for Indian agencies", variant: "destructive" });
        return false;
      }
    }
    if (step === 4) {
      if (!adminForm.name.trim() || !adminForm.password.trim()) {
        toast({ title: "Admin name and password are required", variant: "destructive" });
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
    }
    return true;
  }

  async function startPayment(tenantId: string) {
    const res = await apiRequest("POST", `/api/agency/${tenantId}/subscription/initiate-payment`, {});
    const data = await res.json();
    if (data?.provider === "stripe" && data.checkoutUrl) {
      window.open(data.checkoutUrl, "_blank");
      return;
    }
    if (data?.paymentSessionId) {
      const url = data.mode === "production" || data.mode === "live"
        ? `https://payments.cashfree.com/order/#${data.paymentSessionId}`
        : `https://payments-test.cashfree.com/order/#${data.paymentSessionId}`;
      window.open(url, "_blank");
      return;
    }
    throw new Error("Payment gateway session was not created");
  }

  async function handleSubmit() {
    if (!validateStep()) return;
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/agency-register", {
        agencyName: agencyForm.agencyName,
        slug: agencyForm.slug,
        contactEmail: agencyForm.email,
        contactPhone: agencyForm.mobile,
        email: agencyForm.email,
        password: adminForm.password,
        name: adminForm.name,
        activities: agencyForm.activities,
        address: agencyForm.address,
        country: agencyForm.country,
        pinCode: agencyForm.pinCode,
        state: agencyForm.state,
        district: agencyForm.district,
        plan: agencyForm.plan,
        paymentMode: agencyForm.paymentMode,
      });
      const data = await res.json();
      queryClient.setQueryData(["/api/auth/me"], {
        authenticated: true,
        user: data.user,
        tenant: data.tenant,
        tenantSlug: data.tenantSlug || data.tenant?.slug,
      });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      localStorage.setItem("agency_tenant_slug", data.tenantSlug || data.tenant?.slug || agencyForm.slug);

      if (agencyForm.paymentMode === "online") {
        try {
          await startPayment(data.tenant.id);
          toast({ title: "Agency created", description: "Complete payment in the gateway tab to activate your plan." });
          setLocation("/app/settings?tab=subscription");
        } catch (paymentError: any) {
          toast({ title: "Agency created", description: paymentError.message || "Open Subscription settings to retry payment.", variant: "destructive" });
          setLocation("/app/settings?tab=subscription");
        }
      } else {
        toast({ title: "Agency created", description: "Offline payment selected. SaaS admin will activate the plan after verification." });
        setLocation("/app/settings?tab=subscription");
      }
    } catch (e: any) {
      toast({ title: "Registration failed", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  const handleNext = () => {
    if (!validateStep()) return;
    setStep((s) => Math.min(4, s + 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4055FF]/8 via-background to-[#FF2060]/8 p-4">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center">
        <div className="grid w-full gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div className="hidden lg:block">
            <Badge className="mb-4 border-0 bg-[#4055FF] text-white">Agency CRM</Badge>
            <h1 className="text-4xl font-black tracking-tight">Launch your visa agency workspace in minutes.</h1>
            <p className="mt-4 max-w-md text-muted-foreground">
              Capture agency details, select the right CRM plan, complete payment, and start managing leads, proposals and applications.
            </p>
            <div className="mt-8 grid gap-3">
              {["Automatic agency creation", "Lite / Go / Power plan selection", "Cashfree online payment or offline admin activation"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-xl border bg-background/70 p-3">
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <Card className="border-0 shadow-2xl shadow-[#4055FF]/10">
            <CardHeader>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4055FF] text-white">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle>Agency Signup</CardTitle>
                  <CardDescription>Create and activate your agency CRM.</CardDescription>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {STEPS.map((s) => (
                  <div key={s.id} className="min-w-0">
                    <div className={`mb-1 h-1.5 rounded-full ${step >= s.id ? "bg-[#4055FF]" : "bg-muted"}`} />
                    <p className={`truncate text-xs ${step === s.id ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                  </div>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {step === 1 && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Agency Name *</Label>
                      <Input
                        value={agencyForm.agencyName}
                        onChange={(e) => {
                          const name = e.target.value;
                          setAgencyForm((prev) => ({ ...prev, agencyName: name, slug: prev.slug || slugFromName(name) }));
                        }}
                        placeholder="Apex Visa Services"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input type="email" value={agencyForm.email} onChange={(e) => setAgency("email", e.target.value)} placeholder="owner@agency.com" />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
                    <div className="space-y-2">
                      <Label>Mobile *</Label>
                      <PhoneInput value={agencyForm.mobile} onChange={(v) => setAgency("mobile", v)} defaultCountryCode={phoneCode} />
                    </div>
                    <div className="space-y-2">
                      <Label>Agency URL *</Label>
                      <div className="flex items-center gap-2">
                        <div className="hidden items-center gap-1.5 rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground sm:flex">
                          <Globe className="h-3.5 w-3.5" /> /w/
                        </div>
                        <Input value={agencyForm.slug} onChange={(e) => setAgency("slug", slugFromName(e.target.value))} placeholder="apex-visa" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label>Agency Activities *</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {ACTIVITIES.map((activity) => (
                        <label key={activity} className="flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm hover:border-[#4055FF]/40">
                          <Checkbox checked={agencyForm.activities.includes(activity)} onCheckedChange={() => toggleActivity(activity)} />
                          {activity}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Agency Address *</Label>
                    <Textarea value={agencyForm.address} onChange={(e) => setAgency("address", e.target.value)} rows={3} placeholder="Office / building / street address" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Country *</Label>
                      <Select value={agencyForm.country} onValueChange={(v) => setAgencyForm((prev) => ({ ...prev, country: v, pinCode: "", state: "", district: "" }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          {COUNTRIES.map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {isIndia && (
                      <div className="space-y-2">
                        <Label>PIN Code *</Label>
                        <div className="relative">
                          <Input value={agencyForm.pinCode} maxLength={6} onChange={(e) => setAgency("pinCode", e.target.value.replace(/\D/g, ""))} placeholder="560103" />
                          {pinLoading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                        </div>
                      </div>
                    )}
                  </div>
                  {isIndia && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input value={agencyForm.state} onChange={(e) => setAgency("state", e.target.value)} placeholder="Auto-filled from PIN" />
                      </div>
                      <div className="space-y-2">
                        <Label>District</Label>
                        <Input value={agencyForm.district} onChange={(e) => setAgency("district", e.target.value)} placeholder="Auto-filled from PIN" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2 rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
                    <MapPin className="mt-0.5 h-4 w-4 text-[#4055FF]" />
                    Indian PIN codes auto-fill state and district when the lookup service is reachable. You can still edit them manually.
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <div className="rounded-xl border bg-[#4055FF]/5 p-3 text-sm text-muted-foreground">
                    Suggested plan: <span className="font-semibold text-foreground">{PLANS.find((p) => p.key === recommendedPlan(agencyForm.activities))?.name}</span>. You can choose any plan.
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3">
                    {PLANS.map((plan) => {
                      const active = agencyForm.plan === plan.key;
                      return (
                        <button
                          key={plan.key}
                          type="button"
                          onClick={() => { setPlanTouched(true); setAgency("plan", plan.key); }}
                          className={`rounded-2xl border p-4 text-left transition hover:border-[#4055FF]/50 ${active ? "border-[#4055FF] bg-[#4055FF]/5 ring-4 ring-[#4055FF]/10" : "bg-background"}`}
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <h3 className="text-lg font-black">{plan.name}</h3>
                            {plan.recommended && <Badge className="border-0 bg-[#4055FF] text-white">Popular</Badge>}
                          </div>
                          <p className="text-2xl font-black">{plan.price}<span className="text-xs font-medium text-muted-foreground"> / month</span></p>
                          <p className="mt-2 min-h-[40px] text-xs leading-5 text-muted-foreground">{plan.summary}</p>
                          <div className="mt-3 space-y-1.5">
                            {plan.features.map((feature) => (
                              <div key={feature} className="flex gap-2 text-xs text-muted-foreground">
                                <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" />
                                {feature}
                              </div>
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setAgency("paymentMode", "online")}
                      className={`rounded-xl border p-4 text-left transition ${agencyForm.paymentMode === "online" ? "border-[#4055FF] bg-[#4055FF]/5" : "bg-background"}`}
                    >
                      <CreditCard className="mb-2 h-5 w-5 text-[#4055FF]" />
                      <p className="font-semibold">Pay online</p>
                      <p className="text-xs text-muted-foreground">Go to Cashfree payment gateway after signup.</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAgency("paymentMode", "offline")}
                      className={`rounded-xl border p-4 text-left transition ${agencyForm.paymentMode === "offline" ? "border-[#4055FF] bg-[#4055FF]/5" : "bg-background"}`}
                    >
                      <WalletCards className="mb-2 h-5 w-5 text-[#FF2060]" />
                      <p className="font-semibold">Offline payment</p>
                      <p className="text-xs text-muted-foreground">Admin activates the plan after payment verification.</p>
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-4">
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Agency Summary</p>
                    <p className="mt-2 font-bold">{agencyForm.agencyName}</p>
                    <p className="text-sm text-muted-foreground">{agencyForm.email} · {agencyForm.mobile}</p>
                    <p className="text-sm text-muted-foreground">{agencyForm.country}{agencyForm.state ? `, ${agencyForm.state}` : ""}{agencyForm.district ? `, ${agencyForm.district}` : ""}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="secondary">{selectedPlan.name} {selectedPlan.price}/mo</Badge>
                      <Badge variant="outline">{agencyForm.paymentMode === "online" ? "Online payment" : "Offline activation"}</Badge>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Admin Name *</Label>
                      <Input value={adminForm.name} onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })} placeholder="Owner / admin name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Login Email</Label>
                      <Input value={agencyForm.email} disabled />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <div className="relative">
                        <Input type={showPassword ? "text" : "password"} value={adminForm.password} onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })} placeholder="At least 8 characters" />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                          {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Confirm Password *</Label>
                      <Input type="password" value={adminForm.confirmPassword} onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })} placeholder="Re-enter password" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    By creating an account you agree to the <Link href="/terms-and-conditions" className="underline">Terms</Link> and <Link href="/privacy-policy" className="underline">Privacy Policy</Link>.
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                {step > 1 && (
                  <Button variant="outline" onClick={() => setStep((s) => s - 1)} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                )}
                {step < 4 ? (
                  <Button className="flex-1 gap-2 border-0 text-white" style={{ background: "linear-gradient(135deg,#4055FF,#9033F5,#FF2060)" }} onClick={handleNext}>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button className="flex-1 gap-2 border-0 text-white" style={{ background: "linear-gradient(135deg,#4055FF,#9033F5,#FF2060)" }} onClick={handleSubmit} disabled={isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : agencyForm.paymentMode === "online" ? <ReceiptText className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                    {agencyForm.paymentMode === "online" ? "Create Agency & Pay" : "Create Agency"}
                  </Button>
                )}
              </div>

              <p className="text-center text-sm text-muted-foreground">
                Already have an agency account? <Link href="/login" className="font-medium text-[#4055FF] hover:underline">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
