import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Loader2, CheckCircle2, AlertCircle, ClipboardList, Building2,
  Mail, Phone, Globe, Calendar, FileText, ArrowRight, ShieldCheck, CreditCard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getDocumentChecklist } from "@/data/document-checklists";

// Public payload shape — server returns proposal + minimal tenant branding.
interface ProposalPublicData {
  proposal: {
    id: string;
    token: string;
    customerName: string;
    customerEmail: string | null;
    customerPhone: string | null;
    destinationCountry: string;
    visaType: string;
    notes: string | null;
    estimateAmountCents: number | null;
    currency: string;
    status: string;
    appliedCaseId: string | null;
    expiresAt: string | null;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };
}

export default function ProposalApplyPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState<{ referenceId: string; tenantSlug: string | null } | null>(null);

  const { data, isLoading, error } = useQuery<ProposalPublicData>({
    queryKey: ["/api/proposals", token],
    enabled: !!token,
    retry: false,
  });

  const proposal = data?.proposal;
  const tenant = data?.tenant;

  const checklist = useMemo(() => {
    if (!proposal) return [];
    return getDocumentChecklist(proposal.destinationCountry, proposal.visaType);
  }, [proposal?.destinationCountry, proposal?.visaType]);

  const [form, setForm] = useState({
    applicantName: "",
    applicantDob: "",
    email: "",
    phone: "",
    passportNumber: "",
    passportNationality: "",
    travelDate: "",
    notes: "",
  });

  // Pre-fill from the proposal once loaded.
  useEffect(() => {
    if (!proposal) return;
    setForm((f) => ({
      ...f,
      applicantName: f.applicantName || proposal.customerName,
      email: f.email || proposal.customerEmail || "",
      phone: f.phone || proposal.customerPhone || "",
    }));
  }, [proposal?.id]); // eslint-disable-line

  const applyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/proposals/${token}/apply`, form);
      return res.json() as Promise<{ success: boolean; referenceId: string; caseNumber: string; tenantSlug: string | null }>;
    },
    onSuccess: (r) => {
      setSubmitted({ referenceId: r.referenceId, tenantSlug: r.tenantSlug });
    },
    onError: (e: any) => {
      toast({ title: "Could not submit application", description: e?.message, variant: "destructive" });
    },
  });

  // Pay-estimate CTA on the success screen — fires `/initiate-payment` to
  // get a public invoice token, then redirects to the standard pay page.
  const initiatePaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/public/proposal/${token}/initiate-payment`, {});
      return res.json() as Promise<{ invoiceToken: string; url: string; amountCents: number; currency: string }>;
    },
    onSuccess: (r) => {
      window.location.href = `/pay/invoice/${r.invoiceToken}`;
    },
    onError: (e: any) => {
      toast({ title: "Could not open payment", description: e?.message, variant: "destructive" });
    },
  });

  // Format the proposal estimate for display on the success screen.
  // Uses Intl.NumberFormat with the agency's currency from the public payload.
  const formatEstimate = (cents: number, currency: string) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
      }).format(cents / 100);
    } catch {
      return `${(cents / 100).toFixed(2)} ${currency}`;
    }
  };

  const primary = tenant?.primaryColor || "#00B4D8";
  const accent = tenant?.accentColor || "#0096C7";

  // ── Loading / error states ──
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    const msg = (error as any)?.message ?? "This proposal link is invalid or has expired.";
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h1 className="text-xl font-bold mb-2">Link unavailable</h1>
            <p className="text-muted-foreground text-sm">{msg}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Success state ──
  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900"
        style={{ background: `linear-gradient(135deg, ${primary}10, ${accent}05)` }}
      >
        <Card className="max-w-lg w-full">
          <CardContent className="pt-8 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${primary}20` }}
            >
              <CheckCircle2 className="w-9 h-9" style={{ color: primary }} />
            </div>
            <h1 className="text-2xl font-bold mb-2">Application submitted!</h1>
            <p className="text-muted-foreground mb-6">
              {tenant!.name} has received your application. Save your reference ID — you'll need it to track your case and upload documents.
            </p>
            <div className="bg-muted/50 rounded-lg p-4 mb-6 inline-block">
              <div className="text-xs text-muted-foreground mb-1">Your reference ID</div>
              <div className="text-2xl font-mono font-bold tracking-wider" data-testid="text-reference-id">
                {submitted.referenceId}
              </div>
            </div>

            {/* Pay-estimate CTA — only when the agency set an estimate amount
                on the proposal. Routes to the public /pay/invoice/:token page. */}
            {proposal && proposal.estimateAmountCents && proposal.estimateAmountCents > 0 && (
              <div
                className="rounded-lg border p-4 mb-6 text-left"
                style={{ borderColor: `${primary}40`, backgroundColor: `${primary}08` }}
                data-testid="card-pay-estimate"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${primary}20`, color: primary }}
                  >
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">Pay your estimate</div>
                    <div className="text-sm text-muted-foreground">
                      {tenant!.name} has prepared an estimate of{" "}
                      <span className="font-semibold text-foreground" data-testid="text-estimate-amount">
                        {formatEstimate(proposal.estimateAmountCents, proposal.currency)}
                      </span>{" "}
                      for this application. You can pay now via bank transfer, UPI, or online.
                    </div>
                    <Button
                      className="mt-3"
                      style={{ backgroundColor: primary }}
                      onClick={() => initiatePaymentMutation.mutate()}
                      disabled={initiatePaymentMutation.isPending}
                      data-testid="button-pay-estimate"
                    >
                      {initiatePaymentMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      Pay {formatEstimate(proposal.estimateAmountCents, proposal.currency)}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {submitted.tenantSlug && (
              <div>
                <Button asChild style={{ backgroundColor: primary }} variant="outline" data-testid="button-go-portal">
                  <a href={`/w/${submitted.tenantSlug}/login`}>
                    Track your application <ArrowRight className="w-4 h-4 ml-1.5" />
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  You'll log in with your email or phone using a one-time code.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Already applied (refreshed link after submitting) ──
  if (proposal!.status === "applied") {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
            <h1 className="text-xl font-bold mb-2">You've already applied</h1>
            <p className="text-muted-foreground text-sm mb-4">
              This application link has already been used. Please log in to your portal to track your case.
            </p>
            <Button asChild>
              <a href={`/w/${tenant!.slug}/login`}>Go to portal</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main apply form ──
  const canSubmit = form.applicantName.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Branded header */}
      <header
        className="border-b bg-white dark:bg-slate-900"
        style={{ borderBottomColor: `${primary}25` }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          {tenant!.logoUrl ? (
            <img src={tenant!.logoUrl} alt={tenant!.name} className="w-10 h-10 rounded-md object-cover" />
          ) : (
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: primary }}
            >
              {tenant!.name.charAt(0)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate" data-testid="text-tenant-name">{tenant!.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-3">
              {tenant!.contactEmail && (
                <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{tenant!.contactEmail}</span>
              )}
              {tenant!.contactPhone && (
                <span className="hidden sm:flex items-center gap-1"><Phone className="w-3 h-3" />{tenant!.contactPhone}</span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Hero / proposal context */}
        <Card>
          <CardContent className="pt-6">
            <Badge variant="outline" className="mb-3" style={{ borderColor: `${primary}50`, color: primary }}>
              Personalised application
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2" data-testid="text-proposal-title">
              {proposal!.destinationCountry} {proposal!.visaType}
            </h1>
            <p className="text-muted-foreground">
              Hi <span className="font-medium text-foreground">{proposal!.customerName}</span> — {tenant!.name} has prepared this application for you. Fill in the form below and we'll handle the rest.
            </p>
            {proposal!.notes && (
              <div className="mt-4 p-3 rounded-md bg-muted/50 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Message from your agent</div>
                {proposal!.notes}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document checklist preview */}
        {checklist.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <ClipboardList className="w-5 h-5" style={{ color: primary }} />
                    What you'll need to provide
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    These are the documents required for your visa. You can upload them after applying.
                  </p>
                </div>
                <Badge variant="secondary">{checklist.length} items</Badge>
              </div>
              <ul className="grid sm:grid-cols-2 gap-2 mt-3">
                {checklist.map((d) => (
                  <li
                    key={d.type}
                    className="flex items-start gap-2 text-sm p-2 rounded-md hover:bg-muted/50"
                    data-testid={`item-checklist-${d.type}`}
                  >
                    <div
                      className="mt-0.5 w-4 h-4 rounded border flex-shrink-0"
                      style={{ borderColor: d.required ? primary : "#cbd5e1" }}
                    />
                    <div className="min-w-0">
                      <div className="font-medium">
                        {d.name}
                        {!d.required && <span className="text-muted-foreground font-normal text-xs ml-1">(optional)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground">{d.description}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Apply form */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-1">Your details</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Fields marked with <span className="text-red-500">*</span> are required. You can update everything else later from your portal.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label htmlFor="apply-name">Full name (as on passport) <span className="text-red-500">*</span></Label>
                <Input
                  id="apply-name"
                  value={form.applicantName}
                  onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                  data-testid="input-applicant-name"
                />
              </div>
              <div>
                <Label htmlFor="apply-dob">Date of birth</Label>
                <Input
                  id="apply-dob"
                  type="date"
                  value={form.applicantDob}
                  onChange={(e) => setForm({ ...form, applicantDob: e.target.value })}
                  data-testid="input-dob"
                />
              </div>
              <div>
                <Label htmlFor="apply-travel">Planned travel date</Label>
                <Input
                  id="apply-travel"
                  type="date"
                  value={form.travelDate}
                  onChange={(e) => setForm({ ...form, travelDate: e.target.value })}
                  data-testid="input-travel-date"
                />
              </div>
              <div>
                <Label htmlFor="apply-email">Email</Label>
                <Input
                  id="apply-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  data-testid="input-email"
                />
              </div>
              <div>
                <Label htmlFor="apply-phone">Phone</Label>
                <Input
                  id="apply-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                  data-testid="input-phone"
                />
              </div>
              <div>
                <Label htmlFor="apply-passport">Passport number</Label>
                <Input
                  id="apply-passport"
                  value={form.passportNumber}
                  onChange={(e) => setForm({ ...form, passportNumber: e.target.value.toUpperCase() })}
                  placeholder="optional — fill if known"
                  data-testid="input-passport-number"
                />
              </div>
              <div>
                <Label htmlFor="apply-nationality">Nationality</Label>
                <Input
                  id="apply-nationality"
                  value={form.passportNationality}
                  onChange={(e) => setForm({ ...form, passportNationality: e.target.value })}
                  placeholder="e.g. Indian"
                  data-testid="input-nationality"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="apply-notes">Anything we should know?</Label>
                <Textarea
                  id="apply-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  placeholder="Past visa rejections, urgent travel dates, special requirements…"
                  data-testid="input-applicant-notes"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Your data is sent securely to {tenant!.name} only.
              </div>
              <Button
                size="lg"
                onClick={() => applyMutation.mutate()}
                disabled={!canSubmit || applyMutation.isPending}
                style={{ backgroundColor: primary }}
                data-testid="button-submit-application"
              >
                {applyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                Submit application
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground pb-6">
          Powered by VisaShuttle
        </div>
      </div>
    </div>
  );
}
