import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, Check, Loader2, Plus, Save, Send, Trash2, Users,
  MapPin, FileText, User as UserIcon, Plane, ClipboardCheck, ListChecks,
  Search, X, CircleDot, DollarSign, Upload, ScanLine, AlertTriangle, RotateCcw,
  Calendar as CalendarIcon, Building2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CoTravellerRelationship, FeeTemplate, InvoiceSettings, Lead, AppointmentType, AppointmentStatus } from "@workspace/db";
import { CO_TRAVELLER_RELATIONSHIPS, APPOINTMENT_TYPES, APPOINTMENT_STATUSES } from "@/shared/schema-constants";
import { getDocumentChecklist, type DocumentRequirement } from "@/data/document-checklists";
import { getCountryVisaConfig } from "@/data/country-visa-types";
import { COUNTRIES, VISA_TYPES as GENERIC_VISA_TYPES } from "@/shared/destinations";

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

// Shape returned by POST /api/passport/scan
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
  warnings: string[];
};

type ScanStatus = "ok" | "warnings" | "not_passport";

// Existing typed value wins over OCR-extracted value.
function pickEmpty(current: string, incoming: string | null | undefined): string {
  return current && current.trim() ? current : (incoming ?? current);
}

// Classify a scan result so the UI can render success / amber-warning / red-not-passport
// without each call site re-implementing the heuristic.
function classifyScanResult(data: ScanResult): { status: ScanStatus; warnings: string[] } {
  const warnings = data.warnings ?? [];
  const looksLikeNonPassport = warnings.some((w) =>
    /not\s+a\s+passport|visa\s+sticker|entry\s+clearance|residence\s+permit|id\s+card|driver|driving\s+licen[cs]e|aadhaar|pan\s+card/i.test(w)
  );
  const noCoreFields = !data.surname && !data.givenName && !data.passportNumber;
  if (looksLikeNonPassport || noCoreFields) return { status: "not_passport", warnings };
  return { status: warnings.length > 0 ? "warnings" : "ok", warnings };
}

async function scanPassportApi(base64: string, mimeType: string): Promise<ScanResult> {
  const cleaned = base64.includes(",") ? base64.split(",").pop()! : base64;
  const res = await apiRequest("POST", "/api/passport/scan", { imageBase64: cleaned, mimeType });
  return (await res.json()) as ScanResult;
}

type AppointmentDraft = {
  key: string;
  appointmentType: AppointmentType | "";
  provider: string;
  location: string;
  scheduledAt: string; // datetime-local string ("YYYY-MM-DDTHH:mm")
  status: AppointmentStatus;
  notes: string;
};

function emptyAppointment(): AppointmentDraft {
  return {
    key: Math.random().toString(36).slice(2),
    appointmentType: "",
    provider: "",
    location: "",
    scheduledAt: "",
    status: "scheduled",
    notes: "",
  };
}

type CoTravellerDraft = {
  key: string;
  name: string;
  relationship: CoTravellerRelationship | "";
  dob: string;
  passportNumber: string;
  nationality: string;
  notes: string;
  // --- Per-row passport upload + scan state ---
  passportMode: "upload" | "manual";
  passportPageView: "first" | "last"; // which sub-page the agent is currently looking at
  passportPreview: string | null; // first page (bio) — also fed to OCR
  passportMimeType: string | null;
  passportLastPagePreview: string | null; // last page (address) — saved as attachment, not OCR'd
  passportLastPageMimeType: string | null;
  scanStatus: ScanStatus | null;
  scanWarnings: string[];
  scanError: string | null;
  scanning: boolean;
  nameTouched: boolean; // freeze auto-derived name once user types
  // --- Structured passport fields (auto-filled by scan, editable in either mode) ---
  passportSurname: string;
  passportGivenName: string;
  passportMiddleName: string;
  passportGender: "" | "M" | "F" | "X";
  passportDateOfIssue: string;
  passportDateOfExpiry: string;
  passportPlaceOfIssue: string;
  passportPlaceOfBirth: string;
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
    passportMode: "upload",
    passportPageView: "first",
    passportPreview: null,
    passportMimeType: null,
    passportLastPagePreview: null,
    passportLastPageMimeType: null,
    scanStatus: null,
    scanWarnings: [],
    scanError: null,
    scanning: false,
    nameTouched: false,
    passportSurname: "",
    passportGivenName: "",
    passportMiddleName: "",
    passportGender: "",
    passportDateOfIssue: "",
    passportDateOfExpiry: "",
    passportPlaceOfIssue: "",
    passportPlaceOfBirth: "",
  };
}

