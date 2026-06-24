import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  ArrowLeft, Mail, Phone, BadgeCheck, FileText, Calendar,
  Briefcase, ChevronRight, User as UserIcon, Globe2,
  AlertTriangle, Clock, Download, ExternalLink,
  Plus, Pencil, Trash2, Star, BookUser, Upload, Loader2, Sparkles, Brain,
} from "lucide-react";
import { getPassportExpiryStatus, fmtPassportExpiry } from "@/pages/agency/customers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { CustomerAccount, Case, Passport } from "@workspace/db";
import { PASSPORT_RELATIONSHIPS, type PassportRelationship } from "@/shared/schema-constants";

type CustomerDetailResponse = {
  account: CustomerAccount;
  cases: Case[];
  passports: Passport[];
};

const RELATIONSHIP_LABELS: Record<PassportRelationship, string> = {
  self: "Self",
  spouse: "Spouse",
  child: "Child",
  parent: "Parent",
  sibling: "Sibling",
  partner: "Partner",
  relative: "Relative",
  other: "Other",
};

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
  documents_required: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  submitted: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300",
};

function ExpiryBadge({ expiry }: { expiry: string | null | undefined }) {
  const status = getPassportExpiryStatus(expiry);
  if (!status) return null;
  if (status === "expired") {
    return (
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-medium"
        data-testid="alert-passport-expired"
      >
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          Passport expired on {fmtPassportExpiry(expiry)}. Holder must renew
          before any new application can be lodged.
        </span>
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 text-xs font-medium"
      data-testid="alert-passport-expiring"
    >
      <Clock className="h-4 w-4 shrink-0" />
      <span>
        Passport expires {fmtPassportExpiry(expiry)} — most embassies require
        at least 6 months of remaining validity.
      </span>
    </div>
  );
}

// Allow only the two URL shapes we trust to render in <a href> / <img src>:
//   - http(s)://… (real network URLs)
//   - data:image/<png|jpeg|jpg|webp|gif>;base64,…  (inline scans)
// Anything else (`javascript:`, `data:text/html`, `file:`, blob:, etc.) is
// rejected so a malicious passportFileUrl can never run script in an agency
// staff session.
function sanitizePassportUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = raw.trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(url)) return url;
  return null;
}

