import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
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

function generateCaseNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `VS-${year}-${rand}`;
}

export default function NewCasePage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: authData } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;

  const [form, setForm] = useState({
    applicantName: "",
    applicantDob: "",
    visaType: "",
    destinationCountry: "",
    travelDate: "",
    priority: "normal",
    notes: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("Not signed in");
      const payload = {
        applicantName: form.applicantName,
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
      return res.json();
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
    if (!canSubmit) {
      toast({
        title: "Missing required fields",
        description: "Applicant name, visa type and destination are required.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate();
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

        <form onSubmit={handleSubmit}>
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
                    onChange={(e) => setForm({ ...form, travelDate: e.target.value })}
                    data-testid="input-travel-date"
                  />
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
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}