const STEPS = [
  { id: 1, title: "Destination & Visa", icon: MapPin },
  { id: 2, title: "Applicant", icon: UserIcon },
  { id: 3, title: "Travel Details", icon: Plane },
  { id: 4, title: "Co-Travellers", icon: Users },
  { id: 5, title: "Appointments", icon: CalendarIcon },
  { id: 6, title: "Documents", icon: ListChecks },
  { id: 7, title: "Fees", icon: DollarSign },
  { id: 8, title: "Review", icon: ClipboardCheck },
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

  // ── Lead pre-fill: when the wizard is opened from "Convert to Application" we
  // get a `?leadId=<id>` query param; the lead is fetched once here and
  // its name/email/phone/destination/visa are seeded into the form state.
  // After a successful case create the lead is PATCHed to stage="won".
  const queryParams = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
  const leadIdParam = queryParams.get("leadId");
  const seedVisaTypeParam = queryParams.get("visaType") ?? "";
  const seedDestinationParam = queryParams.get("destinationCountry") ?? "";
  const seedPriorityParam = queryParams.get("priority") ?? "";

  // Track whether we've already seeded the form from the lead so the user can
  // edit fields without us clobbering their changes when the query revalidates.
  const leadSeededRef = useRef(false);

  const [form, setForm] = useState({
    destinationCountry: "",
    visaType: "",
    applicantName: "",
    applicantDob: "",
    customerEmail: "",
    customerPhone: "",
    travelDate: "",
    priority: seedPriorityParam || "normal",
    notes: "",
    // Owning team member — every case must have one. Defaults to the
    // signed-in user (filled by an effect once auth resolves) but the agency
    // owner can hand it off to anyone on the team via the Step 1 dropdown.
    assignedTo: "",
    // Passport details (Indian passport standard)
    passportSurname: "",
    passportGivenName: "",
    passportMiddleName: "",
    passportNumber: "",
    passportNationality: "",
    passportGender: "" as "" | "M" | "F" | "X",
    passportDateOfIssue: "",
    passportDateOfExpiry: "",
    passportPlaceOfIssue: "",
    passportPlaceOfBirth: "",
    // Last step (Review) — how this application is being lodged. Drives
    // the initial visa-stage + sub-status when the case is created.
    submissionMethod: "" as "" | "evisa" | "embassy" | "vfs",
  });

  // Default assignee to the signed-in user once auth resolves. Only seeds
  // when the field is still empty so we never clobber a manual choice.
  useEffect(() => {
    const meId = authData?.user?.id;
    if (!meId) return;
    setForm((f) => (f.assignedTo ? f : { ...f, assignedTo: meId }));
  }, [authData?.user?.id]);

  // Team members for the assignee dropdown. Filtered to actual agency staff —
  // we never want to show customers in here.
  const { data: staffRaw = [] } = useQuery<any[]>({
    queryKey: ["/api/tenants", tenantId, "staff"],
    queryFn: async () => {
      const res = await fetch(`/api/tenants/${tenantId}/staff`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenantId,
  });
  const staff = useMemo(
    () => staffRaw
      .filter((u: any) => ["agency_owner", "agency_manager", "agency_staff"].includes(u.role))
      .map((u: any) => ({ id: u.id as string, name: u.name as string })),
    [staffRaw],
  );

  // Passport upload + auto-scan state
  const [passportMode, setPassportMode] = useState<"upload" | "manual">("upload");
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [passportMimeType, setPassportMimeType] = useState<string | null>(null);
  // Last page (address page) is an optional attachment — saved with the case
  // as a document but never sent to OCR.
  const [passportLastPagePreview, setPassportLastPagePreview] = useState<string | null>(null);
  const [passportLastPageMimeType, setPassportLastPageMimeType] = useState<string | null>(null);
  const passportLastPageFileRef = useRef<HTMLInputElement>(null);
  const [passportPageView, setPassportPageView] = useState<"first" | "last">("first");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanWarnings, setScanWarnings] = useState<string[]>([]);
  const [scanCompleted, setScanCompleted] = useState(false);
  // "ok" = clean extract, "warnings" = extracted but needs review,
  // "not_passport" = uploaded image is clearly not a passport bio page.
  const [scanStatus, setScanStatus] = useState<"ok" | "warnings" | "not_passport" | null>(null);
  // Tracks whether the user has manually edited the full applicant name. Once they
  // do, the auto-derive-from-passport-name effect stops touching it.
  const applicantNameTouchedRef = useRef(false);
  const passportFileRef = useRef<HTMLInputElement | null>(null);

  // Seed visa/destination from the convert-modal URL params on first mount —
  // these are independent from the lead fetch so they apply even before the
  // lead query resolves. Visa type depends on destinationCountry, so we only
  // set visaType if a destination was also provided.
  useEffect(() => {
    if (!seedDestinationParam && !seedVisaTypeParam) return;
    setForm((f) => {
      const next = { ...f };
      let changed = false;
      if (seedDestinationParam && !f.destinationCountry) {
        next.destinationCountry = seedDestinationParam;
        changed = true;
      }
      if (seedVisaTypeParam && !f.visaType) {
        next.visaType = seedVisaTypeParam;
        changed = true;
      }
      return changed ? next : f;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch the originating lead (if any) so step 1 can show the pre-filled
  // customer email + mobile. Only fires when ?leadId= is present in the URL.
  const { data: originatingLead } = useQuery<Lead>({
    queryKey: ["/api/leads", leadIdParam],
    enabled: !!leadIdParam,
  });

  // Pre-fill the form from the lead exactly once. Each field is only seeded
  // when its current value is empty so we never clobber what the user has
  // already typed.
  useEffect(() => {
    if (!originatingLead || leadSeededRef.current) return;
    leadSeededRef.current = true;
    setForm((f) => ({
      ...f,
      applicantName: f.applicantName || originatingLead.name || "",
      customerEmail: f.customerEmail || originatingLead.email || "",
      customerPhone: f.customerPhone || originatingLead.phone || "",
      destinationCountry: f.destinationCountry || originatingLead.destinationCountry || "",
      visaType: f.visaType || originatingLead.visaType || "",
      // Inherit the lead's owner so the case stays with the same agent unless
      // the user picks someone else explicitly.
      assignedTo: f.assignedTo || originatingLead.assignedTo || "",
    }));
    // The applicant name now has a real value, so the passport-name auto-derive
    // effect should leave it alone unless the agent clears it.
    if (originatingLead.name) applicantNameTouchedRef.current = true;
  }, [originatingLead]);

  // Auto-derive applicantName from "given-names + surname" — but only when the
  // user hasn't manually edited the applicant-name field.
  useEffect(() => {
    if (applicantNameTouchedRef.current) return;
    const derived = [form.passportGivenName, form.passportSurname]
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");
    if (!derived) return;
    setForm((f) => (f.applicantName === derived ? f : { ...f, applicantName: derived }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.passportGivenName, form.passportSurname]);

  const [coTravellers, setCoTravellers] = useState<CoTravellerDraft[]>([]);

  // === Appointments (Step 5) ===
  // Bookings to be created alongside the case (embassy, VFS, BLS, etc).
  // The appointments API needs a caseId, so we collect drafts here and POST
  // each one *after* the case is created in createCaseAndCompanions().
  const [appointmentDrafts, setAppointmentDrafts] = useState<AppointmentDraft[]>([]);
  const updateAppointment = (key: string, patch: Partial<AppointmentDraft>) =>
    setAppointmentDrafts((arr) => arr.map((a) => (a.key === key ? { ...a, ...patch } : a)));
  const removeAppointment = (key: string) =>
    setAppointmentDrafts((arr) => arr.filter((a) => a.key !== key));

  // Auto-derive each co-traveller's full name from their passport given-name +
  // surname — same rule as the applicant: skip rows the agent has manually
  // typed into. Returning the same array reference when nothing changes lets
  // React bail out of re-rendering, so this can't loop.
  useEffect(() => {
    setCoTravellers((arr) => {
      let changed = false;
      const next = arr.map((c) => {
        if (c.nameTouched) return c;
        const derived = [c.passportGivenName, c.passportSurname]
          .map((s) => s.trim())
          .filter(Boolean)
          .join(" ");
        if (!derived || c.name === derived) return c;
        changed = true;
        return { ...c, name: derived };
      });
      return changed ? next : arr;
    });
  }, [coTravellers]);

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

  // === Documents step: PER-PERSON checklist + attachments ===
  // The same tailored checklist is applied to the main applicant and to every
  // co-traveller. Each person has their own check map and their own files map,
  // so an attached photo for the applicant doesn't show up under a co-traveller.
  // Person key = "applicant" or coTraveller.key.
  type PersonKey = string;
  type DocFileAttachment = { dataUrl: string; mimeType: string; fileName: string };
  const APPLICANT_KEY: PersonKey = "applicant";
  const [docChecks, setDocChecks] = useState<Record<PersonKey, Record<string, boolean>>>({});
  const [docFiles, setDocFiles] = useState<Record<PersonKey, Record<string, DocFileAttachment | null>>>({});
  // Hidden <input type="file"> per (person, type).
  const docFileRefs = useRef<Record<PersonKey, Record<string, HTMLInputElement | null>>>({});
  // Tracks "we already auto-attached the bio page to this person's passport row".
  // Cleared when the user unchecks the row, so re-checking re-arms auto-attach.
  // Set when the user removes / replaces the file, so we don't fight the user.
  const autoAttachedPassportRef = useRef<Set<string>>(new Set());
  // Tracks which destination::visa signature we've seeded.
  const seededKeyRef = useRef<string>("");
  // Which person tab is currently visible in step 5.
  const [activeDocPerson, setActiveDocPerson] = useState<PersonKey>(APPLICANT_KEY);

  const { data: effectiveChecklist } = useQuery<{ checklist: DocumentRequirement[] }>({
    queryKey: ["/api/tenants", tenantId, "application-settings", "checklists", form.destinationCountry, form.visaType],
    queryFn: async () => {
      const qs = new URLSearchParams({ country: form.destinationCountry, visaType: form.visaType });
      const res = await fetch(`/api/tenants/${tenantId}/application-settings/checklists?${qs.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load document checklist");
      return res.json();
    },
    enabled: !!tenantId && !!form.destinationCountry && !!form.visaType,
  });

  const checklist = useMemo<DocumentRequirement[]>(
    () => effectiveChecklist?.checklist?.length ? effectiveChecklist.checklist : getDocumentChecklist(form.destinationCountry, form.visaType),
    [effectiveChecklist, form.destinationCountry, form.visaType],
  );

  // Stable list of person tabs. Includes the main applicant + every co-traveller
  // currently in the form, in display order.
  const docPersonTabs = useMemo(
    () => [
      { key: APPLICANT_KEY, label: form.applicantName.trim() || "Main applicant" },
      ...coTravellers.map((ct, i) => ({
        key: ct.key,
        label: ct.name.trim() || `Co-traveller ${i + 1}`,
      })),
    ],
    [form.applicantName, coTravellers],
  );
  // Stable signature so the sync effect below doesn't re-fire on label changes.
  const docPersonKeysSig = docPersonTabs.map((p) => p.key).join("|");

  // Per-(person,type) monotonically-increasing read tokens. We bump the token
  // for a slot whenever the user takes ANY action on it (new pick, clear,
  // uncheck, bulk action). FileReader.onload then no-ops if its captured
  // token is no longer current — avoids the race where a slow file-read
  // resurrects a slot the user just cleared.
  const docFileReadTokensRef = useRef<Record<PersonKey, Record<string, number>>>({});
  const bumpDocFileReadToken = (person: PersonKey, type: string) => {
    if (!docFileReadTokensRef.current[person]) docFileReadTokensRef.current[person] = {};
    const cur = docFileReadTokensRef.current[person][type] ?? 0;
    const next = cur + 1;
    docFileReadTokensRef.current[person][type] = next;
    return next;
  };
  const isCurrentDocFileReadToken = (person: PersonKey, type: string, token: number) =>
    (docFileReadTokensRef.current[person]?.[type] ?? 0) === token;

  const handleDocFile = (person: PersonKey, type: string, file: File | undefined) => {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      toast({ title: "Wrong file type", description: "Please upload an image (JPG/PNG/WebP) or a PDF.", variant: "destructive" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload a file under 8 MB.", variant: "destructive" });
      return;
    }
    // Capture the token for this read; if a later user action bumps it, our
    // onload becomes a no-op so a slow read can't resurrect cleared state.
    const myToken = bumpDocFileReadToken(person, type);
    const reader = new FileReader();
    reader.onload = () => {
      if (!isCurrentDocFileReadToken(person, type, myToken)) return;
      setDocFiles((d) => ({
        ...d,
        [person]: {
          ...(d[person] ?? {}),
          [type]: { dataUrl: reader.result as string, mimeType: file.type, fileName: file.name },
        },
      }));
      // The user just attached a real file — don't let auto-attach overwrite it.
      if (type === "passport") autoAttachedPassportRef.current.add(person);
    };
    reader.readAsDataURL(file);
  };

  // Pure file-clear helper. Does NOT touch autoAttachedPassportRef — the
  // caller decides whether this clear is a "user removed it" (set the flag
  // to block re-attach while still checked) or "row was unchecked / bulk
  // cleared" (delete from the flag to re-arm). Mixing the two would cause
  // the bug where bulk Clear permanently blocks auto-attach.
  const clearDocFile = (person: PersonKey, type: string) => {
    // Bump the read token so any pending FileReader.onload for this slot
    // becomes a no-op and can't resurrect the file we're about to clear.
    bumpDocFileReadToken(person, type);
    setDocFiles((d) => ({ ...d, [person]: { ...(d[person] ?? {}), [type]: null } }));
    const el = docFileRefs.current[person]?.[type];
    if (el) el.value = "";
  };

  // Seed default selections when destination/visa changes — wipes EVERY
  // person's checks/files since the underlying checklist itself changed.
  useEffect(() => {
    const key = `${form.destinationCountry}::${form.visaType}`;
    if (key === seededKeyRef.current) return;
    seededKeyRef.current = key;
    const seedRow: Record<string, boolean> = {};
    for (const req of checklist) seedRow[req.type] = req.required;
    setDocChecks(() => {
      const next: Record<PersonKey, Record<string, boolean>> = {};
      for (const p of docPersonTabs) next[p.key] = { ...seedRow };
      return next;
    });
    setDocFiles({});
    autoAttachedPassportRef.current.clear();
    // Bump every outstanding read token so any in-flight FileReader.onload
    // from the previous checklist can't resurrect a slot.
    for (const person of Object.keys(docFileReadTokensRef.current)) {
      for (const t of Object.keys(docFileReadTokensRef.current[person] ?? {})) {
        bumpDocFileReadToken(person, t);
      }
    }
    for (const personMap of Object.values(docFileRefs.current)) {
      for (const el of Object.values(personMap ?? {})) if (el) el.value = "";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.destinationCountry, form.visaType, checklist]);

  // Keep per-person state in sync as co-travellers are added / removed:
  // add a fresh seeded bucket for new persons, drop orphaned ones, and snap
  // the active tab back to the applicant if its person disappears.
  useEffect(() => {
    const validKeys = new Set(docPersonTabs.map((p) => p.key));
    const seedRow: Record<string, boolean> = {};
    for (const req of checklist) seedRow[req.type] = req.required;
    setDocChecks((prev) => {
      let changed = false;
      const next: typeof prev = {};
      for (const p of docPersonTabs) {
        if (prev[p.key]) {
          next[p.key] = prev[p.key];
        } else {
          next[p.key] = { ...seedRow };
          changed = true;
        }
      }
      for (const k of Object.keys(prev)) if (!validKeys.has(k)) changed = true;
      return changed ? next : prev;
    });
    setDocFiles((prev) => {
      let changed = false;
      const next: typeof prev = {};
      for (const k of Object.keys(prev)) {
        if (validKeys.has(k)) next[k] = prev[k];
        else changed = true;
      }
      return changed ? next : prev;
    });
    for (const k of Array.from(autoAttachedPassportRef.current)) {
      if (!validKeys.has(k)) autoAttachedPassportRef.current.delete(k);
    }
    if (!validKeys.has(activeDocPerson)) setActiveDocPerson(APPLICANT_KEY);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docPersonKeysSig, checklist]);

  // Auto-attach the previously-uploaded passport bio page to each person's
  // "passport" checklist row. Fires for a person when ALL of:
  //  • the destination/visa checklist actually contains a "passport" row,
  //  • that person's "passport" row is currently checked (so toggling the
  //    checkbox triggers a re-evaluation — we depend on docChecks below),
  //  • that person actually has a bio page uploaded in step 2 / step 4,
  //  • that person has no file already attached on this row,
  //  • `autoAttachedPassportRef` doesn't already mark this person — meaning
  //    we haven't auto-attached this session AND the user hasn't manually
  //    overridden it (they will set the flag via Remove / Replace).
  // Re-arming happens in the row's check-toggle handler and in the bulk
  // Clear / Reset / Select-all handlers (they DELETE from the Set), so
  // unchecking + re-checking always reattaches.
  useEffect(() => {
    const hasPassportRow = checklist.some((r) => r.type === "passport");
    if (!hasPassportRow) return;
    setDocFiles((prev) => {
      let changed = false;
      const next = { ...prev };
      const tryAttach = (
        person: PersonKey,
        preview: string | null,
        mime: string | null,
        label: string,
      ) => {
        if (!preview || !mime) return;
        // Only attach if the user has the passport row checked for this person.
        if (!docChecks[person]?.passport) return;
        if (autoAttachedPassportRef.current.has(person)) return;
        const existing = next[person]?.passport;
        if (existing) return;
        next[person] = {
          ...(next[person] ?? {}),
          passport: { dataUrl: preview, mimeType: mime, fileName: `${label} — bio page` },
        };
        autoAttachedPassportRef.current.add(person);
        changed = true;
      };
      tryAttach(APPLICANT_KEY, passportPreview, passportMimeType, "Applicant");
      for (const ct of coTravellers) {
        const lbl = ct.name.trim() || "Co-traveller";
        tryAttach(ct.key, ct.passportPreview, ct.passportMimeType, lbl);
      }
      return changed ? next : prev;
    });
  }, [passportPreview, passportMimeType, coTravellers, checklist, docChecks]);

  // === Per-step validation ===
  const stepError = (s: StepId): string | null => {
    if (s === 1) {
      if (!form.destinationCountry) return "Please select a destination country.";
      if (!form.visaType) return "Please select a visa type.";
      if (!form.assignedTo) return "Please assign a team member to this case.";
    }
    if (s === 2) {
      // Either passport surname+given-name OR free-text applicant name must be present.
      const hasPassportName = form.passportSurname.trim() && form.passportGivenName.trim();
      if (!hasPassportName && !form.applicantName.trim()) {
        return "Enter at least the surname and given name(s) from the passport (or upload the passport to auto-fill).";
      }
      if (form.applicantDob) {
        const dob = new Date(form.applicantDob);
        if (isNaN(dob.getTime())) return "Date of birth is invalid.";
        if (dob > new Date()) return "Date of birth cannot be in the future.";
      }
      // Date sanity for passport issue/expiry
      if (form.passportDateOfIssue && form.passportDateOfExpiry) {
        const di = new Date(form.passportDateOfIssue);
        const de = new Date(form.passportDateOfExpiry);
        if (!isNaN(di.getTime()) && !isNaN(de.getTime()) && de < di) {
          return "Passport expiry date cannot be earlier than the issue date.";
        }
      }
      if (form.passportDateOfIssue) {
        const di = new Date(form.passportDateOfIssue);
        if (isNaN(di.getTime())) return "Passport date of issue is invalid.";
        if (di > new Date()) return "Passport date of issue cannot be in the future.";
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
        const label = ct.name.trim() || "Unnamed co-traveller";
        if (!ct.name.trim() || !ct.relationship) {
          return "Each co-traveller needs a name and relationship.";
        }
        // Bio page upload is mandatory for every co-traveller — agencies need
        // a record of the actual passport image, regardless of whether the
        // structured fields were typed manually or auto-extracted.
        // (Wording includes "required" so handleSaveDraft can skip it — drafts
        // are allowed to be missing this; full submit still enforces it.)
        if (!ct.passportPreview) {
          return `Passport bio (first) page is required for co-traveller "${label}".`;
        }
        if (!ct.passportSurname.trim() || !ct.passportGivenName.trim()) {
          return `Passport surname and given name(s) are required for co-traveller "${label}".`;
        }
        if (ct.dob) {
          const d = new Date(ct.dob);
          if (isNaN(d.getTime())) return `Co-traveller "${label}" has an invalid date of birth.`;
          if (d > new Date()) return `Co-traveller "${label}" date of birth cannot be in the future.`;
        }
        if (ct.passportDateOfIssue && ct.passportDateOfExpiry) {
          const issue = new Date(ct.passportDateOfIssue);
          const expiry = new Date(ct.passportDateOfExpiry);
          if (!isNaN(issue.getTime()) && !isNaN(expiry.getTime()) && issue > expiry) {
            return `Co-traveller "${label}" passport: date of issue cannot be after date of expiry.`;
          }
        }
      }
    }
    // Step 5 (Appointments) — soft step. Allow zero appointments, but every
    // row that's been started needs a type, provider and a future-ish date.
    if (s === 5) {
      const now = Date.now();
      for (const a of appointmentDrafts) {
        const started = !!(a.appointmentType || a.provider.trim() || a.scheduledAt);
        if (!started) continue;
        if (!a.appointmentType) return "Each appointment needs a type (Embassy, VFS, BLS, or Other).";
        if (!a.provider.trim()) return "Each appointment needs a provider / centre name.";
        if (!a.scheduledAt) return "Each appointment needs a date and time.";
        const t = new Date(a.scheduledAt).getTime();
        if (isNaN(t)) return "An appointment has an invalid date/time.";
        // Allow up to 24h in the past so an agent can record a just-completed
        // appointment without having to fight the clock.
        if (t < now - 24 * 60 * 60 * 1000) {
          return "Appointment date/time can't be in the past.";
        }
      }
    }
    // Step 6 (Documents) has no hard validation — agency may onboard with empty checklist
    if (s === 7) {
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
    for (const s of [1, 2, 3, 4, 5, 6, 7] as StepId[]) {
      const err = stepError(s);
      if (err) return err;
    }
    return null;
  };

  const buildPayload = (status: "draft" | "pending") => {
    // Drafts never enter the visa workflow yet — only fully-submitted
    // applications get a submissionMethod + jump to the "processing" stage.
    const isSubmitted = status === "pending" && !!form.submissionMethod;
    const initialProcessingStatus = !isSubmitted ? null
      : form.submissionMethod === "evisa"   ? "submitted_evisa"
      : form.submissionMethod === "embassy" ? "submitted_embassy"
      : form.submissionMethod === "vfs"     ? "vfs_appointment_pending"
      : null;
    return {
      applicantName: form.applicantName.trim() || (status === "draft" ? "Untitled draft" : ""),
      applicantDob: form.applicantDob || null,
      customerEmail: form.customerEmail.trim() || null,
      customerPhone: form.customerPhone.trim() || null,
      passportSurname: form.passportSurname.trim() || null,
      passportGivenName: form.passportGivenName.trim() || null,
      passportMiddleName: form.passportMiddleName.trim() || null,
      passportNumber: form.passportNumber.trim() || null,
      passportNationality: form.passportNationality.trim() || null,
      passportGender: form.passportGender || null,
      passportDateOfIssue: form.passportDateOfIssue || null,
      passportDateOfExpiry: form.passportDateOfExpiry || null,
      passportPlaceOfIssue: form.passportPlaceOfIssue.trim() || null,
      passportPlaceOfBirth: form.passportPlaceOfBirth.trim() || null,
      visaType: form.visaType,
      destinationCountry: form.destinationCountry,
      travelDate: form.travelDate ? new Date(form.travelDate).toISOString() : null,
      priority: form.priority,
      notes: form.notes || null,
      // Send the picked team member; the server still validates that the user
      // belongs to this tenant and falls back to the session user if missing.
      assignedTo: form.assignedTo || null,
      status,
      caseNumber: generateCaseNumber(),
      // --- Visa workflow ---
      submissionMethod: form.submissionMethod || null,
      visaStage: isSubmitted ? "processing" : "not_started",
      visaProcessingStatus: initialProcessingStatus,
      visaStatusUpdatedAt: isSubmitted ? new Date().toISOString() : null,
    };
  };

  // Items currently checked for the active person (drives the count badge in
  // the step header + the "Documents Checklist" panel of the Review step).
  const selectedDocs = useMemo(
    () => {
      const personChecks = docChecks[activeDocPerson] ?? {};
      return checklist.filter((req) => personChecks[req.type]);
    },
    [checklist, docChecks, activeDocPerson],
  );
  // Total number of checked items across every person — surfaced in the Review
  // step so the agent sees the full footprint, not just the active tab.
  const totalSelectedDocsCount = useMemo(
    () => docPersonTabs.reduce(
      (n, p) => n + checklist.filter((r) => docChecks[p.key]?.[r.type]).length,
      0,
    ),
    [docPersonTabs, checklist, docChecks],
  );

  // Render the bulk-action toolbar + per-row checklist for a given person.
  // Defined here so it closes over the per-person state map and reuses the
  // same handlers (handleDocFile / clearDocFile / setDocChecks) for every tab.
  // Also handles the "auto-attach" UX: rows whose passport file came from the
  // step-2 / step-4 bio page get an "Auto from passport" badge instead of the
  // generic green "File attached" badge.
  const renderDocChecklistFor = (personKey: PersonKey, personLabel: string) => {
    const personChecks = docChecks[personKey] ?? {};
    const personFiles = docFiles[personKey] ?? {};
    const setPersonChecks = (updater: (prev: Record<string, boolean>) => Record<string, boolean>) => {
      setDocChecks((all) => ({ ...all, [personKey]: updater(all[personKey] ?? {}) }));
    };
    const ensureRefBucket = () => {
      if (!docFileRefs.current[personKey]) docFileRefs.current[personKey] = {};
      return docFileRefs.current[personKey]!;
    };
    const getInputEl = (type: string) => docFileRefs.current[personKey]?.[type] ?? null;
    // Bio-page preview for this person — used to flag which "passport"
    // attachments were auto-derived from the existing upload.
    const bioPagePreview = personKey === APPLICANT_KEY
      ? passportPreview
      : coTravellers.find((c) => c.key === personKey)?.passportPreview ?? null;

    return (
      <>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setPersonChecks(() => Object.fromEntries(checklist.map((r) => [r.type, true])));
              // Re-arm passport auto-attach: row is now checked, so the
              // effect should re-pre-fill the bio page on next render.
              autoAttachedPassportRef.current.delete(personKey);
            }}
            data-testid={`button-checklist-select-all-${personKey}`}
          >
            Select all
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPersonChecks(() => Object.fromEntries(checklist.map((r) => [r.type, r.required])));
              // Drop attachments for items that just became unchecked.
              setDocFiles((all) => {
                const personPrev = all[personKey] ?? {};
                const next: Record<string, DocFileAttachment | null> = {};
                for (const r of checklist) {
                  if (r.required) next[r.type] = personPrev[r.type] ?? null;
                }
                return { ...all, [personKey]: next };
              });
              // Always re-arm. If "passport" is required → checked → effect
              // will pre-fill it. If not → row stays unchecked → effect won't
              // attach (it gates on `personChecks[passport]`). Either way,
              // a later manual check should re-arm correctly.
              autoAttachedPassportRef.current.delete(personKey);
            }}
            data-testid={`button-checklist-reset-${personKey}`}
          >
            Reset to recommended
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPersonChecks(() => ({}));
              setDocFiles((all) => ({ ...all, [personKey]: {} }));
              const bucket = docFileRefs.current[personKey] ?? {};
              for (const el of Object.values(bucket)) if (el) el.value = "";
              // Bump tokens so any in-flight FileReader.onload from this
              // person's slots can't resurrect cleared state.
              for (const t of Object.keys(docFileReadTokensRef.current[personKey] ?? {})) {
                bumpDocFileReadToken(personKey, t);
              }
              // Re-arm: row is now unchecked → effect won't fire → but if
              // user later re-checks, it should auto-attach.
              autoAttachedPassportRef.current.delete(personKey);
            }}
            data-testid={`button-checklist-clear-${personKey}`}
          >
            Clear
          </Button>
        </div>
        <ul className="divide-y border rounded-xl overflow-hidden">
          {checklist.map((req) => {
            const checked = !!personChecks[req.type];
            const attached = personFiles[req.type] ?? null;
            const isAutoFromBio = !!(
              req.type === "passport" && attached && bioPagePreview && attached.dataUrl === bioPagePreview
            );
            return (
              <li
                key={req.type}
                className="p-3 bg-card hover:bg-muted/40 transition-colors space-y-2"
                data-testid={`checklist-row-${personKey}-${req.type}`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={`doc-${personKey}-${req.type}`}
                    checked={checked}
                    onCheckedChange={(v) => {
                      const nowChecked = v === true;
                      setPersonChecks((prev) => ({ ...prev, [req.type]: nowChecked }));
                      // For the passport row, re-arm the auto-attach Set on
                      // BOTH transitions: unchecked→checked (next render
                      // attaches) and checked→unchecked (next re-check
                      // attaches). On uncheck we also clear the file itself.
                      if (req.type === "passport") {
                        autoAttachedPassportRef.current.delete(personKey);
                      }
                      if (!nowChecked) clearDocFile(personKey, req.type);
                    }}
                    className="mt-0.5"
                    data-testid={`checkbox-doc-${personKey}-${req.type}`}
                  />
                  <label htmlFor={`doc-${personKey}-${req.type}`} className="flex-1 cursor-pointer space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{req.name}</span>
                      {req.required ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Recommended</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">Optional</Badge>
                      )}
                      {attached && !isAutoFromBio && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-emerald-600 hover:bg-emerald-600">
                          File attached
                        </Badge>
                      )}
                      {attached && isAutoFromBio && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-sky-600 hover:bg-sky-600">
                          Auto from passport
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{req.description}</p>
                  </label>
                </div>

                {checked && (
                  <div className="ml-7 flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      ref={(el) => { ensureRefBucket()[req.type] = el; }}
                      onChange={(e) => {
                        handleDocFile(personKey, req.type, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                      data-testid={`input-doc-file-${personKey}-${req.type}`}
                    />
                    {attached ? (
                      <>
                        {attached.mimeType.startsWith("image/") ? (
                          <img
                            src={attached.dataUrl}
                            alt=""
                            className="h-9 w-9 rounded object-cover border"
                            data-testid={`img-doc-thumb-${personKey}-${req.type}`}
                          />
                        ) : (
                          <div className="h-9 w-9 rounded border bg-muted flex items-center justify-center">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="text-xs truncate max-w-[180px]" data-testid={`text-doc-filename-${personKey}-${req.type}`}>
                          {attached.fileName}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 h-7 text-xs"
                          onClick={() => getInputEl(req.type)?.click()}
                          data-testid={`button-doc-replace-${personKey}-${req.type}`}
                        >
                          <Upload className="w-3 h-3" /> Replace
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="gap-1 h-7 text-xs text-muted-foreground"
                          onClick={() => {
                            clearDocFile(personKey, req.type);
                            // User explicitly removed the file while the row
                            // is still checked — block auto-attach from
                            // putting it back. Re-arms when row is unchecked
                            // and re-checked, or when bulk Clear/Reset runs.
                            if (req.type === "passport") {
                              autoAttachedPassportRef.current.add(personKey);
                            }
                          }}
                          data-testid={`button-doc-remove-${personKey}-${req.type}`}
                        >
                          <X className="w-3 h-3" /> Remove
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-7 text-xs"
                        onClick={() => getInputEl(req.type)?.click()}
                        data-testid={`button-doc-attach-${personKey}-${req.type}`}
                      >
                        <Upload className="w-3 h-3" /> Attach file
                        <span className="text-muted-foreground font-normal">· optional</span>
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          Showing checklist for <span className="font-medium text-foreground">{personLabel}</span>. Items left unchecked won't be added to the case for this person — you can always edit them later from the case detail page.
        </p>
      </>
    );
  };

  const createCaseAndCompanions = async (status: "draft" | "pending") => {
    if (!tenantId) throw new Error("Not signed in");
    const res = await apiRequest("POST", `/api/tenants/${tenantId}/cases`, buildPayload(status));
    const created = await res.json();

    // If we came in from a lead, mark it as won so it leaves the open pipeline.
    // We fail-open here — the case was created successfully and we don't want
    // the lead-stage update to block the user's redirect to the case detail
    // page. We do surface a non-blocking warning so the agent knows the lead
    // may still be in its previous stage and can fix it manually.
    if (leadIdParam) {
      try {
        await apiRequest("PATCH", `/api/leads/${leadIdParam}`, { stage: "won" });
        queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "leads"] });
      } catch (err) {
        console.warn("[case-new] could not mark originating lead as won:", err);
        toast({
          title: "Lead stage not updated",
          description: "Case was created, but the originating lead could not be marked as won. Please update its stage manually.",
          variant: "destructive",
        });
      }
    }

    // Helper: upload a file as a document record on the new case. Sized payloads
    // (passport pages, checklist attachments) all flow through here so the
    // 12 MB body-limit override on /api/cases/:id/documents is the only ceiling.
    const uploadDocument = async (doc: {
      name: string;
      type: string;
      fileUrl?: string | null;
      status?: string;
      notes?: string | null;
    }) => {
      await apiRequest("POST", `/api/cases/${created.id}/documents`, {
        tenantId: created.tenantId,
        name: doc.name,
        type: doc.type,
        status: doc.status ?? "pending",
        fileUrl: doc.fileUrl ?? null,
        notes: doc.notes ?? null,
      });
    };

    // Applicant passport pages — saved as document attachments after case creation
    // so they don't bloat the main case-create body (which uses the 1 MB limit).
    if (passportPreview) {
      try {
        await uploadDocument({
          name: "Passport — Bio Page (First)",
          type: "passport_first_page",
          status: "approved",
          fileUrl: passportPreview,
          notes: "Uploaded with the application",
        });
      } catch (err: any) {
        toast({ title: "Could not save passport bio page", description: err?.message ?? "Unknown error", variant: "destructive" });
      }
    }
    if (passportLastPagePreview) {
      try {
        await uploadDocument({
          name: "Passport — Address Page (Last)",
          type: "passport_last_page",
          status: "approved",
          fileUrl: passportLastPagePreview,
          notes: "Uploaded with the application",
        });
      } catch (err: any) {
        toast({ title: "Could not save passport address page", description: err?.message ?? "Unknown error", variant: "destructive" });
      }
    }

    for (const ct of coTravellers) {
      try {
        await apiRequest("POST", `/api/cases/${created.id}/co-travellers`, {
          name: ct.name.trim(),
          relationship: ct.relationship,
          dob: ct.dob || null,
          passportNumber: ct.passportNumber.trim() || null,
          nationality: ct.nationality.trim() || null,
          passportSurname: ct.passportSurname.trim() || null,
          passportGivenName: ct.passportGivenName.trim() || null,
          passportMiddleName: ct.passportMiddleName.trim() || null,
          passportGender: ct.passportGender || null,
          passportDateOfIssue: ct.passportDateOfIssue || null,
          passportDateOfExpiry: ct.passportDateOfExpiry || null,
          passportPlaceOfIssue: ct.passportPlaceOfIssue.trim() || null,
          passportPlaceOfBirth: ct.passportPlaceOfBirth.trim() || null,
          notes: ct.notes.trim() || null,
        });
      } catch (err: any) {
        toast({
          title: `Could not save co-traveller "${ct.name}"`,
          description: err?.message ?? "Unknown error",
          variant: "destructive",
        });
      }

      // Per-co-traveller passport pages → also stored as document records,
      // tagged in `notes` with the companion's name so the case Document Center
      // can show them grouped.
      const ctLabel = ct.name.trim() || "Co-traveller";
      if (ct.passportPreview) {
        try {
          await uploadDocument({
            name: `Passport — Bio Page (${ctLabel})`,
            type: "passport_first_page",
            status: "approved",
            fileUrl: ct.passportPreview,
            notes: `Co-traveller: ${ctLabel}`,
          });
        } catch (err: any) {
          toast({ title: `Could not save bio page for ${ctLabel}`, description: err?.message ?? "Unknown error", variant: "destructive" });
        }
      }
      if (ct.passportLastPagePreview) {
        try {
          await uploadDocument({
            name: `Passport — Address Page (${ctLabel})`,
            type: "passport_last_page",
            status: "approved",
            fileUrl: ct.passportLastPagePreview,
            notes: `Co-traveller: ${ctLabel}`,
          });
        } catch (err: any) {
          toast({ title: `Could not save address page for ${ctLabel}`, description: err?.message ?? "Unknown error", variant: "destructive" });
        }
      }
    }

    // Persist document checklist — once per person (applicant + each
    // co-traveller). For each person, we walk THEIR checked items and post
    // the file they attached (or "pending" + null if they left it empty).
    // Per-person notes carry the person's label so the case Document Center
    // can group them just like the passport bio/last-page records do.
    //
    // De-dup rule: if the "passport" checklist row was auto-attached with the
    // exact bio-page image already saved above as `passport_first_page`,
    // we skip the duplicate post. The agent can still post a different file
    // (e.g. full passport scan) by replacing the auto-attached one.
    for (const tab of docPersonTabs) {
      const personChecks = docChecks[tab.key] ?? {};
      const personFiles = docFiles[tab.key] ?? {};
      const isApplicant = tab.key === APPLICANT_KEY;
      const ct = isApplicant ? null : coTravellers.find((c) => c.key === tab.key);
      const bioPagePreview = isApplicant ? passportPreview : ct?.passportPreview ?? null;

      for (const req of checklist) {
        if (!personChecks[req.type]) continue;
        const file = personFiles[req.type] ?? null;

        // Skip the "passport" checklist row if its file is identical to the
        // bio page we already persisted as passport_first_page.
        if (req.type === "passport" && file && bioPagePreview && file.dataUrl === bioPagePreview) {
          continue;
        }

        const notesPrefix = isApplicant ? "" : `Co-traveller: ${tab.label} · `;
        const namePrefix = isApplicant ? "" : `${tab.label} — `;
        try {
          await uploadDocument({
            name: `${namePrefix}${req.name}`,
            type: req.type,
            status: file ? "approved" : "pending",
            fileUrl: file ? file.dataUrl : null,
            notes: `${notesPrefix}${req.description}`,
          });
        } catch (err: any) {
          toast({
            title: `Could not add "${req.name}" for ${tab.label}`,
            description: err?.message ?? "Unknown error",
            variant: "destructive",
          });
        }
      }
    }

    // Persist appointments collected in Step 5. Each one is an independent
    // POST so a single failure doesn't take down the others — we surface a
    // toast per failure and keep going (the case is already created).
    for (const a of appointmentDrafts) {
      const started = !!(a.appointmentType || a.provider.trim() || a.scheduledAt);
      if (!started) continue;
      // Defensive: skip incomplete rows on draft saves where validation is soft.
      if (!a.appointmentType || !a.provider.trim() || !a.scheduledAt) continue;
      try {
        await apiRequest("POST", `/api/cases/${created.id}/appointments`, {
          appointmentType: a.appointmentType,
          provider: a.provider.trim(),
          location: a.location.trim() || null,
          scheduledAt: new Date(a.scheduledAt).toISOString(),
          status: a.status,
          notes: a.notes.trim() || null,
        });
      } catch (err: any) {
        toast({
          title: "Could not save appointment",
          description: `${a.provider || "Appointment"}: ${err?.message ?? "Unknown error"}`,
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
          customerEmail: form.customerEmail.trim() || null,
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

  // === Passport scan mutation (Claude vision OCR) ===
  // Uses module-level helpers `scanPassportApi`, `classifyScanResult`, `pickEmpty`
  // so applicant + co-traveller scan flows share one source of truth for the
  // not-a-passport heuristic. Don't re-implement the regex inline here.
  const scanPassportMutation = useMutation({
    mutationFn: async () => {
      if (!passportPreview || !passportMimeType) {
        throw new Error("Choose a passport image first.");
      }
      return scanPassportApi(passportPreview, passportMimeType);
    },
    onSuccess: (data) => {
      const { status, warnings } = classifyScanResult(data);

      if (status === "not_passport") {
        // Don't pollute the form with values harvested from the wrong document
        // (e.g. visa-sticker dates would silently overwrite passport dates).
        setScanWarnings(warnings);
        setScanError(null);
        setScanStatus("not_passport");
        setScanCompleted(true);
        toast({
          title: "Doesn't look like a passport",
          description: "Please upload the passport biographic page (the photo page).",
          variant: "destructive",
        });
        return;
      }

      setForm((f) => ({
        ...f,
        passportSurname: pickEmpty(f.passportSurname, data.surname),
        passportGivenName: pickEmpty(f.passportGivenName, data.givenName),
        passportMiddleName: pickEmpty(f.passportMiddleName, data.middleName),
        passportNumber: pickEmpty(f.passportNumber, data.passportNumber),
        passportNationality: pickEmpty(f.passportNationality, data.nationality),
        passportGender: (f.passportGender || data.gender || "") as "" | "M" | "F" | "X",
        applicantDob: pickEmpty(f.applicantDob, data.dateOfBirth),
        passportDateOfIssue: pickEmpty(f.passportDateOfIssue, data.dateOfIssue),
        passportDateOfExpiry: pickEmpty(f.passportDateOfExpiry, data.dateOfExpiry),
        passportPlaceOfIssue: pickEmpty(f.passportPlaceOfIssue, data.placeOfIssue),
        passportPlaceOfBirth: pickEmpty(f.passportPlaceOfBirth, data.placeOfBirth),
      }));
      setScanWarnings(warnings);
      setScanError(null);
      setScanStatus(status);
      setScanCompleted(true);
      toast({
        title: "Passport scanned",
        description: warnings.length > 0
          ? "Details extracted, but some fields need a manual review."
          : "Details extracted. Please review before continuing.",
      });
    },
    onError: (err: Error) => {
      setScanError(err.message);
      setScanCompleted(false);
      setScanStatus(null);
    },
  });

  const submitMutation = useMutation({
    mutationFn: () => createCaseAndCompanions("pending"),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tenants", tenantId, "visa-cases"] });
      toast({ title: "Application created", description: `Case ${created.caseNumber} is ready.` });
      // Land on the case detail page — that's where the PDF + email actions live.
      setLocation(`/app/cases/${created.id}?submitted=1`);
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
    for (const s of [2, 3, 4, 5, 7] as StepId[]) {
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

  // Keeps a hidden <input type="file"> per row so each card has its own picker.
  const coTravellerFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const coTravellerLastPageFileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleCoTravellerFile = (key: string, page: "first" | "last", file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Wrong file type", description: "Please upload an image file (JPG/PNG/WebP).", variant: "destructive" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image under 8 MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCoTravellers((arr) => arr.map((c) => {
        if (c.key !== key) return c;
        if (page === "first") {
          return {
            ...c,
            passportPreview: reader.result as string,
            passportMimeType: file.type,
            scanStatus: null,
            scanWarnings: [],
            scanError: null,
          };
        }
        return {
          ...c,
          passportLastPagePreview: reader.result as string,
          passportLastPageMimeType: file.type,
        };
      }));
    };
    reader.readAsDataURL(file);
  };

  const scanCoTravellerPassport = async (key: string) => {
    const target = coTravellers.find((c) => c.key === key);
    if (!target?.passportPreview || !target.passportMimeType) {
      toast({ title: "Choose an image first", description: "Upload the passport bio page before scanning.", variant: "destructive" });
      return;
    }
    setCoTravellers((arr) => arr.map((c) => c.key === key ? { ...c, scanning: true, scanError: null } : c));
    try {
      const data = await scanPassportApi(target.passportPreview, target.passportMimeType);
      const { status, warnings } = classifyScanResult(data);

      if (status === "not_passport") {
        // Don't auto-fill — visa-sticker dates etc. would silently overwrite real fields.
        setCoTravellers((arr) => arr.map((c) => c.key === key ? {
          ...c, scanning: false, scanStatus: "not_passport", scanWarnings: warnings, scanError: null,
        } : c));
        toast({
          title: "Doesn't look like a passport",
          description: "Please upload the co-traveller's passport biographic page (the photo page).",
          variant: "destructive",
        });
        return;
      }

      setCoTravellers((arr) => arr.map((c) => {
        if (c.key !== key) return c;
        const newSurname = pickEmpty(c.passportSurname, data.surname);
        const newGiven = pickEmpty(c.passportGivenName, data.givenName);
        const derivedName = [newGiven, newSurname].map((s) => s.trim()).filter(Boolean).join(" ");
        return {
          ...c,
          scanning: false,
          scanStatus: status,
          scanWarnings: warnings,
          scanError: null,
          passportSurname: newSurname,
          passportGivenName: newGiven,
          passportMiddleName: pickEmpty(c.passportMiddleName, data.middleName),
          passportNumber: pickEmpty(c.passportNumber, data.passportNumber),
          nationality: pickEmpty(c.nationality, data.nationality),
          passportGender: (c.passportGender || data.gender || "") as "" | "M" | "F" | "X",
          dob: pickEmpty(c.dob, data.dateOfBirth),
          passportDateOfIssue: pickEmpty(c.passportDateOfIssue, data.dateOfIssue),
          passportDateOfExpiry: pickEmpty(c.passportDateOfExpiry, data.dateOfExpiry),
          passportPlaceOfIssue: pickEmpty(c.passportPlaceOfIssue, data.placeOfIssue),
          passportPlaceOfBirth: pickEmpty(c.passportPlaceOfBirth, data.placeOfBirth),
          // Only freeze the displayed Full Name if the agent has actually typed
          // into it. A previous OCR-derived value is still allowed to be
          // overwritten by a fresher re-scan, mirroring applicant-step semantics.
          name: c.nameTouched ? c.name : (derivedName || c.name),
        };
      }));
      toast({
        title: "Co-traveller passport scanned",
        description: warnings.length > 0
          ? "Details extracted, but some fields need a manual review."
          : "Details extracted. Please review before continuing.",
      });
    } catch (err: any) {
      setCoTravellers((arr) => arr.map((c) => c.key === key ? {
        ...c, scanning: false, scanError: err?.message ?? "Scan failed", scanStatus: null,
      } : c));
    }
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-email">Customer Email</Label>
                    <Input
                      id="customer-email"
                      type="email"
                      placeholder="customer@example.com"
                      value={form.customerEmail}
                      onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                      data-testid="input-customer-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-phone">Customer Mobile</Label>
                    <Input
                      id="customer-phone"
                      type="tel"
                      placeholder="+1 234 567 8900"
                      value={form.customerPhone}
                      onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                      data-testid="input-customer-phone"
                    />
                  </div>
                </div>
                {leadIdParam && (
                  <p className="text-xs text-muted-foreground -mt-2">
                    Pre-filled from the originating lead — edit if needed before continuing.
                  </p>
                )}

                <div className="space-y-2">
                  <Label htmlFor="case-assignee">Assigned Team Member *</Label>
                  <Select
                    value={form.assignedTo}
                    onValueChange={(v) => setForm({ ...form, assignedTo: v })}
                  >
                    <SelectTrigger id="case-assignee" data-testid="select-case-assignee">
                      <SelectValue placeholder="Select a team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{s.id === authData?.user?.id ? " (you)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Defaults to you — pick another team member to hand off this case.
                  </p>
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
                    <SelectContent className="max-h-80">
                      {(() => {
                        const cfg = form.destinationCountry ? getCountryVisaConfig(form.destinationCountry) : null;
                        if (cfg) {
                          // Render category-grouped visa types for countries with a structured
                          // classification (US: B1/B2, H-1B, L-1, etc.; UK; Schengen A/C/D; …).
                          return Object.entries(cfg.categories).map(([catLabel, cat]) => (
                            <SelectGroup key={catLabel}>
                              <SelectLabel>{catLabel}</SelectLabel>
                              {cat.types.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectGroup>
                          ));
                        }
                        return GENERIC_VISA_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ));
                      })()}
                    </SelectContent>
                  </Select>
                  {form.destinationCountry && (
                    <p className="text-xs text-muted-foreground">
                      {getCountryVisaConfig(form.destinationCountry)
                        ? `Showing official visa categories for ${form.destinationCountry}.`
                        : `No structured visa list yet for ${form.destinationCountry} — pick the closest generic category.`}
                    </p>
                  )}
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
                  Upload the passport bio page to auto-fill, or enter the details manually. Indian passport layout (Surname / Given Names) is supported.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Tabs value={passportMode} onValueChange={(v) => setPassportMode(v as "upload" | "manual")}>
                  <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                    <TabsTrigger value="upload" className="gap-2" data-testid="tab-passport-upload">
                      <Upload className="w-4 h-4" /> Upload passport
                    </TabsTrigger>
                    <TabsTrigger value="manual" className="gap-2" data-testid="tab-passport-manual">
                      <FileText className="w-4 h-4" /> Enter manually
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="upload" className="space-y-4 mt-4">
                    {/* Sub-toggle: First Page (Bio) — mandatory + scannable / Last Page (Address) — optional */}
                    <Tabs value={passportPageView} onValueChange={(v) => setPassportPageView(v as "first" | "last")}>
                      <TabsList className="grid grid-cols-2 w-full sm:w-auto h-9">
                        <TabsTrigger value="first" className="gap-1.5 text-xs" data-testid="tab-passport-page-first">
                          First Page (Bio / Photo)
                          <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-1">Required</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="last" className="gap-1.5 text-xs" data-testid="tab-passport-page-last">
                          Last Page (Address)
                          <Badge variant="outline" className="h-4 px-1 text-[9px] ml-1">Optional</Badge>
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="first" className="space-y-4 mt-3">
                    <div
                      className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center bg-muted/20 hover:bg-muted/30 transition cursor-pointer"
                      onClick={() => passportFileRef.current?.click()}
                      data-testid="dropzone-passport"
                    >
                      {passportPreview ? (
                        <img
                          src={passportPreview}
                          alt="Passport bio page preview"
                          className="max-h-56 rounded-md shadow-sm object-contain"
                          data-testid="img-passport-preview"
                        />
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-sm font-medium">Click to choose the bio page</p>
                          <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or WebP · up to 8 MB · the page with the photo, surname and given name(s)</p>
                        </>
                      )}
                      <input
                        ref={passportFileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 8 * 1024 * 1024) {
                            toast({ title: "File too large", description: "Please upload an image under 8 MB.", variant: "destructive" });
                            return;
                          }
                          setScanError(null);
                          setScanWarnings([]);
                          setScanCompleted(false);
                          setScanStatus(null);
                          setPassportMimeType(file.type);
                          const reader = new FileReader();
                          reader.onload = () => {
                            setPassportPreview(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }}
                        data-testid="input-passport-file"
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => scanPassportMutation.mutate()}
                        disabled={!passportPreview || scanPassportMutation.isPending}
                        className="gap-2"
                        data-testid="button-scan-passport"
                      >
                        {scanPassportMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <ScanLine className="w-4 h-4" />
                        )}
                        {scanCompleted ? "Re-scan passport" : "Scan & extract details"}
                      </Button>
                      {passportPreview && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setPassportPreview(null);
                            setPassportMimeType(null);
                            setScanError(null);
                            setScanWarnings([]);
                            setScanCompleted(false);
                            setScanStatus(null);
                            if (passportFileRef.current) passportFileRef.current.value = "";
                          }}
                          className="gap-2"
                          data-testid="button-remove-passport"
                        >
                          <X className="w-4 h-4" /> Remove image
                        </Button>
                      )}
                    </div>

                    {scanError && (
                      <div className="flex items-start gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md p-3" data-testid="text-scan-error">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">Couldn't auto-scan this passport</p>
                          <p className="text-xs mt-0.5">{scanError}</p>
                          <button
                            type="button"
                            className="text-xs underline mt-1 text-destructive hover:opacity-80"
                            onClick={() => setPassportMode("manual")}
                            data-testid="button-switch-to-manual"
                          >
                            Switch to manual entry
                          </button>
                        </div>
                      </div>
                    )}

                    {scanCompleted && !scanError && scanStatus === "not_passport" && (
                      <div className="flex items-start gap-2 text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-md p-3" data-testid="text-scan-not-passport">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-medium">This doesn't look like a passport biographic page.</p>
                          <p className="text-xs">
                            Please upload the <span className="font-medium">passport bio page</span> — the page with the holder's photo, surname and given name(s). Visa stickers, entry-clearance pages, ID cards or other documents won't work here.
                          </p>
                          {scanWarnings.length > 0 && (
                            <ul className="list-disc list-inside text-xs">
                              {scanWarnings.map((w, i) => <li key={i}>{w}</li>)}
                            </ul>
                          )}
                          <button
                            type="button"
                            className="text-xs underline mt-1 text-destructive hover:opacity-80"
                            onClick={() => setPassportMode("manual")}
                            data-testid="button-switch-to-manual-not-passport"
                          >
                            Or enter the details manually
                          </button>
                        </div>
                      </div>
                    )}

                    {scanCompleted && !scanError && scanStatus === "warnings" && (
                      <div className="flex items-start gap-2 text-sm border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 rounded-md p-3" data-testid="text-scan-warnings">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        <div className="space-y-1">
                          <p className="font-medium text-amber-900 dark:text-amber-100">Passport scanned — please double-check the highlighted items.</p>
                          <ul className="list-disc list-inside text-xs text-amber-800 dark:text-amber-200">
                            {scanWarnings.map((w, i) => <li key={i}>{w}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}

                    {scanCompleted && !scanError && scanStatus === "ok" && (
                      <div className="flex items-start gap-2 text-sm border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800/50 rounded-md p-3" data-testid="text-scan-success">
                        <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        <div className="space-y-1">
                          <p className="font-medium text-emerald-800 dark:text-emerald-200">Passport details extracted. Review the fields below before continuing.</p>
                        </div>
                      </div>
                    )}
                      </TabsContent>

                      <TabsContent value="last" className="space-y-3 mt-3">
                        <div
                          className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center bg-muted/20 hover:bg-muted/30 transition cursor-pointer"
                          onClick={() => passportLastPageFileRef.current?.click()}
                          data-testid="dropzone-passport-last-page"
                        >
                          {passportLastPagePreview ? (
                            <img
                              src={passportLastPagePreview}
                              alt="Passport address page preview"
                              className="max-h-56 rounded-md shadow-sm object-contain"
                              data-testid="img-passport-last-page-preview"
                            />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                              <p className="text-sm font-medium">Click to choose the address page</p>
                              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or WebP · up to 8 MB · the back of the passport (address, parents' names, file number)</p>
                            </>
                          )}
                          <input
                            ref={passportLastPageFileRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (file.size > 8 * 1024 * 1024) {
                                toast({ title: "File too large", description: "Please upload an image under 8 MB.", variant: "destructive" });
                                return;
                              }
                              setPassportLastPageMimeType(file.type);
                              const reader = new FileReader();
                              reader.onload = () => setPassportLastPagePreview(reader.result as string);
                              reader.readAsDataURL(file);
                            }}
                            data-testid="input-passport-last-page-file"
                          />
                        </div>

                        {passportLastPagePreview && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => {
                                setPassportLastPagePreview(null);
                                setPassportLastPageMimeType(null);
                                if (passportLastPageFileRef.current) passportLastPageFileRef.current.value = "";
                              }}
                              className="gap-2"
                              data-testid="button-remove-passport-last-page"
                            >
                              <X className="w-4 h-4" /> Remove image
                            </Button>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          Optional. Saved as an attachment alongside the case — not used for OCR.
                        </p>
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="manual" className="mt-4">
                    <p className="text-xs text-muted-foreground mb-3">
                      Type details exactly as printed on the passport bio page.
                    </p>
                  </TabsContent>
                </Tabs>

                {/* === Passport detail fields (visible in both modes; populated by scan in upload mode) === */}
                <div className="space-y-4 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <UserIcon className="w-4 h-4" /> Passport details
                    </h3>
                    {(form.passportSurname || form.passportGivenName || form.passportNumber) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs h-7"
                        onClick={() => {
                          setForm((f) => ({
                            ...f,
                            applicantName: "",
                            applicantDob: "",
                            passportSurname: "",
                            passportGivenName: "",
                            passportMiddleName: "",
                            passportNumber: "",
                            passportNationality: "",
                            passportGender: "",
                            passportDateOfIssue: "",
                            passportDateOfExpiry: "",
                            passportPlaceOfIssue: "",
                            passportPlaceOfBirth: "",
                          }));
                          setScanCompleted(false);
                          setScanWarnings([]);
                          setScanStatus(null);
                        }}
                        data-testid="button-clear-passport-fields"
                      >
                        <RotateCcw className="w-3 h-3" /> Clear all
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="passportSurname">Surname *</Label>
                      <Input
                        id="passportSurname"
                        value={form.passportSurname}
                        onChange={(e) => setForm({ ...form, passportSurname: e.target.value.toUpperCase() })}
                        placeholder="KUMAR"
                        data-testid="input-passport-surname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passportGivenName">Given Name(s) *</Label>
                      <Input
                        id="passportGivenName"
                        value={form.passportGivenName}
                        onChange={(e) => setForm({ ...form, passportGivenName: e.target.value.toUpperCase() })}
                        placeholder="RAHUL PRATAP"
                        data-testid="input-passport-given-name"
                      />
                      <p className="text-xs text-muted-foreground">As printed in the "Given Name(s)" field — include any middle names here.</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="passportNumber">Passport number</Label>
                      <Input
                        id="passportNumber"
                        value={form.passportNumber}
                        onChange={(e) => setForm({ ...form, passportNumber: e.target.value.toUpperCase().replace(/\s+/g, "") })}
                        placeholder="A1234567"
                        data-testid="input-passport-number"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passportNationality">Nationality</Label>
                      <Input
                        id="passportNationality"
                        value={form.passportNationality}
                        onChange={(e) => setForm({ ...form, passportNationality: e.target.value })}
                        placeholder="Indian"
                        data-testid="input-passport-nationality"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="applicantDob">Date of birth</Label>
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
                      <Label htmlFor="passportGender">Gender</Label>
                      <Select
                        value={form.passportGender || undefined}
                        onValueChange={(v) => setForm({ ...form, passportGender: v as "M" | "F" | "X" })}
                      >
                        <SelectTrigger id="passportGender" data-testid="select-passport-gender">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="M">Male (M)</SelectItem>
                          <SelectItem value="F">Female (F)</SelectItem>
                          <SelectItem value="X">Other / X</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passportPlaceOfBirth">Place of birth</Label>
                      <Input
                        id="passportPlaceOfBirth"
                        value={form.passportPlaceOfBirth}
                        onChange={(e) => setForm({ ...form, passportPlaceOfBirth: e.target.value })}
                        placeholder="DELHI"
                        data-testid="input-passport-place-of-birth"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="passportDateOfIssue">Date of issue</Label>
                      <Input
                        id="passportDateOfIssue"
                        type="date"
                        value={form.passportDateOfIssue}
                        max={today}
                        onChange={(e) => setForm({ ...form, passportDateOfIssue: e.target.value })}
                        data-testid="input-passport-date-of-issue"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passportDateOfExpiry">Date of expiry</Label>
                      <Input
                        id="passportDateOfExpiry"
                        type="date"
                        value={form.passportDateOfExpiry}
                        onChange={(e) => setForm({ ...form, passportDateOfExpiry: e.target.value })}
                        data-testid="input-passport-date-of-expiry"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="passportPlaceOfIssue">Place of issue</Label>
                      <Input
                        id="passportPlaceOfIssue"
                        value={form.passportPlaceOfIssue}
                        onChange={(e) => setForm({ ...form, passportPlaceOfIssue: e.target.value })}
                        placeholder="DELHI"
                        data-testid="input-passport-place-of-issue"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <Label htmlFor="applicantName">Full name (for the case record)</Label>
                    <Input
                      id="applicantName"
                      value={form.applicantName}
                      onChange={(e) => {
                        applicantNameTouchedRef.current = true;
                        setForm({ ...form, applicantName: e.target.value });
                      }}
                      placeholder="Auto-built from passport name"
                      data-testid="input-applicant-name"
                    />
                    <p className="text-xs text-muted-foreground">Auto-built from Given Name(s) + Surname. You can override it if needed.</p>
                  </div>
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
                    <div key={ct.key} className="border rounded-xl p-4 space-y-4 bg-muted/20" data-testid={`block-co-traveller-${idx}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Co-traveller #{idx + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => {
                            setCoTravellers((arr) => arr.filter((c) => c.key !== ct.key));
                            delete coTravellerFileRefs.current[ct.key];
                            delete coTravellerLastPageFileRefs.current[ct.key];
                          }}
                          data-testid={`button-remove-co-traveller-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* === Identity (always visible) === */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>Full name *</Label>
                          <Input
                            value={ct.name}
                            onChange={(e) => updateCoTraveller(ct.key, { name: e.target.value, nameTouched: true })}
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
                      </div>

                      {/* === Passport (optional, with auto-scan) === */}
                      <div className="space-y-3 pt-3 border-t">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold flex items-center gap-2">
                            <UserIcon className="w-4 h-4" /> Passport <span className="text-xs font-normal text-destructive">*</span>
                          </p>
                        </div>

                        <Tabs
                          value={ct.passportMode}
                          onValueChange={(v) => updateCoTraveller(ct.key, { passportMode: v as "upload" | "manual" })}
                        >
                          <TabsList className="grid grid-cols-2 w-full sm:w-auto h-8">
                            <TabsTrigger value="upload" className="gap-1.5 text-xs" data-testid={`tab-co-traveller-upload-${idx}`}>
                              <Upload className="w-3.5 h-3.5" /> Upload passport
                            </TabsTrigger>
                            <TabsTrigger value="manual" className="gap-1.5 text-xs" data-testid={`tab-co-traveller-manual-${idx}`}>
                              <FileText className="w-3.5 h-3.5" /> Enter manually
                            </TabsTrigger>
                          </TabsList>

                          <TabsContent value="upload" className="space-y-3 mt-3">
                            <Tabs
                              value={ct.passportPageView}
                              onValueChange={(v) => updateCoTraveller(ct.key, { passportPageView: v as "first" | "last" })}
                            >
                              <TabsList className="grid grid-cols-2 w-full sm:w-auto h-8">
                                <TabsTrigger value="first" className="gap-1 text-[11px]" data-testid={`tab-co-traveller-page-first-${idx}`}>
                                  First Page (Bio)
                                  <Badge variant="secondary" className="h-3.5 px-1 text-[9px] ml-0.5">Required</Badge>
                                </TabsTrigger>
                                <TabsTrigger value="last" className="gap-1 text-[11px]" data-testid={`tab-co-traveller-page-last-${idx}`}>
                                  Last Page (Address)
                                  <Badge variant="outline" className="h-3.5 px-1 text-[9px] ml-0.5">Optional</Badge>
                                </TabsTrigger>
                              </TabsList>

                              <TabsContent value="first" className="space-y-3 mt-3">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              ref={(el) => { coTravellerFileRefs.current[ct.key] = el; }}
                              onChange={(e) => {
                                handleCoTravellerFile(ct.key, "first", e.target.files?.[0]);
                                e.target.value = "";
                              }}
                              data-testid={`input-co-traveller-passport-file-${idx}`}
                            />
                            <div
                              className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center bg-background/40 hover:bg-background/60 transition cursor-pointer"
                              onClick={() => coTravellerFileRefs.current[ct.key]?.click()}
                              data-testid={`dropzone-co-traveller-passport-${idx}`}
                            >
                              {ct.passportPreview ? (
                                <img src={ct.passportPreview} alt="Passport bio page preview" className="max-h-32 rounded-md object-contain" />
                              ) : (
                                <>
                                  <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                                  <p className="text-xs font-medium">Click to upload passport bio page</p>
                                  <p className="text-[11px] text-muted-foreground">JPG / PNG / WebP, up to 8 MB</p>
                                </>
                              )}
                            </div>

                            {ct.passportPreview && (
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="gap-1.5"
                                  disabled={ct.scanning}
                                  onClick={() => scanCoTravellerPassport(ct.key)}
                                  data-testid={`button-scan-co-traveller-passport-${idx}`}
                                >
                                  {ct.scanning
                                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning…</>
                                    : <><ScanLine className="w-3.5 h-3.5" /> {ct.scanStatus ? "Re-scan passport" : "Scan & extract details"}</>}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    updateCoTraveller(ct.key, {
                                      passportPreview: null,
                                      passportMimeType: null,
                                      scanStatus: null,
                                      scanWarnings: [],
                                      scanError: null,
                                    });
                                    if (coTravellerFileRefs.current[ct.key]) coTravellerFileRefs.current[ct.key]!.value = "";
                                  }}
                                  data-testid={`button-remove-co-traveller-passport-${idx}`}
                                >
                                  <X className="w-3.5 h-3.5 mr-1" /> Remove image
                                </Button>
                              </div>
                            )}

                            {ct.scanError && (
                              <div className="flex items-start gap-2 text-xs text-destructive border border-destructive/30 bg-destructive/10 rounded-md p-2.5" data-testid={`text-co-traveller-scan-error-${idx}`}>
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium">Couldn't auto-scan this passport</p>
                                  <p className="mt-0.5">{ct.scanError}</p>
                                </div>
                              </div>
                            )}

                            {!ct.scanError && ct.scanStatus === "not_passport" && (
                              <div className="flex items-start gap-2 text-xs text-destructive border border-destructive/30 bg-destructive/10 rounded-md p-2.5" data-testid={`text-co-traveller-scan-not-passport-${idx}`}>
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                                <div className="space-y-1">
                                  <p className="font-medium">This doesn't look like a passport biographic page.</p>
                                  <p>Please upload the <span className="font-medium">passport bio page</span> for this co-traveller — visa stickers, ID cards or other documents won't work here.</p>
                                  {ct.scanWarnings.length > 0 && (
                                    <ul className="list-disc list-inside">
                                      {ct.scanWarnings.map((w, i) => <li key={i}>{w}</li>)}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            )}

                            {!ct.scanError && ct.scanStatus === "warnings" && (
                              <div className="flex items-start gap-2 text-xs border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/60 rounded-md p-2.5" data-testid={`text-co-traveller-scan-warnings-${idx}`}>
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                <div className="space-y-1 text-amber-900 dark:text-amber-100">
                                  <p className="font-medium">Passport scanned — please double-check the highlighted items.</p>
                                  <ul className="list-disc list-inside">
                                    {ct.scanWarnings.map((w, i) => <li key={i}>{w}</li>)}
                                  </ul>
                                </div>
                              </div>
                            )}

                            {!ct.scanError && ct.scanStatus === "ok" && (
                              <div className="flex items-start gap-2 text-xs border border-emerald-300/50 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800/50 rounded-md p-2.5" data-testid={`text-co-traveller-scan-success-${idx}`}>
                                <Check className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                                <p className="font-medium text-emerald-800 dark:text-emerald-200">Passport details extracted. Review the fields below before continuing.</p>
                              </div>
                            )}
                              </TabsContent>

                              <TabsContent value="last" className="space-y-3 mt-3">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  ref={(el) => { coTravellerLastPageFileRefs.current[ct.key] = el; }}
                                  onChange={(e) => {
                                    handleCoTravellerFile(ct.key, "last", e.target.files?.[0]);
                                    e.target.value = "";
                                  }}
                                  data-testid={`input-co-traveller-passport-last-file-${idx}`}
                                />
                                <div
                                  className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center text-center bg-background/40 hover:bg-background/60 transition cursor-pointer"
                                  onClick={() => coTravellerLastPageFileRefs.current[ct.key]?.click()}
                                  data-testid={`dropzone-co-traveller-passport-last-${idx}`}
                                >
                                  {ct.passportLastPagePreview ? (
                                    <img src={ct.passportLastPagePreview} alt="Passport address page preview" className="max-h-32 rounded-md object-contain" />
                                  ) : (
                                    <>
                                      <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                                      <p className="text-xs font-medium">Click to upload address page</p>
                                      <p className="text-[11px] text-muted-foreground">JPG / PNG / WebP, up to 8 MB</p>
                                    </>
                                  )}
                                </div>

                                {ct.passportLastPagePreview && (
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        updateCoTraveller(ct.key, {
                                          passportLastPagePreview: null,
                                          passportLastPageMimeType: null,
                                        });
                                        if (coTravellerLastPageFileRefs.current[ct.key]) coTravellerLastPageFileRefs.current[ct.key]!.value = "";
                                      }}
                                      data-testid={`button-remove-co-traveller-passport-last-${idx}`}
                                    >
                                      <X className="w-3.5 h-3.5 mr-1" /> Remove image
                                    </Button>
                                  </div>
                                )}

                                <p className="text-[11px] text-muted-foreground">
                                  Optional. Saved as an attachment alongside the case — not used for OCR.
                                </p>
                              </TabsContent>
                            </Tabs>
                          </TabsContent>

                          <TabsContent value="manual" className="mt-3">
                            <p className="text-xs text-muted-foreground">Type details exactly as printed on the passport bio page.</p>
                          </TabsContent>
                        </Tabs>

                        {/* Passport detail fields — visible in both modes (auto-filled by scan, editable always) */}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label>Surname *</Label>
                            <Input
                              value={ct.passportSurname}
                              onChange={(e) => updateCoTraveller(ct.key, { passportSurname: e.target.value.toUpperCase() })}
                              placeholder="As printed"
                              data-testid={`input-co-traveller-passport-surname-${idx}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Given Name(s) *</Label>
                            <Input
                              value={ct.passportGivenName}
                              onChange={(e) => updateCoTraveller(ct.key, { passportGivenName: e.target.value.toUpperCase() })}
                              placeholder="Include any middle names"
                              data-testid={`input-co-traveller-passport-given-${idx}`}
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
                          <div className="space-y-1.5">
                            <Label>Gender</Label>
                            <Select
                              value={ct.passportGender || undefined}
                              onValueChange={(v) => updateCoTraveller(ct.key, { passportGender: v as "M" | "F" | "X" })}
                            >
                              <SelectTrigger data-testid={`select-co-traveller-gender-${idx}`}>
                                <SelectValue placeholder="Optional" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="M">Male</SelectItem>
                                <SelectItem value="F">Female</SelectItem>
                                <SelectItem value="X">Other / X</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1.5">
                            <Label>Date of Issue</Label>
                            <Input
                              type="date"
                              value={ct.passportDateOfIssue}
                              max={today}
                              onChange={(e) => updateCoTraveller(ct.key, { passportDateOfIssue: e.target.value })}
                              data-testid={`input-co-traveller-passport-issue-${idx}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Date of Expiry</Label>
                            <Input
                              type="date"
                              value={ct.passportDateOfExpiry}
                              onChange={(e) => updateCoTraveller(ct.key, { passportDateOfExpiry: e.target.value })}
                              data-testid={`input-co-traveller-passport-expiry-${idx}`}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Place of Issue</Label>
                            <Input
                              value={ct.passportPlaceOfIssue}
                              onChange={(e) => updateCoTraveller(ct.key, { passportPlaceOfIssue: e.target.value })}
                              placeholder="Optional"
                              data-testid={`input-co-traveller-passport-place-issue-${idx}`}
                            />
                          </div>
                          <div className="space-y-1.5 sm:col-span-2">
                            <Label>Place of Birth</Label>
                            <Input
                              value={ct.passportPlaceOfBirth}
                              onChange={(e) => updateCoTraveller(ct.key, { passportPlaceOfBirth: e.target.value })}
                              placeholder="Optional"
                              data-testid={`input-co-traveller-passport-place-birth-${idx}`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* === Notes === */}
                      <div className="space-y-1.5 pt-2 border-t">
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
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" /> Appointments
                  </CardTitle>
                  <CardDescription>
                    Add embassy / VFS / BLS bookings tied to this case. You can skip
                    this step and add them later from the case page.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAppointmentDrafts((arr) => [...arr, emptyAppointment()])}
                  data-testid="button-add-appointment"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Add appointment
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {appointmentDrafts.length === 0 ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center text-sm text-muted-foreground">
                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No appointments yet — click "Add appointment" if you've already booked one.</p>
                  </div>
                ) : (
                  appointmentDrafts.map((a, idx) => (
                    <div key={a.key} className="border rounded-lg p-4 space-y-3 bg-muted/10" data-testid={`card-appointment-${idx}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          Appointment #{idx + 1}
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => removeAppointment(a.key)}
                          data-testid={`button-remove-appointment-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label>Type *</Label>
                          <Select
                            value={a.appointmentType || undefined}
                            onValueChange={(v) => updateAppointment(a.key, { appointmentType: v as AppointmentType })}
                          >
                            <SelectTrigger data-testid={`select-appointment-type-${idx}`}>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {APPOINTMENT_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Status</Label>
                          <Select
                            value={a.status}
                            onValueChange={(v) => updateAppointment(a.key, { status: v as AppointmentStatus })}
                          >
                            <SelectTrigger data-testid={`select-appointment-status-${idx}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {APPOINTMENT_STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2">
                          <Label>Provider / centre name *</Label>
                          <Input
                            value={a.provider}
                            onChange={(e) => updateAppointment(a.key, { provider: e.target.value })}
                            placeholder={
                              a.appointmentType === "embassy_consulate"
                                ? "e.g. French Embassy — New Delhi"
                                : a.appointmentType === "vfs"
                                ? "e.g. VFS Global — Mumbai"
                                : a.appointmentType === "bls"
                                ? "e.g. BLS International — Delhi"
                                : "Centre / provider name"
                            }
                            data-testid={`input-appointment-provider-${idx}`}
                          />
                        </div>
                        <div>
                          <Label>Date & time *</Label>
                          <Input
                            type="datetime-local"
                            value={a.scheduledAt}
                            onChange={(e) => updateAppointment(a.key, { scheduledAt: e.target.value })}
                            data-testid={`input-appointment-scheduled-${idx}`}
                          />
                        </div>
                        <div>
                          <Label>Location <span className="text-muted-foreground text-xs">(optional)</span></Label>
                          <Input
                            value={a.location}
                            onChange={(e) => updateAppointment(a.key, { location: e.target.value })}
                            placeholder="City / address"
                            data-testid={`input-appointment-location-${idx}`}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
                          <Textarea
                            value={a.notes}
                            rows={2}
                            onChange={(e) => updateAppointment(a.key, { notes: e.target.value })}
                            placeholder="Reference number, instructions for the customer, etc."
                            data-testid={`input-appointment-notes-${idx}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {step === 6 && (
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
                    {/* Person tabs — only render when there are co-travellers.
                        With just an applicant, drop the tab strip entirely so
                        the UI stays identical to the single-person flow. */}
                    {coTravellers.length > 0 ? (
                      <Tabs value={activeDocPerson} onValueChange={setActiveDocPerson}>
                        <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start">
                          {docPersonTabs.map((p) => {
                            const personChecks = docChecks[p.key] ?? {};
                            const count = checklist.filter((r) => personChecks[r.type]).length;
                            return (
                              <TabsTrigger
                                key={p.key}
                                value={p.key}
                                className="gap-1.5 text-xs"
                                data-testid={`tab-doc-person-${p.key}`}
                              >
                                {p.key === APPLICANT_KEY ? (
                                  <UserIcon className="w-3 h-3" />
                                ) : (
                                  <Users className="w-3 h-3" />
                                )}
                                <span className="truncate max-w-[160px]">{p.label}</span>
                                <Badge variant="secondary" className="h-4 px-1 text-[9px] ml-0.5">
                                  {count}
                                </Badge>
                              </TabsTrigger>
                            );
                          })}
                        </TabsList>
                        {docPersonTabs.map((p) => (
                          <TabsContent key={p.key} value={p.key} className="mt-4 space-y-4">
                            {renderDocChecklistFor(p.key, p.label)}
                          </TabsContent>
                        ))}
                      </Tabs>
                    ) : (
                      renderDocChecklistFor(APPLICANT_KEY, docPersonTabs[0]?.label ?? "Main applicant")
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {step === 7 && (
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

          {step === 8 && (
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
                    ["Surname", form.passportSurname || "—"],
                    ["Given Name(s)", form.passportGivenName || "—"],
                    ["Passport Number", form.passportNumber || "—"],
                    ["Nationality", form.passportNationality || "—"],
                    ["Gender", form.passportGender || "—"],
                    ["Date of Issue", form.passportDateOfIssue || "—"],
                    ["Date of Expiry", form.passportDateOfExpiry || "—"],
                    ["Place of Issue", form.passportPlaceOfIssue || "—"],
                    ["Place of Birth", form.passportPlaceOfBirth || "—"],
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
                          {ct.passportNumber ? ` · Passport ${ct.passportNumber}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="border rounded-xl p-4 bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Appointments ({appointmentDrafts.length})</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setStep(5)} data-testid="button-edit-appointments">Edit</Button>
                  </div>
                  {appointmentDrafts.length === 0 ? (
                    <p className="text-muted-foreground text-sm">None added — you can schedule appointments later from the case page.</p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {appointmentDrafts.map((a, idx) => {
                        const typeLabel = APPOINTMENT_TYPES.find((t) => t.value === a.appointmentType)?.label ?? "—";
                        const when = a.scheduledAt ? new Date(a.scheduledAt).toLocaleString() : "—";
                        return (
                          <li key={a.key} className="text-muted-foreground" data-testid={`review-appointment-${idx}`}>
                            <span className="font-medium text-foreground">{a.provider || `Appointment #${idx + 1}`}</span>
                            {` · ${typeLabel}`}
                            {` · ${when}`}
                            {a.location ? ` · ${a.location}` : ""}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="border rounded-xl p-4 bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium">Fees ({validFeeItems.length} {validFeeItems.length === 1 ? "line" : "lines"})</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setStep(7)} data-testid="button-edit-fees">Edit</Button>
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
                    <p className="font-medium">Documents Checklist ({totalSelectedDocsCount} item{totalSelectedDocsCount === 1 ? "" : "s"})</p>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setStep(6)} data-testid="button-edit-documents">Edit</Button>
                  </div>
                  {checklist.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No checklist available for this destination + visa type.</p>
                  ) : totalSelectedDocsCount === 0 ? (
                    <p className="text-muted-foreground text-sm">No documents selected — case will be created without a checklist.</p>
                  ) : (
                    <div className="space-y-3 text-sm">
                      {docPersonTabs.map((p) => {
                        const personChecks = docChecks[p.key] ?? {};
                        const personFiles = docFiles[p.key] ?? {};
                        const items = checklist.filter((r) => personChecks[r.type]);
                        if (items.length === 0) return null;
                        return (
                          <div key={p.key} data-testid={`review-doc-person-${p.key}`}>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                              {p.label} <span className="font-normal normal-case">({items.length}/{checklist.length})</span>
                            </p>
                            <ul className="space-y-1">
                              {items.map((req) => {
                                const f = personFiles[req.type];
                                return (
                                  <li key={req.type} className="flex items-center gap-2 text-foreground">
                                    <CircleDot className={`w-3 h-3 ${f ? "text-emerald-600" : "text-muted-foreground"}`} />
                                    <span>{req.name}</span>
                                    {f && (
                                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">
                                        Attached
                                      </Badge>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Submission method — drives the initial visa-stage so this
                    case shows up under Visa → Processing immediately on submit. */}
                <div className="border rounded-xl p-4 bg-primary/5 border-primary/20">
                  <p className="font-medium mb-1 flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" /> How are you submitting this application?
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Required to submit. Drafts can skip this and pick later. The application will move to
                    <span className="font-medium text-foreground"> Visa → Processing</span> once submitted.
                  </p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { value: "evisa",   label: "eVisa Portal",       hint: "Online application" },
                      { value: "embassy", label: "Send to Embassy",    hint: "Direct lodgment" },
                      { value: "vfs",     label: "Through VFS Center", hint: "Visa application centre" },
                    ].map((opt) => {
                      const active = form.submissionMethod === opt.value;
                      return (
                        <button
                          type="button"
                          key={opt.value}
                          onClick={() => setForm((f) => ({ ...f, submissionMethod: opt.value as any }))}
                          className={[
                            "text-left rounded-lg border p-3 transition-colors hover-elevate",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background",
                          ].join(" ")}
                          data-testid={`button-submission-method-${opt.value}`}
                        >
                          <p className="font-medium text-sm">{opt.label}</p>
                          <p className={`text-xs ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                            {opt.hint}
                          </p>
                        </button>
                      );
                    })}
                  </div>
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
