import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ImagePlus, Loader2, Send, Sparkles, Upload, X } from "lucide-react";

import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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

function estimateTicketBody(prompt: string, estimate: Estimate, imageName: string) {
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
      toast({ title: "Estimate ready", description: "Review timeline and price before confirming." });
    },
    onError: (e: any) => toast({ title: "Could not estimate", description: e?.message ?? "Try again", variant: "destructive" }),
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!estimate) throw new Error("Generate an estimate first.");
      const res = await apiRequest("POST", `/api/agency/${tenantId}/tickets`, {
        subject: `Customization request: ${prompt.slice(0, 80)}`,
        category: "feature_request",
        priority: estimate.effortLevel === "High" ? "high" : "normal",
        body: estimateTicketBody(prompt, estimate, image?.name ?? ""),
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
      </div>
    </DashboardLayout>
  );
}