function PassportFileLink({ rawUrl }: { rawUrl: string | null | undefined }) {
  const url = sanitizePassportUrl(rawUrl);
  if (!url) {
    if (rawUrl) {
      return (
        <div className="text-[11px] text-muted-foreground italic" data-testid="text-passport-file-blocked">
          Passport file is attached but could not be displayed (unsupported URL type).
        </div>
      );
    }
    return null;
  }
  const isImage = /^data:image\//i.test(url) || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
  return (
    <div className="space-y-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
        Passport file
      </div>
      {isImage ? (
        <a href={url} target="_blank" rel="noopener noreferrer" data-testid="link-passport-file">
          <img
            src={url}
            alt="Passport scan"
            className="max-h-48 rounded-md border border-border object-contain bg-muted/30"
          />
        </a>
      ) : (
        <div className="flex items-center gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" data-testid="button-passport-open">
              <ExternalLink className="h-3 w-3 mr-1" /> Open file
            </Button>
          </a>
          <a href={url} download>
            <Button variant="outline" size="sm" data-testid="button-passport-download">
              <Download className="h-3 w-3 mr-1" /> Download
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground/80">{label}</div>
      <div className={mono ? "font-mono" : ""}>
        {value || <span className="text-muted-foreground/60">—</span>}
      </div>
    </div>
  );
}

// --- Passport library ---

type PassportFormState = {
  holderName: string;
  relationship: PassportRelationship;
  isPrimary: boolean;
  passportSurname: string;
  passportGivenName: string;
  passportMiddleName: string;
  passportNumber: string;
  passportNationality: string;
  passportGender: string;
  passportDateOfBirth: string;
  passportDateOfIssue: string;
  passportDateOfExpiry: string;
  passportPlaceOfIssue: string;
  passportPlaceOfBirth: string;
  passportFileUrl: string;
  notes: string;
};

const emptyPassportForm: PassportFormState = {
  holderName: "",
  relationship: "self",
  isPrimary: false,
  passportSurname: "",
  passportGivenName: "",
  passportMiddleName: "",
  passportNumber: "",
  passportNationality: "",
  passportGender: "",
  passportDateOfBirth: "",
  passportDateOfIssue: "",
  passportDateOfExpiry: "",
  passportPlaceOfIssue: "",
  passportPlaceOfBirth: "",
  passportFileUrl: "",
  notes: "",
};

function passportToForm(p: Passport): PassportFormState {
  return {
    holderName: p.holderName ?? "",
    relationship: (p.relationship as PassportRelationship) ?? "self",
    isPrimary: !!p.isPrimary,
    passportSurname: p.passportSurname ?? "",
    passportGivenName: p.passportGivenName ?? "",
    passportMiddleName: p.passportMiddleName ?? "",
    passportNumber: p.passportNumber ?? "",
    passportNationality: p.passportNationality ?? "",
    passportGender: p.passportGender ?? "",
    passportDateOfBirth: p.passportDateOfBirth ?? "",
    passportDateOfIssue: p.passportDateOfIssue ?? "",
    passportDateOfExpiry: p.passportDateOfExpiry ?? "",
    passportPlaceOfIssue: p.passportPlaceOfIssue ?? "",
    passportPlaceOfBirth: p.passportPlaceOfBirth ?? "",
    passportFileUrl: p.passportFileUrl ?? "",
    notes: p.notes ?? "",
  };
}

// Trim + drop empty strings so the API doesn't store "" for missing fields.
function formToPayload(f: PassportFormState) {
  const payload: Record<string, any> = {
    relationship: f.relationship,
    isPrimary: f.isPrimary,
  };
  const stringFields: (keyof PassportFormState)[] = [
    "holderName", "passportSurname", "passportGivenName", "passportMiddleName",
    "passportNumber", "passportNationality", "passportGender",
    "passportDateOfBirth", "passportDateOfIssue", "passportDateOfExpiry",
    "passportPlaceOfIssue", "passportPlaceOfBirth", "passportFileUrl", "notes",
  ];
  for (const k of stringFields) {
    const v = (f[k] as string).trim();
    payload[k] = v || null;
  }
  return payload;
}

function PassportFormDialog({
  open, onOpenChange, initial, mode, tenantId, customerId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: PassportFormState & { id?: string };
  mode: "create" | "edit";
  tenantId: string;
  customerId: string;
}) {
  const { toast } = useToast();
  const [form, setForm] = useState<PassportFormState>(initial);
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);

  // Re-sync the form whenever the dialog is reopened for a different
  // passport (or freshly opened for "create"). useEffect rather than a
  // render-phase setState so we don't trigger extra renders or warnings.
  useEffect(() => {
    if (open) {
      setForm(initial);
      setScanWarnings([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);

  const set = (patch: Partial<PassportFormState>) =>
    setForm(prev => ({ ...prev, ...patch }));

  // === Passport scanner (Claude vision) ===
  // Reads the chosen image as a base64 data URI, POSTs the bytes to the
  // shared /api/passport/scan endpoint, and merges any fields the OCR
  // returned into the form. We only overwrite fields that came back
  // non-null so a re-scan won't blow away values the user already typed.
  const scanMutation = useMutation({
    mutationFn: async (file: File) => {
      // Hard cap mirrors the server's 8 MB limit; warn early so we don't
      // spend time uploading something that will be rejected.
      if (file.size > 8 * 1024 * 1024) {
        throw new Error("Image is too large. Please upload a file under 8 MB.");
      }
      if (!file.type.startsWith("image/")) {
        throw new Error("Please choose an image file (JPG, PNG, WebP, or GIF).");
      }
      const dataUri: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Couldn't read the file."));
        reader.readAsDataURL(file);
      });
      const res = await apiRequest("POST", "/api/passport/scan", {
        imageBase64: dataUri,
        mimeType: file.type,
      });
      const json = await res.json();
      return { json, dataUri };
    },
    onSuccess: ({ json, dataUri }) => {
      const r = json as {
        surname: string | null;
        givenName: string | null;
        middleName: string | null;
        passportNumber: string | null;
        nationality: string | null;
        gender: string | null;
        dateOfBirth: string | null;
        dateOfIssue: string | null;
        dateOfExpiry: string | null;
        placeOfIssue: string | null;
        placeOfBirth: string | null;
        warnings: string[];
      };
      // Only fill fields that came back non-null (don't clobber existing
      // user input on re-scan).
      setForm(prev => ({
        ...prev,
        passportSurname: r.surname ?? prev.passportSurname,
        passportGivenName: r.givenName ?? prev.passportGivenName,
        passportMiddleName: r.middleName ?? prev.passportMiddleName,
        passportNumber: r.passportNumber ?? prev.passportNumber,
        passportNationality: r.nationality ?? prev.passportNationality,
        passportGender: r.gender ?? prev.passportGender,
        passportDateOfBirth: r.dateOfBirth ?? prev.passportDateOfBirth,
        passportDateOfIssue: r.dateOfIssue ?? prev.passportDateOfIssue,
        passportDateOfExpiry: r.dateOfExpiry ?? prev.passportDateOfExpiry,
        passportPlaceOfIssue: r.placeOfIssue ?? prev.passportPlaceOfIssue,
        passportPlaceOfBirth: r.placeOfBirth ?? prev.passportPlaceOfBirth,
        // Auto-derive holderName from the OCR if the user hasn't set one.
        holderName: prev.holderName || [r.givenName, r.surname].filter(Boolean).join(" "),
        // Attach the scanned image as the passport file, but only if the
        // user hasn't already pointed at a different URL.
        passportFileUrl: prev.passportFileUrl || dataUri,
      }));
      setScanWarnings(Array.isArray(r.warnings) ? r.warnings : []);
      const filledCount = [
        r.surname, r.givenName, r.passportNumber, r.nationality,
        r.dateOfBirth, r.dateOfIssue, r.dateOfExpiry,
      ].filter(Boolean).length;
      toast({
        title: filledCount > 0 ? "Passport scanned" : "Scan finished",
        description: filledCount > 0
          ? `Filled ${filledCount} field${filledCount === 1 ? "" : "s"} from the image. Please double-check the values.`
          : "Couldn't read any fields confidently — please fill the form manually.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Scan failed",
        description: err?.message ?? "Please try again, or fill the form manually.",
        variant: "destructive",
      });
    },
  });

  const onScanFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset the input so the same file can be chosen again after an error.
    e.target.value = "";
    if (file) scanMutation.mutate(file);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = formToPayload(form);
      if (mode === "create") {
        return apiRequest(
          "POST",
          `/api/tenants/${tenantId}/customers/${customerId}/passports`,
          payload,
        );
      }
      return apiRequest(
        "PATCH",
        `/api/tenants/${tenantId}/customers/${customerId}/passports/${initial.id}`,
        payload,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tenants", tenantId, "customers", customerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/tenants", tenantId, "customers"],
      });
      toast({
        title: mode === "create" ? "Passport added" : "Passport updated",
      });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't save passport",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-passport-form">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add passport" : "Edit passport"}
          </DialogTitle>
          <DialogDescription>
            Stored in this customer's master library so it can be reused across
            future applications and shared between co-travellers.
          </DialogDescription>
        </DialogHeader>

        {/* Scanner: upload a passport bio-page image and let Claude
            pre-fill the fields. Failure is non-fatal — the rest of the
            form still works for manual entry. */}
        <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 mb-1">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 text-primary p-2">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">Auto-fill from passport image</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Upload a clear photo of the bio page (JPG/PNG/WebP, ≤ 8 MB) and we'll
                read the fields automatically. You can edit anything before saving.
              </div>
              {scanWarnings.length > 0 && (
                <ul className="mt-2 text-[11px] text-amber-700 dark:text-amber-300 list-disc list-inside space-y-0.5">
                  {scanWarnings.map((w, i) => (
                    <li key={i} data-testid={`text-scan-warning-${i}`}>{w}</li>
                  ))}
                </ul>
              )}
            </div>
            <label>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onScanFile}
                disabled={scanMutation.isPending}
                data-testid="input-scan-passport"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={scanMutation.isPending}
                asChild
              >
                <span data-testid="button-scan-passport">
                  {scanMutation.isPending ? (
                    <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Scanning…</>
                  ) : (
                    <><Upload className="h-3 w-3 mr-1" /> Scan image</>
                  )}
                </span>
              </Button>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-1">
              <Label>Holder name</Label>
              <Input
                value={form.holderName}
                onChange={e => set({ holderName: e.target.value })}
                placeholder="e.g. John Smith"
                data-testid="input-holder-name"
              />
            </div>
            <div>
              <Label>Relationship</Label>
              <Select
                value={form.relationship}
                onValueChange={v => set({ relationship: v as PassportRelationship })}
              >
                <SelectTrigger data-testid="select-relationship">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PASSPORT_RELATIONSHIPS.map(r => (
                    <SelectItem key={r} value={r}>{RELATIONSHIP_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isPrimary}
                  onChange={e => set({ isPrimary: e.target.checked })}
                  data-testid="checkbox-is-primary"
                />
                Mark as primary passport
              </label>
            </div>
          </div>

          <div>
            <Label>Surname</Label>
            <Input
              value={form.passportSurname}
              onChange={e => set({ passportSurname: e.target.value })}
              data-testid="input-passport-surname"
            />
          </div>
          <div>
            <Label>Given name</Label>
            <Input
              value={form.passportGivenName}
              onChange={e => set({ passportGivenName: e.target.value })}
              data-testid="input-passport-given-name"
            />
          </div>
          <div>
            <Label>Middle name</Label>
            <Input
              value={form.passportMiddleName}
              onChange={e => set({ passportMiddleName: e.target.value })}
              data-testid="input-passport-middle-name"
            />
          </div>
          <div>
            <Label>Passport number</Label>
            <Input
              value={form.passportNumber}
              onChange={e => set({ passportNumber: e.target.value })}
              className="font-mono"
              data-testid="input-passport-number"
            />
          </div>
          <div>
            <Label>Nationality</Label>
            <Input
              value={form.passportNationality}
              onChange={e => set({ passportNationality: e.target.value })}
              data-testid="input-nationality"
            />
          </div>
          <div>
            <Label>Gender</Label>
            <Select
              value={form.passportGender || "_none_"}
              onValueChange={v => set({ passportGender: v === "_none_" ? "" : v })}
            >
              <SelectTrigger data-testid="select-gender">
                <SelectValue placeholder="Not specified" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">Not specified</SelectItem>
                <SelectItem value="M">Male</SelectItem>
                <SelectItem value="F">Female</SelectItem>
                <SelectItem value="X">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date of birth</Label>
            <Input
              type="date"
              value={form.passportDateOfBirth}
              onChange={e => set({ passportDateOfBirth: e.target.value })}
              data-testid="input-dob"
            />
          </div>
          <div>
            <Label>Place of birth</Label>
            <Input
              value={form.passportPlaceOfBirth}
              onChange={e => set({ passportPlaceOfBirth: e.target.value })}
              data-testid="input-place-of-birth"
            />
          </div>
          <div>
            <Label>Date of issue</Label>
            <Input
              type="date"
              value={form.passportDateOfIssue}
              onChange={e => set({ passportDateOfIssue: e.target.value })}
              data-testid="input-date-of-issue"
            />
          </div>
          <div>
            <Label>Date of expiry</Label>
            <Input
              type="date"
              value={form.passportDateOfExpiry}
              onChange={e => set({ passportDateOfExpiry: e.target.value })}
              data-testid="input-date-of-expiry"
            />
          </div>
          <div>
            <Label>Place of issue</Label>
            <Input
              value={form.passportPlaceOfIssue}
              onChange={e => set({ passportPlaceOfIssue: e.target.value })}
              data-testid="input-place-of-issue"
            />
          </div>
          <div className="md:col-span-2">
            <Label>Passport file URL</Label>
            <Input
              value={form.passportFileUrl}
              onChange={e => set({ passportFileUrl: e.target.value })}
              placeholder="https://… or data:image/png;base64,…"
              data-testid="input-file-url"
            />
            <div className="text-[11px] text-muted-foreground mt-1">
              Only http(s) links and inline image data URIs are accepted.
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={e => set({ notes: e.target.value })}
              rows={2}
              data-testid="input-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-passport"
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            data-testid="button-save-passport"
          >
            {mutation.isPending ? "Saving…" : (mode === "create" ? "Add passport" : "Save changes")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PassportCard({
  passport, tenantId, customerId,
}: {
  passport: Passport;
  tenantId: string;
  customerId: string;
}) {
  const { toast } = useToast();
  const [editOpen, setEditOpen] = useState(false);
  const fullName = [passport.passportSurname, passport.passportGivenName, passport.passportMiddleName]
    .filter(Boolean).join(" ");
  const holder = passport.holderName || fullName || "Unnamed";
  const rel = (passport.relationship as PassportRelationship) ?? "self";

  const deleteM = useMutation({
    mutationFn: async () => {
      return apiRequest(
        "DELETE",
        `/api/tenants/${tenantId}/customers/${customerId}/passports/${passport.id}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/tenants", tenantId, "customers", customerId],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/tenants", tenantId, "customers"],
      });
      toast({ title: "Passport removed" });
    },
    onError: (err: any) => {
      toast({
        title: "Couldn't delete passport",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="p-5" data-testid={`card-passport-${passport.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium" data-testid={`text-passport-holder-${passport.id}`}>
              {holder}
            </span>
            <Badge variant="outline" data-testid={`badge-relationship-${passport.id}`}>
              {RELATIONSHIP_LABELS[rel] ?? rel}
            </Badge>
            {passport.isPrimary && (
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <Star className="h-3 w-3 mr-1" /> Primary
              </Badge>
            )}
          </div>
          {passport.passportNumber && (
            <div className="text-xs text-muted-foreground font-mono mt-1">
              {passport.passportNumber}
              {passport.passportNationality && (
                <span className="text-muted-foreground/70"> · {passport.passportNationality}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditOpen(true)}
            data-testid={`button-edit-passport-${passport.id}`}
          >
            <Pencil className="h-3 w-3 mr-1" /> Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 hover:text-red-700"
                data-testid={`button-delete-passport-${passport.id}`}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remove this passport?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete the passport from {holder}'s record. Any
                  applications that referenced it will keep their own snapshot.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteM.mutate()}
                  className="bg-red-600 hover:bg-red-700"
                  data-testid={`button-confirm-delete-${passport.id}`}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <ExpiryBadge expiry={passport.passportDateOfExpiry} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-xs mt-3">
        {fullName && <Field label="Name on passport" value={fullName} />}
        <Field label="Passport #" value={passport.passportNumber} mono />
        <Field label="Nationality" value={passport.passportNationality} />
        <Field label="Gender" value={passport.passportGender} />
        <Field label="Date of birth" value={passport.passportDateOfBirth} />
        <Field label="Place of birth" value={passport.passportPlaceOfBirth} />
        <Field label="Date of issue" value={passport.passportDateOfIssue} />
        <Field label="Date of expiry" value={passport.passportDateOfExpiry} />
        <Field label="Place of issue" value={passport.passportPlaceOfIssue} />
      </div>
      {passport.notes && (
        <div className="mt-3 text-xs text-muted-foreground">
          <span className="uppercase tracking-wide text-[10px] mr-2">Notes</span>
          {passport.notes}
        </div>
      )}
      <div className="mt-3">
        <PassportFileLink rawUrl={passport.passportFileUrl} />
      </div>

      <PassportFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initial={{ ...passportToForm(passport), id: passport.id }}
        tenantId={tenantId}
        customerId={customerId}
      />
    </Card>
  );
}

// --- Main page ---

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const { data: authData } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;
  const [createOpen, setCreateOpen] = useState(false);
  const [aiSummary, setAiSummary] = useState("");
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryRan, setAiSummaryRan] = useState(false);

  async function fetchAiSummary() {
    if (!tenantId || !customerId) return;
    setAiSummaryLoading(true);
    try {
      const r = await fetch(`/api/tenants/${tenantId}/customers/${customerId}/ai-summary`, { method: "POST", credentials: "include" });
      if (!r.ok) throw new Error("Failed");
      const d = await r.json();
      setAiSummary(d.summary || "");
    } catch { setAiSummary("Could not generate summary."); }
    setAiSummaryLoading(false);
    setAiSummaryRan(true);
  }

  const { data, isLoading, error } = useQuery<CustomerDetailResponse>({
    queryKey: ["/api/tenants", tenantId, "customers", customerId],
    enabled: !!tenantId && !!customerId,
  });

  return (
    <DashboardLayout type="agency">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <Link href="/app/customers">
            <Button variant="ghost" size="sm" data-testid="button-back-customers">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to customers
            </Button>
          </Link>
        </div>

        {isLoading && (
          <Card className="p-6">
            <div className="animate-pulse text-sm text-muted-foreground">Loading customer…</div>
          </Card>
        )}
        {error && (
          <Card className="p-6">
            <div className="text-sm text-red-600">
              Couldn't load this customer. {(error as Error).message}
            </div>
          </Card>
        )}
        {data && tenantId && customerId && (
          <>
            <Card className="p-6" data-testid="card-customer-header">
              <div className="flex flex-wrap gap-4 items-start justify-between">
                <div className="flex gap-4 items-start">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback>
                      {initials(data.account.name, data.account.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl font-semibold" data-testid="text-customer-name">
                        {data.account.name || data.account.email}
                      </h1>
                      {data.account.isVerified && (
                        <Badge variant="outline" className="text-xs">
                          <BadgeCheck className="h-3 w-3 mr-1" /> Verified
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span data-testid="text-customer-email">{data.account.email}</span>
                      </span>
                      {data.account.phone && (
                        <span className="inline-flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span data-testid="text-customer-phone">{data.account.phone}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Joined {fmtDate(data.account.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Link href={`/app/cases/new?customerId=${customerId}`}>
                    <Button data-testid="button-create-application-from-customer">
                      <Briefcase className="h-4 w-4 mr-1" /> Create application
                    </Button>
                  </Link>
                  <Badge variant="outline" data-testid="badge-total-applications">
                    {data.cases.length} application{data.cases.length === 1 ? "" : "s"}
                  </Badge>
                  <Badge variant="outline" data-testid="badge-total-passports">
                    {data.passports.length} passport{data.passports.length === 1 ? "" : "s"}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* === AI Profile Summary === */}
            <Card className="p-4 border-[#4055FF]/20 bg-[#4055FF]/5 dark:bg-[#4055FF]/10">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <Brain className="w-4 h-4 text-[#4055FF]" />AI Profile Summary
                </h3>
                <button
                  onClick={fetchAiSummary}
                  disabled={aiSummaryLoading}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#4055FF] hover:underline disabled:opacity-50"
                >
                  {aiSummaryLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  {aiSummaryRan ? "Refresh" : "Generate"}
                </button>
              </div>
              {aiSummaryLoading && <p className="text-xs text-muted-foreground">Analysing customer profile…</p>}
              {!aiSummaryLoading && aiSummary && <p className="text-xs text-muted-foreground leading-relaxed">{aiSummary}</p>}
              {!aiSummaryRan && !aiSummaryLoading && <p className="text-xs text-muted-foreground">Click Generate for an AI overview of this customer's travel history, application status, and risk profile.</p>}
            </Card>

            {/* === Passport library === */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <BookUser className="h-5 w-5" /> Passport library
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Master record for this customer and their co-travellers.
                    Reused automatically across future applications.
                  </p>
                </div>
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-add-passport">
                      <Plus className="h-4 w-4 mr-1" /> Add passport
                    </Button>
                  </DialogTrigger>
                  <PassportFormDialog
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    mode="create"
                    initial={emptyPassportForm}
                    tenantId={tenantId}
                    customerId={customerId}
                  />
                </Dialog>
              </div>
              {data.passports.length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground" data-testid="empty-passports">
                  No passports stored yet. Add the customer's passport (and any
                  co-travellers' passports) so they can be reused across every
                  future application.
                </Card>
              ) : (
                <div className="grid gap-4">
                  {data.passports.map(p => (
                    <PassportCard
                      key={p.id}
                      passport={p}
                      tenantId={tenantId}
                      customerId={customerId}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* === Applications === */}
            <div>
              <h2 className="text-lg font-semibold mb-3">Applications</h2>
              {data.cases.length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground">
                  This customer has no applications yet.
                </Card>
              ) : (
                <div className="grid gap-4">
                  {data.cases.map((c) => (
                    <Card key={c.id} className="p-5" data-testid={`card-application-${c.id}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/app/cases/${c.id}`}>
                            <div className="flex items-center gap-2 hover:underline cursor-pointer">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium" data-testid={`text-application-number-${c.id}`}>
                                {c.caseNumber}
                              </span>
                              <ChevronRight className="h-3 w-3 text-muted-foreground" />
                            </div>
                          </Link>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Globe2 className="h-3 w-3" />
                              {c.destinationCountry}
                            </span>
                            <span>{c.visaType}</span>
                            <span>Applicant: {c.applicantName}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            className={STATUS_COLORS[c.status] ?? "bg-slate-100 text-slate-800"}
                            data-testid={`badge-status-${c.id}`}
                          >
                            {c.status.replace(/_/g, " ")}
                          </Badge>
                          {c.travelDate && (
                            <span className="text-xs text-muted-foreground">
                              Travel: {fmtDate(c.travelDate)}
                            </span>
                          )}
                          <Link href={`/app/cases/${c.id}`}>
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`button-open-application-${c.id}`}
                            >
                              Open application
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                      {c.passportNumber && (
                        <>
                          <Separator className="my-4" />
                          <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-2">
                            <span className="flex items-center gap-2">
                              <FileText className="h-3 w-3" /> Passport snapshot on this application
                            </span>
                            <span className="font-mono normal-case text-foreground">{c.passportNumber}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground italic">
                            Legacy snapshot stored when the application was created. Going forward, applications use the customer's passport library above.
                          </div>
                        </>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

// Surface unused import warnings cleanly
void UserIcon;
