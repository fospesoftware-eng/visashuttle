import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Loader2, CheckCircle2, AlertCircle, ClipboardList, Building2,
  Mail, Phone, FileText, ArrowRight, ShieldCheck, CreditCard,
  Upload, ScanLine, X, Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { getDocumentChecklist, type DocumentRequirement } from "@/data/document-checklists";

type ProposalDocumentUpload = {
  key: string;
  name: string;
  type: string;
  fileName: string;
  fileUrl: string;
  notes?: string | null;
  extractedData?: unknown;
};

type ScanResult = {
  surname: string | null;
  givenName: string | null;
  middleName: string | null;
  passportNumber: string | null;
  nationality: string | null;
  gender: "M" | "F" | "X" | null;
  dateOfBirth: string | null;
  dateOfIssue: string | null;
  dateOfExpiry: string | null;
  placeOfIssue: string | null;
  placeOfBirth: string | null;
  warnings?: string[];
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function todayIso() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function isExpiredDate(value: string) {
  if (!value) return false;
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

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
  payment?: {
    amountCents: number | null;
    currency: string;
    gatewayConfigured: boolean;
    bankDetails: string | null;
    upiId: string | null;
    upiQrFileUrl: string | null;
    paymentInstructions: string | null;
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
  checklist?: DocumentRequirement[];
  checklistSource?: "agency" | "database" | "default";
}

export default function ProposalApplyPage() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState<{ referenceId: string; tenantSlug: string | null } | null>(null);
  const [step, setStep] = useState(1);
  const [documents, setDocuments] = useState<ProposalDocumentUpload[]>([]);
  const [passportFileName, setPassportFileName] = useState("");
  const [passportScanError, setPassportScanError] = useState<string | null>(null);
  const [paymentChoice, setPaymentChoice] = useState<"online" | "offline" | "later">("later");
  const [offlinePaymentReference, setOfflinePaymentReference] = useState("");
  const [onlinePaymentOpened, setOnlinePaymentOpened] = useState(false);

  const { data, isLoading, error } = useQuery<ProposalPublicData>({
    queryKey: ["/api/proposals", token],
    enabled: !!token,
    retry: false,
  });

  const proposal = data?.proposal;
  const payment = data?.payment;
  const tenant = data?.tenant;

  const checklist = useMemo(() => {
    if (!proposal) return [];
    return data?.checklist?.length ? data.checklist : getDocumentChecklist(proposal.destinationCountry, proposal.visaType);
  }, [data?.checklist, proposal?.destinationCountry, proposal?.visaType]);

  const [form, setForm] = useState({
    applicantName: "",
    applicantDob: "",
    email: "",
    phone: "",
    passportNumber: "",
    passportNationality: "",
    passportSurname: "",
    passportGivenName: "",
    passportMiddleName: "",
    passportGender: "" as "" | "M" | "F" | "X",
    passportDateOfIssue: "",
    passportDateOfExpiry: "",
    passportPlaceOfIssue: "",
    passportPlaceOfBirth: "",
    passportFileUrl: "",
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
      const submissionDocuments = documents.map((doc) => (
        doc.type === "payment_proof"
          ? {
              ...doc,
              notes: [
                paymentChoice === "offline" ? "Offline payment proof uploaded by customer" : "Payment proof uploaded by customer",
                offlinePaymentReference ? `Reference: ${offlinePaymentReference}` : "",
              ].filter(Boolean).join(". "),
            }
          : doc
      ));
      const res = await apiRequest("POST", `/api/proposals/${token}/apply`, {
        ...form,
        paymentChoice,
        offlinePaymentReference,
        documents: submissionDocuments,
      });
      return res.json() as Promise<{ success: boolean; referenceId: string; caseNumber: string; tenantSlug: string | null }>;
    },
    onSuccess: (r) => {
      setSubmitted({ referenceId: r.referenceId, tenantSlug: r.tenantSlug });
    },
    onError: (e: any) => {
      toast({ title: "Could not submit application", description: e?.message, variant: "destructive" });
    },
  });

  const scanPassportMutation = useMutation({
    mutationFn: async ({ dataUrl, mimeType }: { dataUrl: string; mimeType: string }) => {
      const res = await apiRequest("POST", `/api/proposals/${token}/passport/scan`, { imageBase64: dataUrl, mimeType });
      return res.json() as Promise<ScanResult>;
    },
    onSuccess: (result) => {
      setForm((f) => ({
        ...f,
        applicantName: f.applicantName || [result.givenName, result.surname].filter(Boolean).join(" "),
        applicantDob: f.applicantDob || result.dateOfBirth || "",
        passportSurname: result.surname || f.passportSurname,
        passportGivenName: result.givenName || f.passportGivenName,
        passportMiddleName: result.middleName || f.passportMiddleName,
        passportNumber: result.passportNumber || f.passportNumber,
        passportNationality: result.nationality || f.passportNationality,
        passportGender: result.gender || f.passportGender,
        passportDateOfIssue: result.dateOfIssue || f.passportDateOfIssue,
        passportDateOfExpiry: result.dateOfExpiry || f.passportDateOfExpiry,
        passportPlaceOfIssue: result.placeOfIssue || f.passportPlaceOfIssue,
        passportPlaceOfBirth: result.placeOfBirth || f.passportPlaceOfBirth,
      }));
      setPassportScanError(result.dateOfExpiry && isExpiredDate(result.dateOfExpiry)
        ? "This passport is expired. Please upload a valid current passport."
        : null);
      setDocuments((items) => items.map((item) => (
        item.type === "passport" ? { ...item, extractedData: result } : item
      )));
    },
    onError: (e: any) => {
      setPassportScanError(e?.message ?? "Passport scan failed. Please enter details manually.");
    },
  });

  const addDocument = async (file: File, type: string, name: string, extractedData?: unknown, notes?: string | null) => {
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload files under 8 MB.", variant: "destructive" });
      return;
    }
    const fileUrl = await fileToDataUrl(file);
    setDocuments((items) => [
      ...items.filter((item) => !(type === "passport" && item.type === "passport")),
      { key: Math.random().toString(36).slice(2), name, type, fileName: file.name, fileUrl, extractedData, notes },
    ]);
    if (type === "passport") {
      setForm((f) => ({ ...f, passportFileUrl: fileUrl }));
      setPassportFileName(file.name);
    }
  };

  const handlePassportFile = async (file: File | undefined) => {
    if (!file) return;
    setPassportScanError(null);
    const fileUrl = await fileToDataUrl(file);
    setDocuments((items) => [
      ...items.filter((item) => item.type !== "passport"),
      {
        key: Math.random().toString(36).slice(2),
        name: "Current passport bio page",
        type: "passport",
        fileName: file.name,
        fileUrl,
        extractedData: null,
        notes: null,
      },
    ]);
    setForm((f) => ({ ...f, passportFileUrl: fileUrl }));
    setPassportFileName(file.name);
    scanPassportMutation.mutate({ dataUrl: fileUrl, mimeType: file.type || "image/jpeg" });
  };

  // Pay-estimate CTA on the success screen — fires `/initiate-payment` to
  // get a public invoice token, then redirects to the standard pay page.
  const initiatePaymentMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/public/proposal/${token}/initiate-payment`, {});
      return res.json() as Promise<{ invoiceToken: string; url: string; amountCents: number; currency: string }>;
    },
    onSuccess: (r) => {
      setOnlinePaymentOpened(true);
      const opened = window.open(r.url || `/pay/invoice/${r.invoiceToken}`, "_blank", "noopener,noreferrer");
      if (!opened) window.location.href = r.url || `/pay/invoice/${r.invoiceToken}`;
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
  const passportExpired = isExpiredDate(form.passportDateOfExpiry);
  const uploadedTypes = new Set(documents.map((doc) => doc.type));
  const missingRequired = checklist.filter((doc) => doc.required && !uploadedTypes.has(doc.type));
  const canSubmit = form.applicantName.trim().length > 0 && !passportExpired && !applyMutation.isPending;
  const steps = [
    { id: 1, label: "Customer" },
    { id: 2, label: "Passport" },
    { id: 3, label: "Documents" },
    { id: 4, label: "Payment" },
    { id: 5, label: "Submit" },
  ];
  const goNext = () => setStep((s) => Math.min(5, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));
  const removeDocument = (key: string) => {
    setDocuments((items) => items.filter((item) => item.key !== key));
  };
  const uploadForType = (type: string) => documents.filter((doc) => doc.type === type);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* Branded header */}
      <header
        className="border-b bg-white dark:bg-slate-900"
        style={{ borderBottomColor: `${primary}25` }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

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
              Hi <span className="font-medium text-foreground">{proposal!.customerName}</span> — {tenant!.name} has prepared this application for you. Complete the steps below and upload your documents securely.
            </p>
            {proposal!.notes && (
              <div className="mt-4 p-3 rounded-md bg-muted/50 text-sm">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Message from your agent</div>
                {proposal!.notes}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {steps.map((item) => {
                const active = step === item.id;
                const done = step > item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStep(item.id)}
                    className="flex items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                    style={{ borderColor: active || done ? `${primary}80` : undefined }}
                    data-testid={`button-proposal-step-${item.id}`}
                  >
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                      style={{
                        backgroundColor: active || done ? primary : "hsl(var(--muted))",
                        color: active || done ? "white" : "hsl(var(--muted-foreground))",
                      }}
                    >
                      {done ? <Check className="h-4 w-4" /> : item.id}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">Step {item.id} of 5</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {step === 1 && (
              <div>
                <h2 className="text-lg font-semibold mb-1">Customer and proposal details</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  These details are pre-filled from your agency proposal. You can correct customer contact details before submitting.
                </p>

                <div className="mb-5 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Destination country</div>
                    <div className="mt-1 text-lg font-semibold">{proposal!.destinationCountry}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Visa type</div>
                    <div className="mt-1 text-lg font-semibold">{proposal!.visaType}</div>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Proposal amount</div>
                    <div className="mt-1 text-lg font-semibold">
                      {proposal!.estimateAmountCents && proposal!.estimateAmountCents > 0
                        ? formatEstimate(proposal!.estimateAmountCents, proposal!.currency)
                        : "No fee added"}
                    </div>
                  </div>
                </div>

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
                  <div className="sm:col-span-2">
                    <Label htmlFor="apply-notes">Anything we should know?</Label>
                    <Textarea
                      id="apply-notes"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      rows={3}
                      placeholder="Past visa rejections, urgent travel dates, special requirements..."
                      data-testid="input-applicant-notes"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-lg font-semibold mb-1">Passport scan</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload a clear image of the current passport bio page. Expired passports cannot be submitted as the active passport.
                </p>

                <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-5">
                  <div className="space-y-4">
                    <label
                      htmlFor="passport-upload"
                      className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 p-6 text-center transition-colors hover:bg-muted/40"
                      style={{ borderColor: `${primary}70` }}
                    >
                      <input
                        id="passport-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => handlePassportFile(e.target.files?.[0])}
                        data-testid="input-passport-file"
                      />
                      {scanPassportMutation.isPending ? (
                        <Loader2 className="mb-3 h-9 w-9 animate-spin" style={{ color: primary }} />
                      ) : (
                        <ScanLine className="mb-3 h-9 w-9" style={{ color: primary }} />
                      )}
                      <span className="text-sm font-semibold">
                        {passportFileName || "Upload and scan passport"}
                      </span>
                      <span className="mt-1 text-xs text-muted-foreground">JPG, PNG, or HEIC under 8 MB</span>
                    </label>

                    {passportScanError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                        {passportScanError}
                      </div>
                    )}

                    {passportExpired && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                        This passport is expired. Please upload a valid current passport before submitting.
                      </div>
                    )}

                    <div className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <div className="font-medium">Old passports</div>
                        <Badge variant="secondary">{uploadForType("old_passport").length} uploaded</Badge>
                      </div>
                      <p className="mb-3 text-sm text-muted-foreground">
                        Add old passports if they support your travel history.
                      </p>
                      <Input
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []);
                          for (const file of files) {
                            await addDocument(file, "old_passport", "Old passport", null, "Uploaded by customer");
                          }
                          e.currentTarget.value = "";
                        }}
                        data-testid="input-old-passports"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="passport-given">Given name</Label>
                      <Input
                        id="passport-given"
                        value={form.passportGivenName}
                        onChange={(e) => setForm({ ...form, passportGivenName: e.target.value })}
                        data-testid="input-passport-given"
                      />
                    </div>
                    <div>
                      <Label htmlFor="passport-surname">Surname</Label>
                      <Input
                        id="passport-surname"
                        value={form.passportSurname}
                        onChange={(e) => setForm({ ...form, passportSurname: e.target.value })}
                        data-testid="input-passport-surname"
                      />
                    </div>
                    <div>
                      <Label htmlFor="passport-middle">Middle name</Label>
                      <Input
                        id="passport-middle"
                        value={form.passportMiddleName}
                        onChange={(e) => setForm({ ...form, passportMiddleName: e.target.value })}
                        data-testid="input-passport-middle"
                      />
                    </div>
                    <div>
                      <Label htmlFor="apply-passport">Passport number</Label>
                      <Input
                        id="apply-passport"
                        value={form.passportNumber}
                        onChange={(e) => setForm({ ...form, passportNumber: e.target.value.toUpperCase() })}
                        data-testid="input-passport-number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="apply-nationality">Nationality</Label>
                      <Input
                        id="apply-nationality"
                        value={form.passportNationality}
                        onChange={(e) => setForm({ ...form, passportNationality: e.target.value })}
                        data-testid="input-nationality"
                      />
                    </div>
                    <div>
                      <Label htmlFor="passport-gender">Gender</Label>
                      <select
                        id="passport-gender"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={form.passportGender}
                        onChange={(e) => setForm({ ...form, passportGender: e.target.value as "" | "M" | "F" | "X" })}
                        data-testid="select-passport-gender"
                      >
                        <option value="">Select</option>
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="X">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="passport-issue">Date of issue</Label>
                      <Input
                        id="passport-issue"
                        type="date"
                        value={form.passportDateOfIssue}
                        onChange={(e) => setForm({ ...form, passportDateOfIssue: e.target.value })}
                        data-testid="input-passport-issue"
                      />
                    </div>
                    <div>
                      <Label htmlFor="passport-expiry">Date of expiry</Label>
                      <Input
                        id="passport-expiry"
                        type="date"
                        min={todayIso()}
                        value={form.passportDateOfExpiry}
                        onChange={(e) => setForm({ ...form, passportDateOfExpiry: e.target.value })}
                        data-testid="input-passport-expiry"
                      />
                    </div>
                    <div>
                      <Label htmlFor="passport-issue-place">Place of issue</Label>
                      <Input
                        id="passport-issue-place"
                        value={form.passportPlaceOfIssue}
                        onChange={(e) => setForm({ ...form, passportPlaceOfIssue: e.target.value })}
                        data-testid="input-passport-place-issue"
                      />
                    </div>
                    <div>
                      <Label htmlFor="passport-birth-place">Place of birth</Label>
                      <Input
                        id="passport-birth-place"
                        value={form.passportPlaceOfBirth}
                        onChange={(e) => setForm({ ...form, passportPlaceOfBirth: e.target.value })}
                        data-testid="input-passport-place-birth"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <ClipboardList className="w-5 h-5" style={{ color: primary }} />
                      Document checklist
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Upload documents requested by your agency for this visa type.
                    </p>
                  </div>
                  <Badge variant="secondary">{documents.length} uploaded</Badge>
                </div>

                <div className="grid gap-3">
                  {checklist.length === 0 ? (
                    <div className="rounded-lg border p-5 text-sm text-muted-foreground">
                      No checklist is attached to this proposal yet. You can still submit the application.
                    </div>
                  ) : checklist.map((item) => {
                    const uploaded = uploadForType(item.type);
                    return (
                      <div
                        key={item.type}
                        className="rounded-lg border bg-background p-4"
                        data-testid={`card-upload-${item.type}`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold">{item.name}</h3>
                              {item.required ? (
                                <Badge variant="outline">Required</Badge>
                              ) : (
                                <Badge variant="secondary">Optional</Badge>
                              )}
                              {uploaded.length > 0 && (
                                <Badge className="bg-emerald-600 hover:bg-emerald-600">
                                  <Check className="mr-1 h-3 w-3" /> Uploaded
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                          </div>
                          <label className="inline-flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted/60">
                            <Upload className="mr-2 h-4 w-4" />
                            Upload
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="sr-only"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) await addDocument(file, item.type, item.name, null, "Checklist upload");
                                e.currentTarget.value = "";
                              }}
                              data-testid={`input-upload-${item.type}`}
                            />
                          </label>
                        </div>
                        {uploaded.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {uploaded.map((doc) => (
                              <div key={doc.key} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
                                <span className="truncate">{doc.fileName}</span>
                                <button
                                  type="button"
                                  className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                                  onClick={() => removeDocument(doc.key)}
                                  aria-label={`Remove ${doc.fileName}`}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-lg font-semibold mb-1">Payment</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Review the proposal fee and choose online or offline payment. You can still submit after uploading offline proof.
                </p>

                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                  <div
                    className="rounded-lg border p-4"
                    style={{ borderColor: `${primary}40`, backgroundColor: `${primary}08` }}
                  >
                    <div className="mb-2 text-sm text-muted-foreground">Proposal fee</div>
                    <div className="text-3xl font-bold">
                      {payment?.amountCents && payment.amountCents > 0
                        ? formatEstimate(payment.amountCents, payment.currency)
                        : "No payment due"}
                    </div>
                    <div className="mt-3 rounded-md bg-background/70 p-3 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-muted-foreground">Destination</span>
                        <span className="font-medium">{proposal!.destinationCountry}</span>
                      </div>
                      <div className="mt-2 flex justify-between gap-3">
                        <span className="text-muted-foreground">Visa type</span>
                        <span className="font-medium">{proposal!.visaType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setPaymentChoice("online")}
                      className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
                      style={{ borderColor: paymentChoice === "online" ? primary : undefined }}
                      data-testid="button-payment-choice-online"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">Online payment</div>
                          <div className="text-sm text-muted-foreground">Pay through the secure payment gateway.</div>
                        </div>
                        <CreditCard className="h-5 w-5" style={{ color: primary }} />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentChoice("offline")}
                      className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
                      style={{ borderColor: paymentChoice === "offline" ? primary : undefined }}
                      data-testid="button-payment-choice-offline"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">Offline payment</div>
                          <div className="text-sm text-muted-foreground">Use bank transfer or UPI, then upload payment proof.</div>
                        </div>
                        <Upload className="h-5 w-5" style={{ color: primary }} />
                      </div>
                    </button>
                  </div>
                </div>

                {paymentChoice === "online" && (
                  <div className="mt-4 rounded-lg border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-semibold">Pay online</div>
                        <p className="text-sm text-muted-foreground">
                          This opens the secure payment page in a new tab. Return here and complete final submit after payment.
                        </p>
                        {onlinePaymentOpened && (
                          <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                            Payment page opened. Continue to final submit when ready.
                          </p>
                        )}
                      </div>
                      <Button
                        onClick={() => initiatePaymentMutation.mutate()}
                        disabled={!payment?.amountCents || payment.amountCents <= 0 || initiatePaymentMutation.isPending}
                        style={{ backgroundColor: primary }}
                        data-testid="button-pay-online-proposal"
                      >
                        {initiatePaymentMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="mr-2 h-4 w-4" />
                        )}
                        Pay online
                      </Button>
                    </div>
                    {!payment?.gatewayConfigured && (
                      <div className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                        Online gateway may not be fully configured by the agency. Use offline payment if this fails.
                      </div>
                    )}
                  </div>
                )}

                {paymentChoice === "offline" && (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <div className="font-semibold">Agency payment details</div>
                      {payment?.paymentInstructions && (
                        <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">{payment.paymentInstructions}</p>
                      )}
                      {payment?.bankDetails && (
                        <div className="mt-3">
                          <div className="text-sm font-medium">Bank details</div>
                          <pre className="mt-1 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm font-sans">{payment.bankDetails}</pre>
                        </div>
                      )}
                      {(payment?.upiId || payment?.upiQrFileUrl) && (
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {payment.upiId && (
                            <div>
                              <div className="text-sm font-medium">UPI ID</div>
                              <div className="mt-1 rounded-md bg-muted/40 p-3 font-mono text-sm">{payment.upiId}</div>
                            </div>
                          )}
                          {payment.upiQrFileUrl && (
                            <div>
                              <div className="text-sm font-medium">UPI QR</div>
                              <img
                                src={payment.upiQrFileUrl}
                                alt="UPI QR"
                                className="mt-1 h-36 w-36 rounded-md border bg-white object-contain p-2"
                                data-testid="img-proposal-upi-qr"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      {!payment?.paymentInstructions && !payment?.bankDetails && !payment?.upiId && !payment?.upiQrFileUrl && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Offline payment details are not configured yet. Contact the agency before transferring.
                        </p>
                      )}
                    </div>

                    <div className="rounded-lg border p-4">
                      <div className="font-semibold">Upload payment proof</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Add transaction ID, UPI reference, receipt, or screenshot.
                      </p>
                      <div className="mt-3 space-y-3">
                        <div>
                          <Label htmlFor="offline-payment-reference">Payment reference</Label>
                          <Input
                            id="offline-payment-reference"
                            value={offlinePaymentReference}
                            onChange={(e) => setOfflinePaymentReference(e.target.value)}
                            placeholder="Transaction ID / UPI reference"
                            data-testid="input-offline-payment-reference"
                          />
                        </div>
                        <Input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) await addDocument(file, "payment_proof", "Offline payment proof", null, "Offline payment proof uploaded by customer");
                            e.currentTarget.value = "";
                          }}
                          data-testid="input-offline-payment-proof"
                        />
                        {uploadForType("payment_proof").map((doc) => (
                          <div key={doc.key} className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2 text-sm">
                            <span className="truncate">{doc.fileName}</span>
                            <button
                              type="button"
                              className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground"
                              onClick={() => removeDocument(doc.key)}
                              aria-label={`Remove ${doc.fileName}`}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 5 && (
              <div>
                <h2 className="text-lg font-semibold mb-1">Review and submit</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Check the details once. After submission, your agency receives the application and uploads.
                </p>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center gap-2 font-semibold">
                      <Building2 className="h-4 w-4" style={{ color: primary }} />
                      Application
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Applicant</dt>
                        <dd className="text-right font-medium">{form.applicantName || "Not entered"}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Destination</dt>
                        <dd className="text-right font-medium">{proposal!.destinationCountry}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Visa type</dt>
                        <dd className="text-right font-medium">{proposal!.visaType}</dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-muted-foreground">Passport</dt>
                        <dd className="text-right font-medium">{form.passportNumber || "Not entered"}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="mb-3 flex items-center gap-2 font-semibold">
                      <FileText className="h-4 w-4" style={{ color: primary }} />
                      Upload summary
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current passport</span>
                        <span className={uploadedTypes.has("passport") ? "font-medium text-emerald-600" : "font-medium"}>
                          {uploadedTypes.has("passport") ? "Uploaded" : "Not uploaded"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Old passports</span>
                        <span className="font-medium">{uploadForType("old_passport").length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Checklist documents</span>
                        <span className="font-medium">{documents.filter((doc) => !["passport", "old_passport", "payment_proof"].includes(doc.type)).length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment proof</span>
                        <span className="font-medium">{uploadForType("payment_proof").length}</span>
                      </div>
                    </div>
                    {missingRequired.length > 0 && (
                      <div className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                        Missing required uploads: {missingRequired.map((doc) => doc.name).join(", ")}.
                      </div>
                    )}
                  </div>
                </div>

                {payment?.amountCents && payment.amountCents > 0 && (
                  <div
                    className="mt-4 rounded-lg border p-4"
                    style={{ borderColor: `${primary}40`, backgroundColor: `${primary}08` }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: `${primary}20`, color: primary }}
                      >
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold">Customer fee payment</div>
                        <p className="text-sm text-muted-foreground">
                          Estimate amount:{" "}
                          <span className="font-semibold text-foreground">
                            {formatEstimate(payment.amountCents, payment.currency)}
                          </span>
                          . Payment choice: {paymentChoice === "offline" ? "Offline" : paymentChoice === "online" ? "Online" : "Pay later"}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
              <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                <ShieldCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                Your data is sent securely to {tenant!.name} only.
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                {step > 1 && (
                  <Button variant="outline" onClick={goBack} data-testid="button-step-back">
                    Back
                  </Button>
                )}
                {step < 5 ? (
                  <Button
                    onClick={goNext}
                    style={{ backgroundColor: primary }}
                    data-testid="button-step-next"
                  >
                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => applyMutation.mutate()}
                    disabled={!canSubmit}
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
                )}
              </div>
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
