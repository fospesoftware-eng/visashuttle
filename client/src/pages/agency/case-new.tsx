import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, Check, Loader2, Plus, Save, Send, Trash2, Users,
  MapPin, FileText, User as UserIcon, Plane, ClipboardCheck, ListChecks,
  Search, X, CircleDot, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CO_TRAVELLER_RELATIONSHIPS, type CoTravellerRelationship, type FeeTemplate, type InvoiceSettings } from "@shared/schema";
import { getDocumentChecklist, type DocumentRequirement } from "@/data/document-checklists";

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda",
  "Argentina","Armenia","Australia","Austria","Azerbaijan",
  "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize",
  "Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil",
  "Brunei","Bulgaria","Burkina Faso","Burundi",
  "Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad",
  "Chile","China","Colombia","Comoros","Congo","Costa Rica","Croatia","Cuba",
  "Cyprus","Czech Republic",
  "Democratic Republic of Congo","Denmark","Djibouti","Dominica",
  "Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia",
  "Eswatini","Ethiopia",
  "Fiji","Finland","France",
  "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala",
  "Guinea","Guinea-Bissau","Guyana",
  "Haiti","Honduras","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
  "Jamaica","Japan","Jordan",
  "Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
  "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein",
  "Lithuania","Luxembourg",
  "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta",
  "Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia",
  "Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
  "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger",
  "Nigeria","North Korea","North Macedonia","Norway",
  "Oman",
  "Pakistan","Palau","Palestine","Panama","Papua New Guinea","Paraguay","Peru",
  "Philippines","Poland","Portugal",
  "Qatar",
  "Romania","Russia","Rwanda",
  "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines",
  "Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal",
  "Schengen Area",
  "Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia",
  "Solomon Islands","Somalia","South Africa","South Korea","South Sudan",
  "Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
  "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga",
  "Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
  "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States",
  "Uruguay","Uzbekistan",
  "Vanuatu","Vatican City","Venezuela","Vietnam",
  "Yemen",
  "Zambia","Zimbabwe",
];

const VISA_TYPES = [
  "Tourist Visa", "Business Visa", "Student Visa", "Work Visa",
  "Transit Visa", "Family Visa", "Schengen Visa", "Investor Visa",
];

const RELATIONSHIP_LABELS: Record<CoTravellerRelationship, string> = {
  spouse: "Spouse",
  child: "Child",
  parent: "Parent",
  sibling: "Sibling",
  grandparent: "Grandparent",
  in_law: "In-law",
  partner: "Partner",
  friend: "Friend",
  colleague: "Colleague",
  relative: "Other relative",
  other: "Other",
};

function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `VS-${year}-${rand}`;
}

function todayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

type CoTravellerDraft = {
  key: string;
  name: string;
  relationship: CoTravellerRelationship | "";
  dob: string;
  passportNumber: string;
  nationality: string;
  notes: string;
};

function emptyCoTraveller(): CoTravellerDraft {
  return {
    key: Math.random().toString(36).slice(2),
    name: "",
    relationship: "",
    dob: "",
    passportNumber: "",
    nationality: "",
    notes: "",
  };
}

const STEPS = [
  { id: 1, title: "Destination & Visa", icon: MapPin },
  { id: 2, title: "Applicant", icon: UserIcon },
  { id: 3, title: "Travel Details", icon: Plane },
  { id: 4, title: "Co-Travellers", icon: Users },
  { id: 5, title: "Documents", icon: ListChecks },
  { id: 6, title: "Fees", icon: DollarSign },
  { id: 7, title: "Review", icon: ClipboardCheck },
] as const;

const FEE_CATEGORIES = [
  { value: "agency_fee",      label: "Agency Fee" },
  { value: "government_fee",  label: "Government Fee" },
  { value: "service_charge",  label: "Service Charge" },
  { value: "other",           label: "Other" },
  { value: "discount",        label: "Discount" },
] as const;

type FeeDraft = {
  key: string;
  description: string;
  category: typeof FEE_CATEGORIES[number]["value"];
  quantity: string;
  unitPrice: string;
};

function emptyFee(): FeeDraft {
  return {
    key: Math.random().toString(36).slice(2),
    description: "",
    category: "agency_fee",
    quantity: "1",
    unitPrice: "",
  };
}

function feeToCents(v: string): number {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : Math.round(n * 100);
}

function fmtFeeMoney(cents: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents ?? 0) / 100);
}

