import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, Check, Loader2, Plus, Save, Send, Trash2, Users,
  MapPin, FileText, User as UserIcon, Plane, ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CO_TRAVELLER_RELATIONSHIPS, type CoTravellerRelationship } from "@shared/schema";

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Spain", "Italy", "Netherlands", "Switzerland",
  "Japan", "South Korea", "Singapore", "United Arab Emirates", "Turkey",
  "Schengen Area", "Other",
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
  { id: 5, title: "Review", icon: ClipboardCheck },
] as const;

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
    return null;
  };

  // Draft requires only step 1 (destination + visa type) to be valid
  const canSaveDraft = !!form.destinationCountry && !!form.visaType;

  // Submission requires every step to be valid
  const fullValidationError = (): string | null => {
    for (const s of [1, 2, 3, 4] as StepId[]) {
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
    if (step < 5) setStep((step + 1) as StepId);
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
    for (const s of [2, 3, 4] as StepId[]) {
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
        <form onSubmit={(e) => { e.preventDefault(); step === 5 ? handleSubmit() : handleNext(); }} className="space-y-6">
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Where are they going?
                </CardTitle>
                <CardDescription>
                  Pick the destination first — the visa type often depends on the country.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>Destination Country *</Label>
                  <Select
                    value={form.destinationCountry}
                    onValueChange={(v) => setForm({ ...form, destinationCountry: v, visaType: "" })}
                  >
                    <SelectTrigger data-testid="select-destination">
                      <SelectValue placeholder="Select destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              {step < 5 ? (
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
