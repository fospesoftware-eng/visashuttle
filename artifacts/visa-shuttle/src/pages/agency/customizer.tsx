import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, History, ImagePlus, Loader2, Send, Sparkles, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/use-current-user";

type Estimate = {
  summary: string;
  effortLevel: "Low" | "Medium" | "High" | string;
  estimatedHours: number;
  timeline: string;
  priceCents: number;
  currency: string;
  phases: Array<{ name: string; duration: string; work: string }>;
  assumptions: string[];
  provider?: string;
};

type Ticket = {
  id: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  lastMessageAt: string | null;
  lastMessageBy: string | null;
  createdAt: string | null;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(0)} ${currency}`;
  }
}

const STATUS_BADGE: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  closed: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function approvalLabel(status: string) {
  if (status === "resolved" || status === "closed") return "Approved / completed";
  if (status === "pending") return "Under SaaS admin review";
  return "Submitted";
}

function parseCustomizerPrice(subject: string) {
  const submitted = subject.match(/bid:\s*([^)]*)\)/i)?.[1]?.trim();
  const estimated = subject.match(/estimate:\s*([^|)]*)/i)?.[1]?.trim();
  return { submitted, estimated };
}

function estimateTicketBody(prompt: string, estimate: Estimate, imageName: string, bidDiscountPercent: number) {
  const bidPriceCents = Math.round(estimate.priceCents * (1 - bidDiscountPercent / 100));
  return [
    "Customization request confirmed by agency.",
    "",
    "Agency requirement:",
    prompt,
    "",
    imageName ? `Reference image reviewed by AI estimate: ${imageName}` : "Reference image: Not attached",
    "",
    "AI estimate:",
    `Summary: ${estimate.summary}`,
    `Effort: ${estimate.effortLevel}`,
    `Timeline: ${estimate.timeline}`,
    `Estimated hours: ${estimate.estimatedHours}`,
    `Estimated price: ${formatMoney(estimate.priceCents, estimate.currency)}`,
    `Negotiation bid discount: ${bidDiscountPercent}%`,
    `Agency submitted bid price: ${formatMoney(bidPriceCents, estimate.currency)}`,
    "Approval rule: SaaS admin must approve any negotiated bid before work starts.",
    "",
    "Development phases:",
    ...estimate.phases.map((p, index) => `${index + 1}. ${p.name} (${p.duration}) - ${p.work}`),
    "",
    "Assumptions:",
    ...estimate.assumptions.map((item) => `- ${item}`),
    "",
    "Note: This customization is expected to be developed with AI-assisted implementation and reviewed before release.",
  ].join("\n").slice(0, 7900);
}

export default function AgencyCustomizerPage() {
  const meQuery = useCurrentUser();
  const tenantId = meQuery.data?.user?.tenantId ?? null;
  const { toast } = useToast();
  const qc = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<{ name: string; dataUrl: string; mimeType: string } | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [submittedTicketId, setSubmittedTicketId] = useState<string | null>(null);
  const [bidDiscountPercent, setBidDiscountPercent] = useState(0);

  const ticketsQuery = useQuery<Ticket[]>({
    queryKey: ["/api/agency", tenantId, "tickets"],
    queryFn: async () => {
      const r = await fetch(`/api/agency/${tenantId}/tickets`, { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load customization history");
      return r.json();
    },
    enabled: !!tenantId,
  });

  const customizerTickets = (ticketsQuery.data ?? []).filter(
    (ticket) => ticket.category === "feature_request" && ticket.subject.toLowerCase().startsWith("customization request:"),
  );

  const bidPriceCents = estimate ? Math.round(estimate.priceCents * (1 - bidDiscountPercent / 100)) : 0;

  const estimateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/agency/${tenantId}/customizer/estimate`, {
        prompt,
        imageBase64: image?.dataUrl,
        imageMimeType: image?.mimeType,
      });
      return res.json() as Promise<Estimate>;
    },
    onSuccess: (data) => {
      setEstimate(data);
      setSubmittedTicketId(null);
      setBidDiscountPercent(0);
      toast({ title: "Estimate ready", description: "Review timeline and price before confirming." });
    },
    onError: (e: any) => toast({ title: "Could not estimate", description: e?.message ?? "Try again", variant: "destructive" }),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!estimate) throw new Error("Generate an estimate first.");
      const res = await apiRequest("POST", `/api/agency/${tenantId}/tickets`, {
        subject: `Customization request: ${prompt.slice(0, 60)} (estimate: ${formatMoney(estimate.priceCents, estimate.currency)} | bid: ${formatMoney(bidPriceCents, estimate.currency)})`,
        category: "feature_request",
        priority: estimate.effortLevel === "High" ? "high" : "normal",
        body: estimateTicketBody(prompt, estimate, image?.name ?? "", bidDiscountPercent),
      });
      return res.json() as Promise<{ id: string }>;
    },
    onSuccess: (ticket) => {
      setSubmittedTicketId(ticket.id);
      qc.invalidateQueries({ queryKey: ["/api/agency", tenantId, "tickets"] });
      toast({ title: "Sent to SaaS admin", description: "The platform team can now review this customization request." });
    },
    onError: (e: any) => toast({ title: "Could not confirm", description: e?.message ?? "Try again", variant: "destructive" }),
  });

  return (
    <DashboardLayout type="agency">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Customizer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Request dashboard changes, new menus, new fields, automations, or custom workflows. AI estimates effort, timeline, and price before you confirm.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Describe the customization</CardTitle>
              <CardDescription>
                Be specific about the screen, menu, field, report, or workflow you want to add.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Prompt</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    setEstimate(null);
                    setSubmittedTicketId(null);
                  }}
                  rows={10}
                  placeholder="Example: Add a new menu called Embassy Appointments where staff can create appointment slots, assign them to applications, upload VFS receipts, and send reminders to customers."
                  data-testid="input-customizer-prompt"
                />
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Label>Reference image</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload a screenshot, wireframe, or example UI for AI to include in the estimate.
                    </p>
                  </div>
                  {image && (
                    <Button variant="ghost" size="sm" onClick={() => { setImage(null); setEstimate(null); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div className="mt-3">
                  {image ? (
                    <div className="flex items-center gap-3">
                      <img src={image.dataUrl} alt="Customization reference" className="h-20 w-28 rounded-md border object-cover" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{image.name}</p>
                        <p className="text-xs text-muted-foreground">Included in AI estimate</p>
                      </div>
                    </div>
                  ) : (
                    <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 p-4 text-center hover:bg-muted/40">
                      <ImagePlus className="mb-2 h-7 w-7 text-muted-foreground" />
                      <span className="text-sm font-medium">Upload image</span>
                      <span className="text-xs text-muted-foreground">PNG, JPG, or WEBP under 5 MB</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        data-testid="input-customizer-image"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            toast({ title: "Image too large", description: "Please upload an image under 5 MB.", variant: "destructive" });
                            return;
                          }
                          const dataUrl = await fileToDataUrl(file);
                          setImage({ name: file.name, dataUrl, mimeType: file.type || "image/png" });
                          setEstimate(null);
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={() => estimateMutation.mutate()}
                  disabled={!tenantId || prompt.trim().length < 10 || estimateMutation.isPending}
                  className="gap-2"
                  data-testid="button-generate-customizer-estimate"
                >
                  {estimateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate AI estimate
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estimate</CardTitle>
              <CardDescription>Timeline and price before sending to SaaS admin.</CardDescription>
            </CardHeader>
            <CardContent>
              {!estimate ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                  <Sparkles className="mx-auto mb-3 h-8 w-8 opacity-50" />
                  Generate an estimate to see effort, price, and delivery phases.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Timeline</p>
                      <p className="font-semibold">{estimate.timeline}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Price</p>
                      <p className="font-semibold">{formatMoney(estimate.priceCents, estimate.currency)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Hours</p>
                      <p className="font-semibold">{estimate.estimatedHours}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3">
                      <p className="text-xs text-muted-foreground">Effort</p>
                      <Badge variant="secondary">{estimate.effortLevel}</Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium">Summary</p>
                    <p className="mt-1 text-sm text-muted-foreground">{estimate.summary}</p>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">Negotiation bid</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Agency can request up to 25% price modification. SaaS admin approval is required before development starts.
                        </p>
                      </div>
                      <Badge variant="outline">{bidDiscountPercent}% off</Badge>
                    </div>
                    <div className="mt-4 space-y-3">
                      <Slider
                        value={[bidDiscountPercent]}
                        min={0}
                        max={25}
                        step={1}
                        onValueChange={(value) => setBidDiscountPercent(value[0] ?? 0)}
                        data-testid="slider-customizer-negotiation-bid"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Estimated {formatMoney(estimate.priceCents, estimate.currency)}</span>
                        <span>Maximum 25%</span>
                      </div>
                      <div className="rounded-lg bg-background p-3">
                        <p className="text-xs text-muted-foreground">Submitted bid price</p>
                        <p className="text-xl font-bold">{formatMoney(bidPriceCents, estimate.currency)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Development phases</p>
                    {estimate.phases.map((phase, index) => (
                      <div key={`${phase.name}-${index}`} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">{phase.name}</p>
                          <Badge variant="outline">{phase.duration}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{phase.work}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium">Assumptions</p>
                    {estimate.assumptions.map((item, index) => (
                      <p key={index} className="text-xs text-muted-foreground">- {item}</p>
                    ))}
                  </div>

                  {submittedTicketId ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                      <CheckCircle2 className="mr-2 inline h-4 w-4" />
                      Sent to SaaS admin. Ticket ID: {submittedTicketId.slice(0, 8)}
                    </div>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      onClick={() => confirmMutation.mutate()}
                      disabled={confirmMutation.isPending}
                      data-testid="button-confirm-customization"
                    >
                      {confirmMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      Confirm and send to SaaS admin
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Past customizer actions
            </CardTitle>
            <CardDescription>
              Track submitted customization requests, bid prices, and SaaS admin approval status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ticketsQuery.isLoading ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin opacity-60" />
                Loading customization history...
              </div>
            ) : customizerTickets.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <Sparkles className="mx-auto mb-3 h-8 w-8 opacity-50" />
                No customization requests submitted yet.
              </div>
            ) : (
              <div className="space-y-3">
                {customizerTickets.map((ticket) => {
                  const prices = parseCustomizerPrice(ticket.subject);
                  const cleanSubject = ticket.subject.replace(/\s*\(estimate:.*$/i, "");
                  return (
                    <div key={ticket.id} className="rounded-lg border p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{cleanSubject}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>Ticket {ticket.id.slice(0, 8)}</span>
                            {ticket.createdAt && <span>Submitted {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}</span>}
                            {ticket.lastMessageBy && <span>Last update by {ticket.lastMessageBy}</span>}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className={STATUS_BADGE[ticket.status] ?? ""}>
                            {ticket.status}
                          </Badge>
                          <Badge variant="outline">{approvalLabel(ticket.status)}</Badge>
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-xs text-muted-foreground">Estimated price</p>
                          <p className="font-semibold">{prices.estimated ?? "Pending"}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-xs text-muted-foreground">Submitted bid</p>
                          <p className="font-semibold">{prices.submitted ?? "Pending"}</p>
                        </div>
                        <div className="rounded-lg bg-muted/40 p-3">
                          <p className="text-xs text-muted-foreground">Price approval</p>
                          <p className="font-semibold">{approvalLabel(ticket.status)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
