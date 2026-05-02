import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus, Trash2, Users } from "lucide-react";
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

const VISA_TYPES = [
  "Tourist Visa", "Business Visa", "Student Visa", "Work Visa",
  "Transit Visa", "Family Visa", "Schengen Visa", "Investor Visa",
];

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Spain", "Italy", "Netherlands", "Switzerland",
  "Japan", "South Korea", "Singapore", "United Arab Emirates", "Turkey",
  "Schengen Area", "Other",
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

export default function NewCasePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: authData } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;
  const today = useMemo(() => todayISO(), []);

  const [form, setForm] = useState({
    applicantName: "",
    applicantDob: "",
    visaType: "",
    destinationCountry: "",
    travelDate: "",
    priority: "normal",
    notes: "",
  });

  const [coTravellers, setCoTravellers] = useState<CoTravellerDraft[]>([]);

  const validate = (): string | null => {
    if (!form.applicantName.trim()) return "Applicant name is required.";
    if (!form.visaType) return "Visa type is required.";
    if (!form.destinationCountry) return "Destination country is required.";
    if (form.applicantDob) {
      const dob = new Date(form.applicantDob);
      if (isNaN(dob.getTime())) return "Date of birth is invalid.";
      if (dob > new Date()) return "Date of birth cannot be in the future.";
    }
    if (form.travelDate) {
      const td = new Date(form.travelDate);
      if (isNaN(td.getTime())) return "Intended travel date is invalid.";
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      if (td < start) return "Intended travel date cannot be in the past.";
    }
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
    return null;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Not signed in");
      const payload = {
        applicantName: form.applicantName.trim(),
        applicantDob: form.applicantDob || null,
        visaType: form.visaType,
        destinationCountry: form.destinationCountry,
        travelDate: form.travelDate ? new Date(form.travelDate).toISOString() : null,
        priority: form.priority,
        notes: form.notes || null,
        status: "pending",
        caseNumber: generateCaseNumber(),
      };
      const res = await apiRequest("POST", `/api/tenants/${tenantId}/cases`, payload);
      const created = await res.json();

      // Create co-travellers (best-effort, sequential)
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
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "cases"] });
      toast({ title: "Application created", description: `Case ${created.caseNumber} is ready.` });
      setLocation(`/app/cases/${created.id}`);
    },
    onError: (err: Error) => {
      toast({ title: "Could not create application", description: err.message, variant: "destructive" });
    },
  });

  const canSubmit = form.applicantName.trim() && form.visaType && form.destinationCountry;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      toast({ title: "Please fix the form", description: error, variant: "destructive" });
      return;
    }
    createMutation.mutate();
  };

  const updateCoTraveller = (key: string, patch: Partial<CoTravellerDraft>) => {
    setCoTravellers((arr) => arr.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  };

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Link href="/app/cases">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">New Application</h1>
            <p className="text-muted-foreground">Create a new visa application case for an applicant.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Applicant & Visa Details</CardTitle>
              <CardDescription>
                A reference ID will be generated automatically so the customer can claim and track this case from the portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="applicantName">Applicant Full Name *</Label>
                  <Input
                    id="applicantName"
                    value={form.applicantName}
                    onChange={(e) => setForm({ ...form, applicantName: e.target.value })}
                    placeholder="As written in passport"
                    data-testid="input-applicant-name"
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
                </div>

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
                  <Label>Visa Type *</Label>
                  <Select value={form.visaType} onValueChange={(v) => setForm({ ...form, visaType: v })}>
                    <SelectTrigger data-testid="select-visa-type">
                      <SelectValue placeholder="Select visa type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VISA_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Destination Country *</Label>
                  <Select value={form.destinationCountry} onValueChange={(v) => setForm({ ...form, destinationCountry: v })}>
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

                <div className="space-y-2 sm:col-span-2">
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

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">Internal Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Anything your team should know about this case…"
                    rows={4}
                    data-testid="input-notes"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Co-Travellers */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" /> Co-Travellers
                </CardTitle>
                <CardDescription>
                  Add anyone travelling on the same trip (family, partner, group). They'll be linked to this case.
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

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Link href="/app/cases">
              <Button type="button" variant="outline" data-testid="button-cancel">Cancel</Button>
            </Link>
            <Button
              type="submit"
              disabled={!canSubmit || createMutation.isPending}
              className="gap-2"
              data-testid="button-create-case"
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Create Application
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
