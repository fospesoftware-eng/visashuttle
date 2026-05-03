import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import {
  ArrowLeft, Mail, Phone, BadgeCheck, FileText, Calendar, MapPin,
  Briefcase, ChevronRight, User as UserIcon, Globe2,
  AlertTriangle, Clock, Download, ExternalLink,
} from "lucide-react";
import { getPassportExpiryStatus, fmtPassportExpiry } from "@/pages/agency/customers";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { CustomerAccount, Case } from "@shared/schema";

type CustomerDetailResponse = {
  account: CustomerAccount;
  cases: Case[];
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
          Passport expired on {fmtPassportExpiry(expiry)}. Customer must renew
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
// rejected so a malicious value in passportFileUrl can never run script in
// an agency staff session.
function sanitizePassportUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const url = raw.trim();
  if (/^https?:\/\//i.test(url)) return url;
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/i.test(url)) return url;
  return null;
}

function PassportFileLink({ c }: { c: Case }) {
  const url = sanitizePassportUrl(c.passportFileUrl);
  if (!url) {
    if (c.passportFileUrl) {
      // We have a value but it failed the safety check — surface a hint
      // rather than silently dropping it, so staff aren't confused.
      return (
        <div className="text-[11px] text-muted-foreground italic" data-testid="text-passport-file-blocked">
          Passport file is attached but could not be displayed (unsupported URL type).
        </div>
      );
    }
    return null;
  }
  // Render an inline image preview for image MIME types, otherwise an
  // open / download pair so PDFs and other formats still work.
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

function PassportBlock({ c }: { c: Case }) {
  // Only render if at least one passport field is set on this case.
  const hasAny = !!(
    c.passportNumber || c.passportSurname || c.passportGivenName ||
    c.passportNationality || c.passportDateOfExpiry || c.passportDateOfIssue ||
    c.passportPlaceOfIssue || c.passportPlaceOfBirth || c.passportGender ||
    c.passportFileUrl
  );
  if (!hasAny) {
    return (
      <div className="text-xs text-muted-foreground italic">
        No passport on file for this case.
      </div>
    );
  }
  const fullName = [c.passportSurname, c.passportGivenName, c.passportMiddleName]
    .filter(Boolean).join(" ");
  return (
    <div className="space-y-3">
      <ExpiryBadge expiry={c.passportDateOfExpiry} />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-xs">
        {fullName && (
          <Field label="Name on passport" value={fullName} />
        )}
        <Field label="Passport #" value={c.passportNumber} mono />
        <Field label="Nationality" value={c.passportNationality} />
        <Field label="Gender" value={c.passportGender} />
        <Field label="Date of birth" value={c.applicantDob} />
        <Field label="Place of birth" value={c.passportPlaceOfBirth} />
        <Field label="Date of issue" value={c.passportDateOfIssue} />
        <Field label="Date of expiry" value={c.passportDateOfExpiry} />
        <Field label="Place of issue" value={c.passportPlaceOfIssue} />
      </div>
      <PassportFileLink c={c} />
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

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const { data: authData } = useCurrentUser();
  const tenantId = authData?.user?.tenantId;

  const { data, isLoading, error } = useQuery<CustomerDetailResponse>({
    queryKey: ["/api/tenants", tenantId, "customers", customerId],
    enabled: !!tenantId && !!customerId,
  });

  return (
    <DashboardLayout type="agency">
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/app/customers">
            <Button variant="ghost" size="sm" data-testid="button-back-customers">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to customers
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Loading customer…
          </Card>
        ) : error || !data ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Customer not found, or you don't have access.
          </Card>
        ) : (
          <>
            <Card className="p-6">
              <div className="flex flex-wrap items-start gap-6">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {initials(data.account.name, data.account.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-[260px]">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold" data-testid="text-customer-name">
                      {data.account.name || "Unnamed customer"}
                    </h1>
                    {data.account.isVerified && (
                      <BadgeCheck className="h-5 w-5 text-emerald-500" aria-label="Verified" />
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 mt-3 text-sm">
                    <span className="inline-flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span data-testid="text-customer-email">{data.account.email}</span>
                    </span>
                    {data.account.phone && (
                      <span className="inline-flex items-center gap-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span data-testid="text-customer-phone">{data.account.phone}</span>
                      </span>
                    )}
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Joined {fmtDate(data.account.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" data-testid="badge-total-cases">
                    {data.cases.length} application{data.cases.length === 1 ? "" : "s"}
                  </Badge>
                </div>
              </div>
            </Card>

            <div>
              <h2 className="text-lg font-semibold mb-3">Applications & passports</h2>
              {data.cases.length === 0 ? (
                <Card className="p-6 text-sm text-muted-foreground">
                  This customer has no applications yet.
                </Card>
              ) : (
                <div className="grid gap-4">
                  {data.cases.map((c) => (
                    <Card key={c.id} className="p-5" data-testid={`card-case-${c.id}`}>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/app/cases/${c.id}`}>
                            <div className="flex items-center gap-2 hover:underline cursor-pointer">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium" data-testid={`text-case-number-${c.id}`}>
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
                        <div className="flex flex-col items-end gap-1">
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
                        </div>
                      </div>
                      <Separator className="my-4" />
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-3">
                        <FileText className="h-3 w-3" /> Passport
                      </div>
                      <PassportBlock c={c} />
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