type StepId = typeof STEPS[number]["id"];

export default function NewCasePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: authData } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;
  const today = useMemo(() => todayISO(), []);

  const [step, setStep] = useState<StepId>(1);

  const [form, setForm] = useState({
    destinationCountry: "",
    visaType: "",
    applicantName: "",
    applicantDob: "",
    travelDate: "",
    priority: "normal",
    notes: "",
  });

  const [coTravellers, setCoTravellers] = useState<CoTravellerDraft[]>([]);

  // Fees step state
  const [feeItems, setFeeItems] = useState<FeeDraft[]>([]);
  const [appliedTemplateId, setAppliedTemplateId] = useState<string>("");

  const { data: feeTemplates = [] } = useQuery<FeeTemplate[]>({
    queryKey: ["/api/tenants", tenantId, "fee-templates"],
    enabled: !!tenantId,
  });
  const { data: invoiceSettings } = useQuery<InvoiceSettings | null>({
    queryKey: ["/api/tenants", tenantId, "invoice-settings"],
    enabled: !!tenantId,
  });
  const tenantCurrency = invoiceSettings?.currency ?? "USD";

  // Templates filtered by destination country (or any if user hasn't picked yet)
  const matchingTemplates = useMemo(() => {
    if (!form.destinationCountry) return feeTemplates.filter((t) => t.active);
    return feeTemplates.filter((t) => {
      if (!t.active) return false;
      const countries = [
        ...(t.destinationCountries ?? []),
        ...(t.destinationCountry ? [t.destinationCountry] : []),
      ];
      // Templates with no country list apply to any destination
      if (countries.length === 0) return true;
      return countries.includes(form.destinationCountry);
    });
  }, [feeTemplates, form.destinationCountry]);

  const applyFeeTemplate = (templateId: string) => {
    const tpl = feeTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    setAppliedTemplateId(templateId);
    const next: FeeDraft[] = [];
    if (tpl.agencyFee > 0) next.push({ key: Math.random().toString(36).slice(2), description: `${tpl.name} – Agency Fee`, category: "agency_fee", quantity: "1", unitPrice: (tpl.agencyFee / 100).toFixed(2) });
    if (tpl.governmentFee > 0) next.push({ key: Math.random().toString(36).slice(2), description: `${tpl.name} – Government Fee`, category: "government_fee", quantity: "1", unitPrice: (tpl.governmentFee / 100).toFixed(2) });
    if (tpl.serviceFee > 0) next.push({ key: Math.random().toString(36).slice(2), description: `${tpl.name} – Service Charge`, category: "service_charge", quantity: "1", unitPrice: (tpl.serviceFee / 100).toFixed(2) });
    if (tpl.otherFee > 0) next.push({ key: Math.random().toString(36).slice(2), description: tpl.otherFeeLabel ?? `${tpl.name} – Other`, category: "other", quantity: "1", unitPrice: (tpl.otherFee / 100).toFixed(2) });
    setFeeItems(next.length > 0 ? next : [emptyFee()]);
    toast({ title: "Template loaded", description: `${tpl.name} added to fees.` });
  };

  const updateFeeItem = (key: string, patch: Partial<FeeDraft>) => {
    setFeeItems((arr) => arr.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };
  const removeFeeItem = (key: string) => setFeeItems((arr) => arr.filter((it) => it.key !== key));
  const addFeeItem = () => setFeeItems((arr) => [...arr, emptyFee()]);

  const validFeeItems = useMemo(
    () => feeItems.filter((it) => it.description.trim() && feeToCents(it.unitPrice) > 0),
    [feeItems],
  );
  const feeSubtotal = useMemo(
    () => validFeeItems.reduce((s, it) => s + feeToCents(it.unitPrice) * (parseFloat(it.quantity) || 1), 0),
    [validFeeItems],
  );
  const feeTaxAmount = useMemo(() => {
    if (!invoiceSettings?.gstEnabled) return 0;
    const rateBp = invoiceSettings.taxRate ?? 0;
    // Government fees default non-taxable; others taxable
    const taxableBase = validFeeItems.reduce((s, it) => {
      if (it.category === "government_fee") return s;
      return s + feeToCents(it.unitPrice) * (parseFloat(it.quantity) || 1);
    }, 0);
    return Math.round((taxableBase * rateBp) / 10000);
  }, [validFeeItems, invoiceSettings]);
  const feeTotal = feeSubtotal + feeTaxAmount;

  // Document checklist: maps requirement.type -> whether to include for this case
  // Defaults: all required items checked, optional items unchecked
  const [docChecks, setDocChecks] = useState<Record<string, boolean>>({});
  // Track which checklist signature we've seeded (so user toggles aren't blown away on rerender)
  const seededKeyRef = useRef<string>("");

  const checklist = useMemo<DocumentRequirement[]>(
    () => getDocumentChecklist(form.destinationCountry, form.visaType),
    [form.destinationCountry, form.visaType],
  );

  // Seed default selections when destination/visa changes
  useEffect(() => {
    const key = `${form.destinationCountry}::${form.visaType}`;
    if (key === seededKeyRef.current) return;
    seededKeyRef.current = key;
    const seed: Record<string, boolean> = {};
    for (const req of checklist) seed[req.type] = req.required;
    setDocChecks(seed);
  }, [form.destinationCountry, form.visaType, checklist]);

  // === Per-step validation ===
  const stepError = (s: StepId): string | null => {
    if (s === 1) {
      if (!form.destinationCountry) return "Please select a destination country.";
      if (!form.visaType) return "Please select a visa type.";
    }
    if (s === 2) {
      if (!form.applicantName.trim()) return "Applicant name is required.";
      if (form.applicantDob) {
        const dob = new Date(form.applicantDob);
        if (isNaN(dob.getTime())) return "Date of birth is invalid.";
        if (dob > new Date()) return "Date of birth cannot be in the future.";
      }
    }
    if (s === 3) {
      if (form.travelDate) {
        const td = new Date(form.travelDate);
        if (isNaN(td.getTime())) return "Intended travel date is invalid.";
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        if (td < start) return "Intended travel date cannot be in the past.";
      }
    }
    if (s === 4) {
      for (const ct of coTravellers) {
        if (!ct.name.trim() || !ct.relationship) {
          return "Each co-traveller needs a name and relationship.";
        }
        if (ct.dob) {
          const d = new Date(ct.dob);
          if (isNaN(d.getTime())) return `Co-traveller "${ct.name}" has an invalid date of birth.`;
          if (d > new Date()) return `Co-traveller "${ct.name}" date of birth cannot be in the future.`;
        }
      }
    }
    // Step 5 (Documents) has no hard validation — agency may onboard with empty checklist
    if (s === 6) {
      // Soft step — allow zero fees, but partially-filled rows must be valid
      for (const it of feeItems) {
        const hasDesc = it.description.trim().length > 0;
        const cents = feeToCents(it.unitPrice);
        if (hasDesc && cents <= 0) return `Fee line "${it.description}" needs a unit price.`;
        if (!hasDesc && cents > 0) return "A fee line has a price but no description.";
      }
    }
    return null;
  };

  // Draft requires only step 1 (destination + visa type) to be valid
  const canSaveDraft = !!form.destinationCountry && !!form.visaType;

  // Submission requires every step to be valid
  const fullValidationError = (): string | null => {
    for (const s of [1, 2, 3, 4, 5, 6] as StepId[]) {
      const err = stepError(s);
      if (err) return err;
    }
    return null;
  };

  const buildPayload = (status: "draft" | "pending") => ({
    applicantName: form.applicantName.trim() || (status === "draft" ? "Untitled draft" : ""),
    applicantDob: form.applicantDob || null,
    visaType: form.visaType,
    destinationCountry: form.destinationCountry,
    travelDate: form.travelDate ? new Date(form.travelDate).toISOString() : null,
    priority: form.priority,
    notes: form.notes || null,
    status,
    caseNumber: generateCaseNumber(),
  });

  const selectedDocs = useMemo(
    () => checklist.filter((req) => docChecks[req.type]),
    [checklist, docChecks],
  );

  const createCaseAndCompanions = async (status: "draft" | "pending") => {
    if (!tenantId) throw new Error("Not signed in");
    const res = await apiRequest("POST", `/api/tenants/${tenantId}/cases`, buildPayload(status));
    const created = await res.json();

    for (const ct of coTravellers) {
      try {
        await apiRequest("POST", `/api/cases/${created.id}/co-travellers`, {
          name: ct.name.trim(),
          relationship: ct.relationship,
          dob: ct.dob || null,
          passportNumber: ct.passportNumber.trim() || null,
          nationality: ct.nationality.trim() || null,
          notes: ct.notes.trim() || null,
        });
      } catch (err: any) {
        toast({
          title: `Could not save co-traveller "${ct.name}"`,
          description: err?.message ?? "Unknown error",
          variant: "destructive",
        });
      }
    }

    // Persist document checklist as pending document records on the case
    for (const req of selectedDocs) {
      try {
        await apiRequest("POST", `/api/cases/${created.id}/documents`, {
          tenantId: created.tenantId,
          name: req.name,
          type: req.type,
          status: "pending",
          fileUrl: null,
          notes: req.description,
        });
      } catch (err: any) {
        toast({
          title: `Could not add "${req.name}" to checklist`,
          description: err?.message ?? "Unknown error",
          variant: "destructive",
        });
      }
    }

    // Auto-create a draft invoice if any valid fee lines are present
    if (validFeeItems.length > 0) {
      try {
        const items = validFeeItems.map((it) => {
          const qty = parseFloat(it.quantity) || 1;
          const unit = feeToCents(it.unitPrice);
          return {
            description: it.description.trim(),
            category: it.category,
            quantity: qty,
            unitPrice: unit,
            amount: unit * qty,
            taxable: it.category !== "government_fee",
          };
        });
        await apiRequest("POST", `/api/tenants/${tenantId}/invoices`, {
          caseId: created.id,
          customerName: form.applicantName.trim() || "Applicant",
          customerEmail: null,
          destinationCountry: form.destinationCountry,
          visaType: form.visaType,
          status: "draft",
          paymentType: "upfront",
          items,
        });
      } catch (err: any) {
        toast({
          title: "Case created — but invoice failed",
          description: err?.message ?? "Add fees again from the Accounting page.",
          variant: "destructive",
        });
      }
    }

    return created;
  };

  const submitMutation = useMutation({
    mutationFn: () => createCaseAndCompanions("pending"),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "cases"] });
      toast({ title: "Application created", description: `Case ${created.caseNumber} is ready.` });
      setLocation(`/app/cases/${created.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Could not create application", description: err.message, variant: "destructive" });
    },
  });

  const draftMutation = useMutation({
    mutationFn: () => createCaseAndCompanions("draft"),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "cases"] });
      toast({
        title: "Draft saved",
        description: `Case ${created.caseNumber} saved as draft. You can finish it later from Applications.`,
      });
      setLocation(`/app/cases/${created.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Could not save draft", description: err.message, variant: "destructive" });
    },
  });

  const handleNext = () => {
    const err = stepError(step);
    if (err) {
      toast({ title: "Please fix this step", description: err, variant: "destructive" });
      return;
    }
    if (step < STEPS.length) setStep((step + 1) as StepId);
  };

  const handleBack = () => {
    if (step > 1) setStep((step - 1) as StepId);
  };

  const handleSubmit = () => {
    const err = fullValidationError();
    if (err) {
      toast({ title: "Please fix the form", description: err, variant: "destructive" });
      return;
    }
    submitMutation.mutate();
  };

  const handleSaveDraft = () => {
    if (!canSaveDraft) {
      toast({
        title: "Add a destination & visa type first",
        description: "Drafts need at least a destination country and visa type so we can route them.",
        variant: "destructive",
      });
      return;
    }
    // Lighter validation for drafts: we still don't want bad dates persisted
    for (const s of [2, 3, 4, 6] as StepId[]) {
      const err = stepError(s);
      if (err && !err.includes("required")) {
        toast({ title: "Fix before saving draft", description: err, variant: "destructive" });
        return;
      }
    }
    draftMutation.mutate();
  };

  const updateCoTraveller = (key: string, patch: Partial<CoTravellerDraft>) => {
    setCoTravellers((arr) => arr.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  };

  const isPending = submitMutation.isPending || draftMutation.isPending;

  const isLastStep = step === STEPS.length;

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/app/cases">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Onboard New Application</h1>
            <p className="text-muted-foreground">
              Step {step} of {STEPS.length} · {STEPS[step - 1].title}
            </p>
          </div>
        </div>

        {/* Stepper */}
        <Card>
          <CardContent className="p-4">
            <ol className="flex items-center justify-between gap-2 overflow-x-auto">
              {STEPS.map((s, idx) => {
                const isDone = step > s.id;
                const isActive = step === s.id;
                const Icon = s.icon;
                return (
                  <li key={s.id} className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        // Allow jumping back, or forward only if all prior steps are valid
                        if (s.id < step) return setStep(s.id);
                        for (let i = step; i < s.id; i++) {
                          if (stepError(i as StepId)) return;
                        }
                        setStep(s.id);
                      }}
                      className={[
                        "flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors hover-elevate text-left",
                        isActive ? "bg-primary text-primary-foreground"
                          : isDone ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-muted text-muted-foreground",
                      ].join(" ")}
                      data-testid={`stepper-step-${s.id}`}
                    >
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-background/40 text-xs font-semibold shrink-0">
                        {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                      </span>
                      <span className="text-xs font-medium whitespace-nowrap hidden sm:inline">{s.title}</span>
                    </button>
                    {idx < STEPS.length - 1 && (
                      <div className={`h-px flex-1 ${step > s.id ? "bg-emerald-300 dark:bg-emerald-800" : "bg-border"}`} />
                    )}
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>

        {/* Step body */}
        <form onSubmit={(e) => { e.preventDefault(); isLastStep ? handleSubmit() : handleNext(); }} className="space-y-6">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Where are they going?
                </CardTitle>
                <CardDescription>
                  Pick the destination first — the visa type and required documents both depend on the country.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Destination Country *</Label>
                  <CountryCombobox
                    value={form.destinationCountry}
                    onChange={(v) => setForm({ ...form, destinationCountry: v, visaType: "" })}
                    options={COUNTRIES}
                    placeholder="Start typing a country…"
                    testId="select-destination"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Visa Type *</Label>
                  <Select
                    value={form.visaType}
                    onValueChange={(v) => setForm({ ...form, visaType: v })}
                    disabled={!form.destinationCountry}
                  >
                    <SelectTrigger data-testid="select-visa-type">
                      <SelectValue placeholder={form.destinationCountry ? "Select visa type" : "Select a destination first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {VISA_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserIcon className="w-4 h-4" /> Who is the main applicant?
                </CardTitle>
                <CardDescription>
                  Use exactly what's on the passport. A reference ID will be generated automatically so the customer can claim and track this case.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="applicantName">Applicant Full Name *</Label>
                  <Input
                    id="applicantName"
                    value={form.applicantName}
                    onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                    placeholder="As written in passport"
                    data-testid="input-applicant-name"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicantDob">Date of Birth</Label>
                  <Input
                    id="applicantDob"
                    type="date"
                    value={form.applicantDob}
                    max={today}
                    onChange={(e) => setForm({ ...form, applicantDob: e.target.value })}
                    data-testid="input-applicant-dob"
                  />
                  <p className="text-xs text-muted-foreground">Must be today or earlier.</p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Plane className="w-4 h-4" /> When are they travelling?
                </CardTitle>
                <CardDescription>
                  Set the intended travel date and how urgent the case is for your team.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="travelDate">Intended Travel Date</Label>
                    <Input
                      id="travelDate"
                      type="date"
                      value={form.travelDate}
                      min={today}
                      onChange={(e) => setForm({ ...form, travelDate: e.target.value })}
                      data-testid="input-travel-date"
                    />
                    <p className="text-xs text-muted-foreground">Must be today or later.</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Internal Notes
                  </Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Anything your team should know about this case…"
                    rows={4}
                    data-testid="input-notes"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" /> Co-Travellers
                  </CardTitle>
                  <CardDescription>
                    Add anyone travelling on the same trip (family, partner, group). They'll be linked to this case. You can skip this step.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCoTravellers((arr) => [...arr, emptyCoTraveller()])}
                  data-testid="button-add-co-traveller"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Add co-traveller
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {coTravellers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No co-travellers yet. Add a spouse, child, friend, or colleague travelling along.
                  </p>
                ) : (
                  coTravellers.map((ct, idx) => (
                    <div key={ct.key} className="border rounded-xl p-4 space-y-3 bg-muted/20" data-testid={`block-co-traveller-${idx}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Co-traveller #{idx + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setCoTravellers((arr) => arr.filter((c) => c.key !== ct.key))}
                          data-testid={`button-remove-co-traveller-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>Full name *</Label>
                          <Input
                            value={ct.name}
                            onChange={(e) => updateCoTraveller(ct.key, { name: e.target.value })}
                            placeholder="As written in passport"
                            data-testid={`input-co-traveller-name-${idx}`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Relationship *</Label>
                          <Select
                            value={ct.relationship || undefined}
                            onValueChange={(v) => updateCoTraveller(ct.key, { relationship: v as CoTravellerRelationship })}
                          >
                            <SelectTrigger data-testid={`select-co-traveller-relationship-${idx}`}>
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                            <SelectContent>
                              {CO_TRAVELLER_RELATIONSHIPS.map((r) => (
                                <SelectItem key={r} value={r}>{RELATIONSHIP_LABELS[r]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Date of Birth</Label>
                          <Input
                            type="date"
                            value={ct.dob}
                            max={today}
                            onChange={(e) => updateCoTraveller(ct.key, { dob: e.target.value })}
                            data-testid={`input-co-traveller-dob-${idx}`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Passport number</Label>
                          <Input
                            value={ct.passportNumber}
                            onChange={(e) => updateCoTraveller(ct.key, { passportNumber: e.target.value })}
                            placeholder="Optional"
                            data-testid={`input-co-traveller-passport-${idx}`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Nationality</Label>
                          <Input
                            value={ct.nationality}
                            onChange={(e) => updateCoTraveller(ct.key, { nationality: e.target.value })}
                            placeholder="Optional"
                            data-testid={`input-co-traveller-nationality-${idx}`}
                          />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>Notes</Label>
                          <Textarea
                            value={ct.notes}
                            rows={2}
                            onChange={(e) => updateCoTraveller(ct.key, { notes: e.target.value })}
                            placeholder="Optional notes about this co-traveller"
                            data-testid={`input-co-traveller-notes-${idx}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ListChecks className="w-4 h-4" /> Documents Checklist
                    </CardTitle>
                    <CardDescription>
                      Tailored to <span className="font-medium text-foreground">{form.destinationCountry || "—"}</span>
                      {" · "}
                      <span className="font-medium text-foreground">{form.visaType || "—"}</span>.
                      Tick the items you need to collect — they'll be added to this case as pending so the customer knows what to upload.
                    </CardDescription>
                  </div>
                  {checklist.length > 0 && (
                    <Badge variant="secondary" className="shrink-0" data-testid="badge-checklist-count">
                      {selectedDocs.length}/{checklist.length}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {checklist.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    No checklist available — pick a destination and visa type first.
                  </p>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setDocChecks(Object.fromEntries(checklist.map((r) => [r.type, true])))}
                        data-testid="button-checklist-select-all"
                      >
                        Select all
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDocChecks(Object.fromEntries(checklist.map((r) => [r.type, r.required])))}
                        data-testid="button-checklist-reset"
                      >
                        Reset to recommended
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setDocChecks({})}
                        data-testid="button-checklist-clear"
                      >
                        Clear
                      </Button>
                    </div>
                    <ul className="divide-y border rounded-xl overflow-hidden">
                      {checklist.map((req) => {
                        const checked = !!docChecks[req.type];
                        return (
                          <li
                            key={req.type}
                            className="flex items-start gap-3 p-3 bg-card hover:bg-muted/40 transition-colors"
                            data-testid={`checklist-row-${req.type}`}
                          >
                            <Checkbox
                              id={`doc-${req.type}`}
                              checked={checked}
                              onCheckedChange={(v) =>
                                setDocChecks((d) => ({ ...d, [req.type]: v === true }))
                              }
                              className="mt-0.5"
                              data-testid={`checkbox-doc-${req.type}`}
                            />
                            <label htmlFor={`doc-${req.type}`} className="flex-1 cursor-pointer space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{req.name}</span>
                                {req.required ? (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Recommended</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Optional</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">{req.description}</p>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="text-xs text-muted-foreground">
                      Tip: items left unchecked won't be added to the case. You can always add or remove documents later from the case detail page.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {step === 6 && (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Fees
                    </CardTitle>
                    <CardDescription>
                      Add fees manually or load them from a saved template. A draft invoice is auto-created on this case if you add any fees.
                      {invoiceSettings?.gstEnabled && (
                        <span className="block mt-1 text-xs">
                          GST is enabled at {((invoiceSettings.taxRate ?? 0) / 100).toFixed(2)}% — applied automatically to non-government lines.
                        </span>
                      )}
                    </CardDescription>
                  </div>
                  {matchingTemplates.length > 0 && (
                    <div className="flex items-center gap-2 min-w-[260px]">
                      <Select value={appliedTemplateId} onValueChange={applyFeeTemplate}>
                        <SelectTrigger data-testid="select-fee-template" className="w-full">
                          <SelectValue placeholder={`Load from template (${matchingTemplates.length})`} />
                        </SelectTrigger>
                        <SelectContent>
                          {matchingTemplates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {feeItems.length === 0 ? (
                  <div className="rounded-xl border border-dashed p-6 text-center space-y-2">
                    <p className="text-sm text-muted-foreground">No fees yet — add lines manually or load a template above.</p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFeeItem}
                      className="gap-2"
                      data-testid="button-add-fee-empty"
                    >
                      <Plus className="w-4 h-4" /> Add fee line
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {feeItems.map((it, idx) => (
                        <div
                          key={it.key}
                          className="grid grid-cols-12 gap-2 items-start rounded-lg border p-3 bg-card"
                          data-testid={`row-fee-${idx}`}
                        >
                          <div className="col-span-12 sm:col-span-5 space-y-1">
                            <Label className="text-xs">Description</Label>
                            <Input
                              value={it.description}
                              onChange={(e) => updateFeeItem(it.key, { description: e.target.value })}
                              placeholder="e.g. Visa application processing"
                              data-testid={`input-fee-description-${idx}`}
                            />
                          </div>
                          <div className="col-span-6 sm:col-span-3 space-y-1">
                            <Label className="text-xs">Category</Label>
                            <Select
                              value={it.category}
                              onValueChange={(v) => updateFeeItem(it.key, { category: v as FeeDraft["category"] })}
                            >
                              <SelectTrigger data-testid={`select-fee-category-${idx}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {FEE_CATEGORIES.map((c) => (
                                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-3 sm:col-span-1 space-y-1">
                            <Label className="text-xs">Qty</Label>
                            <Input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) => updateFeeItem(it.key, { quantity: e.target.value })}
                              data-testid={`input-fee-qty-${idx}`}
                            />
                          </div>
                          <div className="col-span-3 sm:col-span-2 space-y-1">
                            <Label className="text-xs">Unit ({tenantCurrency})</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={it.unitPrice}
                              onChange={(e) => updateFeeItem(it.key, { unitPrice: e.target.value })}
                              data-testid={`input-fee-unit-${idx}`}
                            />
                          </div>
                          <div className="col-span-12 sm:col-span-1 flex sm:justify-end items-end h-full">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => removeFeeItem(it.key)}
                              data-testid={`button-fee-remove-${idx}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addFeeItem}
                      className="gap-2"
                      data-testid="button-add-fee"
                    >
                      <Plus className="w-4 h-4" /> Add another line
                    </Button>

                    <div className="flex justify-end pt-2">
                      <div className="w-full sm:w-72 space-y-1 text-sm border-t pt-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span data-testid="text-fee-subtotal">{fmtFeeMoney(feeSubtotal, tenantCurrency)}</span>
                        </div>
                        {feeTaxAmount > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>{invoiceSettings?.taxLabel ?? "Tax"}</span>
                            <span data-testid="text-fee-tax">{fmtFeeMoney(feeTaxAmount, tenantCurrency)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold border-t pt-1">
                          <span>Total</span>
                          <span data-testid="text-fee-total">{fmtFeeMoney(feeTotal, tenantCurrency)}</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {step === 7 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" /> Review & Submit
                </CardTitle>
                <CardDescription>
                  Double-check the details. Submit when ready, or save as a draft and finish later.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 text-sm">
                <ReviewBlock
                  title="Destination & Visa"
                  onEdit={() => setStep(1)}
                  rows={[
                    ["Destination", form.destinationCountry || "—"],
                    ["Visa Type", form.visaType || "—"],
                  ]}
                />
                <ReviewBlock
                  title="Applicant"
                  onEdit={() => setStep(2)}
                  rows={[
                    ["Full Name", form.applicantName || "—"],
                    ["Date of Birth", form.applicantDob || "—"],
                  ]}
                />
                <ReviewBlock
                  title="Travel Details"
                  onEdit={() => setStep(3)}
                  rows={[
                    ["Travel Date", form.travelDate || "—"],
                    ["Priority", form.priority],
                    ["Notes", form.notes || "—"],
                  ]}
                />
                <div className="border rounded-xl p-4 bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Co-Travellers ({coTravellers.length})</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setStep(4)} data-testid="button-edit-co-travellers">Edit</Button>
                  </div>
                  {coTravellers.length === 0 ? (
                    <p className="text-muted-foreground text-sm">None added.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {coTravellers.map((ct, idx) => (
                        <li key={ct.key} className="text-muted-foreground">
                          <span className="font-medium text-foreground">{ct.name || `Co-traveller #${idx + 1}`}</span>
                          {ct.relationship ? ` · ${RELATIONSHIP_LABELS[ct.relationship]}` : ""}
                          {ct.dob ? ` · DOB ${ct.dob}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="border rounded-xl p-4 bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Fees ({validFeeItems.length} {validFeeItems.length === 1 ? "line" : "lines"})</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setStep(6)} data-testid="button-edit-fees">Edit</Button>
                  </div>
                  {validFeeItems.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No fees added — no invoice will be created.</p>
                  ) : (
                    <>
                      <ul className="space-y-1 text-sm">
                        {validFeeItems.map((it) => {
                          const qty = parseFloat(it.quantity) || 1;
                          const lineTotal = feeToCents(it.unitPrice) * qty;
                          return (
                            <li key={it.key} className="flex items-center justify-between gap-2">
                              <span className="text-foreground truncate">{it.description}</span>
                              <span className="text-muted-foreground text-xs whitespace-nowrap">{fmtFeeMoney(lineTotal, tenantCurrency)}</span>
                            </li>
                          );
                        })}
                      </ul>
                      <div className="flex justify-between font-semibold border-t mt-2 pt-2">
                        <span>Invoice total</span>
                        <span>{fmtFeeMoney(feeTotal, tenantCurrency)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">A draft invoice will be created automatically.</p>
                    </>
                  )}
                </div>
                <div className="border rounded-xl p-4 bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Documents Checklist ({selectedDocs.length}/{checklist.length})</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setStep(5)} data-testid="button-edit-documents">Edit</Button>
                  </div>
                  {checklist.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No checklist available for this destination + visa type.</p>
                  ) : selectedDocs.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No documents selected — case will be created without a checklist.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {selectedDocs.map((req) => (
                        <li key={req.type} className="flex items-center gap-2 text-foreground">
                          <CircleDot className="w-3 h-3 text-emerald-600" />
                          {req.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t">
            <div className="flex items-center gap-2">
              <Link href="/app/cases">
                <Button type="button" variant="ghost" data-testid="button-cancel">Cancel</Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={!canSaveDraft || isPending}
                className="gap-2"
                data-testid="button-save-draft"
              >
                {draftMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save as Draft
              </Button>
            </div>
            <div className="flex items-center gap-2 sm:ml-auto">
              {step > 1 && (
                <Button type="button" variant="outline" onClick={handleBack} disabled={isPending} className="gap-2" data-testid="button-step-back">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
              )}
              {!isLastStep ? (
                <Button type="submit" disabled={isPending} className="gap-2" data-testid="button-step-next">
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isPending}
                  className="gap-2"
                  data-testid="button-create-case"
                >
                  {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit Application
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}

function ReviewBlock({
  title,
  rows,
  onEdit,
}: {
  title: string;
  rows: [string, string][];
  onEdit: () => void;
}) {
  return (
    <div className="border rounded-xl p-4 bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <p className="font-medium">{title}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} data-testid={`button-edit-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          Edit
        </Button>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between sm:block">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-medium text-foreground sm:mt-0.5 break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/* ----------------------------------------------------------
 * CountryCombobox — themed autocomplete (works in dark mode)
 * ---------------------------------------------------------- */
function CountryCombobox({
  value,
  onChange,
  options,
  placeholder,
  testId,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep input in sync when value changes from outside
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === value.toLowerCase()) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, value, options]);

  function pick(opt: string) {
    onChange(opt);
    setQuery(opt);
    setOpen(false);
  }

  function clear() {
    onChange("");
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }

  return (
    <div className="relative" ref={wrapRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          value={query}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value && e.target.value !== value) onChange("");
          }}
          className="pl-9 pr-9"
          data-testid={testId}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-muted flex items-center justify-center"
            data-testid={`${testId}-clear`}
            aria-label="Clear"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover text-popover-foreground border border-border rounded-md shadow-md max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-muted-foreground">No matches.</div>
          ) : (
            filtered.slice(0, 80).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => pick(opt)}
                className={[
                  "w-full text-left px-3 py-2 text-sm flex items-center justify-between hover-elevate",
                  value === opt ? "font-medium" : "",
                ].join(" ")}
                data-testid={`${testId}-option-${opt.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <span>{opt}</span>
                {value === opt && <Check className="w-3.5 h-3.5 text-primary" />}
              </button>
            ))
          )}
          {filtered.length > 80 && (
            <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-t">
              {filtered.length - 80} more — keep typing to narrow.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
