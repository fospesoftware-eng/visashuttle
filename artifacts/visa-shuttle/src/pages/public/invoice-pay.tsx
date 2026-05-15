import { useEffect, useState } from "react";
import { useParams, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle2, Loader2, Banknote, CreditCard, AlertCircle, Copy, ExternalLink,
} from "lucide-react";

// Public, tokenized payment page — reachable at /pay/invoice/:token by anyone
// with the share-link the agency generated. No auth; the token IS the
// credential (so it must be unguessable — see the publicToken column).

interface PublicInvoiceResp {
  invoice: {
    invoiceNumber: string;
    customerName: string;
    customerEmail: string | null;
    status: string;
    currency: string;
    subtotal: number;
    taxAmount: number;
    total: number;
    paidAmount: number;
    balance: number;
    issuedAt: string | null;
    dueDate: string | null;
    notes: string | null;
    items: Array<{ id: string; description: string; quantity: number; unitPrice: number; amount: number }>;
    paymentsCount: number;
  };
  agency: {
    name: string;
    logoUrl: string | null;
    accentColor: string | null;
    email: string | null;
    phone: string | null;
    bankDetails: string | null;
    upiId: string | null;
    upiQrFileUrl: string | null;
    paymentInstructions: string | null;
  };
  gatewayConfigured: boolean;
}

function fmtMoney(cents: number, currency = "USD") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format((cents ?? 0) / 100);
  } catch {
    // Unknown ISO code — fall back to plain number with the code prefixed.
    return `${currency} ${((cents ?? 0) / 100).toFixed(2)}`;
  }
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Cashfree drop-in JS attaches a global `Cashfree` factory once the SDK
// script loads. We don't ship its types, so cast through `any` rather than
// re-declaring the global (which conflicts with prior module declarations).
type CashfreeFactory = (opts: { mode: "sandbox" | "production" }) => {
  checkout: (opts: { paymentSessionId: string; redirectTarget: "_self" | "_blank" | "_modal" }) => Promise<unknown>;
};

export default function InvoicePayPage() {
  const { token } = useParams<{ token: string }>();
  const search = useSearch();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState<{ amount: number; currency: string } | null>(null);

  // If the gateway redirected back with ?order_id=…, immediately verify it
  // server-side and record the payment. We strip the query string after to
  // avoid re-confirming on refresh.
  const params = new URLSearchParams(search);
  const orderIdFromGateway = params.get("order_id");

  const { data, isLoading, error, refetch } = useQuery<PublicInvoiceResp>({
    queryKey: ["/api/public/invoice", token],
    queryFn: async () => {
      const res = await fetch(`/api/public/invoice/${token}`, { credentials: "omit" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  // Auto-confirm on gateway return.
  useEffect(() => {
    if (!orderIdFromGateway || !token || confirming || confirmed) return;
    setConfirming(true);
    (async () => {
      try {
        const res = await apiRequest("POST", `/api/public/invoice/${token}/confirm`, { orderId: orderIdFromGateway });
        const json = await res.json();
        if (json.paid) {
          setConfirmed({
            amount: json.payment?.amount ?? 0,
            currency: data?.invoice.currency ?? "INR",
          });
          // Strip ?order_id from URL so a refresh doesn't re-trigger.
          const url = new URL(window.location.href);
          url.search = "";
          window.history.replaceState({}, "", url.toString());
          await queryClient.invalidateQueries({ queryKey: ["/api/public/invoice", token] });
          await refetch();
        } else {
          toast({
            title: "Payment not completed",
            description: `Status: ${json.status ?? "unknown"}. If money was deducted, contact the agency.`,
            variant: "destructive",
          });
        }
      } catch (e: any) {
        toast({ title: "Could not verify payment", description: e?.message ?? "Try again later", variant: "destructive" });
      } finally {
        setConfirming(false);
      }
    })();
  }, [orderIdFromGateway, token, confirming, confirmed, data?.invoice.currency, refetch, toast]);

  const initiateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/public/invoice/${token}/initiate-payment`, {});
      return res.json() as Promise<{ orderId: string; paymentSessionId: string; mode: "test" | "live" }>;
    },
    onSuccess: async (data) => {
      // Lazy-load Cashfree's JS SDK from their CDN; if it can't load, fall
      // back to a manual error message rather than hanging the page.
      try {
        const w = window as unknown as { Cashfree?: CashfreeFactory };
        if (!w.Cashfree) {
          await new Promise<void>((resolve, reject) => {
            const s = document.createElement("script");
            s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
            s.onload = () => resolve();
            s.onerror = () => reject(new Error("Cashfree SDK failed to load"));
            document.head.appendChild(s);
          });
        }
        const factory = (window as unknown as { Cashfree?: CashfreeFactory }).Cashfree;
        if (!factory) throw new Error("Cashfree SDK not available");
        const cashfree = factory({ mode: data.mode === "live" ? "production" : "sandbox" });
        await cashfree.checkout({
          paymentSessionId: data.paymentSessionId,
          redirectTarget: "_self",
        });
      } catch (e: any) {
        toast({ title: "Could not open checkout", description: e?.message ?? "Try the offline tab.", variant: "destructive" });
      }
    },
    onError: (e: Error) => toast({ title: "Could not start payment", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" /> Link not available
            </CardTitle>
            <CardDescription>{(error as any)?.message ?? "This payment link is invalid or has expired."}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { invoice, agency, gatewayConfigured } = data;
  const isPaid = invoice.balance <= 0;
  const accent = agency.accentColor || "#1f2937";

  const copy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text).then(
      () => toast({ title: `${label} copied` }),
      () => toast({ title: "Copy failed", variant: "destructive" }),
    );
  };

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header / branding */}
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            {agency.logoUrl ? (
              <span className="agency-logo-shell rounded border bg-white">
                <img
                  src={agency.logoUrl}
                  alt={agency.name}
                  className="agency-logo-flex agency-logo-flex-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  data-testid="img-agency-logo"
                />
              </span>
            ) : (
              <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center text-primary font-bold">
                {agency.name?.[0] ?? "A"}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold truncate" data-testid="text-agency-name">{agency.name}</p>
              {(agency.email || agency.phone) && (
                <p className="text-xs text-muted-foreground truncate">
                  {[agency.email, agency.phone].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Confirmation */}
        {confirmed && (
          <Card className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900" data-testid="card-payment-confirmed">
            <CardContent className="pt-6 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900 dark:text-emerald-200">Payment received</p>
                <p className="text-sm text-emerald-800/80 dark:text-emerald-200/80">
                  Thank you. We've credited {fmtMoney(confirmed.amount, confirmed.currency)} against {invoice.invoiceNumber}.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invoice summary */}
        <Card>
          <CardHeader>
            {accent && <div className="h-1 -mt-6 -mx-6 mb-3 rounded-t-lg" style={{ backgroundColor: accent }} />}
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="font-mono text-xl" data-testid="text-invoice-number">{invoice.invoiceNumber}</CardTitle>
                <CardDescription>
                  Issued {fmtDate(invoice.issuedAt)} · Due {fmtDate(invoice.dueDate)}
                </CardDescription>
              </div>
              <Badge
                className={
                  isPaid
                    ? "bg-emerald-100 text-emerald-800"
                    : invoice.status === "partial"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-blue-100 text-blue-800"
                }
                data-testid="badge-invoice-status"
              >
                {isPaid ? "Paid" : invoice.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Bill to</p>
              <p className="font-medium">{invoice.customerName}</p>
              {invoice.customerEmail && <p className="text-sm text-muted-foreground">{invoice.customerEmail}</p>}
            </div>

            <Separator />

            <div className="space-y-1.5 text-sm">
              {invoice.items.map((it) => (
                <div key={it.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate">{it.description}</p>
                    <p className="text-xs text-muted-foreground">{it.quantity} × {fmtMoney(it.unitPrice, invoice.currency)}</p>
                  </div>
                  <p className="font-medium tabular-nums">{fmtMoney(it.amount, invoice.currency)}</p>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{fmtMoney(invoice.subtotal, invoice.currency)}</span></div>
              {invoice.taxAmount > 0 && (
                <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{fmtMoney(invoice.taxAmount, invoice.currency)}</span></div>
              )}
              <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Total</span><span>{fmtMoney(invoice.total, invoice.currency)}</span></div>
              {invoice.paidAmount > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400"><span>Paid</span><span>{fmtMoney(invoice.paidAmount, invoice.currency)}</span></div>
              )}
              <div className="flex justify-between font-semibold text-base text-amber-700 dark:text-amber-400">
                <span>Balance due</span><span data-testid="text-balance-due">{fmtMoney(invoice.balance, invoice.currency)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pay tabs (hidden when fully paid) */}
        {!isPaid && (
          <Card>
            <CardContent className="pt-6">
              <Tabs defaultValue={gatewayConfigured ? "online" : "offline"}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="online" data-testid="tab-pay-online">
                    <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Pay Online
                  </TabsTrigger>
                  <TabsTrigger value="offline" data-testid="tab-pay-offline">
                    <Banknote className="w-3.5 h-3.5 mr-1.5" /> Pay Offline
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="online" className="space-y-3 pt-4">
                  {gatewayConfigured ? (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Pay {fmtMoney(invoice.balance, invoice.currency)} securely with cards, UPI, netbanking or wallets.
                      </p>
                      <Button
                        className="w-full"
                        size="lg"
                        onClick={() => initiateMutation.mutate()}
                        disabled={initiateMutation.isPending || confirming}
                        data-testid="button-pay-online"
                      >
                        {initiateMutation.isPending ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening checkout…</>
                        ) : (
                          <><CreditCard className="w-4 h-4 mr-2" /> Pay {fmtMoney(invoice.balance, invoice.currency)}</>
                        )}
                      </Button>
                    </>
                  ) : (
                    <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">Online payment not configured</p>
                      <p>This agency hasn't set up an online payment gateway yet. Please use the Pay Offline tab to transfer the amount directly.</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="offline" className="space-y-4 pt-4">
                  {agency.paymentInstructions && (
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-line" data-testid="text-payment-instructions">
                      {agency.paymentInstructions}
                    </div>
                  )}

                  {agency.bankDetails && (
                    <div className="space-y-1.5">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Bank Transfer</p>
                      <div className="rounded-lg border p-3 text-sm whitespace-pre-line font-mono bg-background" data-testid="text-bank-details">
                        {agency.bankDetails}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7"
                        onClick={() => copy(agency.bankDetails!, "Bank details")}
                        data-testid="button-copy-bank-details"
                      >
                        <Copy className="w-3 h-3 mr-1.5" /> Copy bank details
                      </Button>
                    </div>
                  )}

                  {(agency.upiId || agency.upiQrFileUrl) && (
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">UPI (India)</p>
                      <div className="rounded-lg border p-3 space-y-3 bg-background">
                        {agency.upiId && (
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs text-muted-foreground">VPA</p>
                              <p className="font-mono text-sm truncate" data-testid="text-upi-id">{agency.upiId}</p>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => copy(agency.upiId!, "UPI ID")} data-testid="button-copy-upi">
                              <Copy className="w-3 h-3 mr-1.5" /> Copy
                            </Button>
                          </div>
                        )}
                        {agency.upiQrFileUrl && (
                          <div className="flex flex-col items-center gap-2 pt-1">
                            <img
                              src={agency.upiQrFileUrl}
                              alt="UPI QR code"
                              className="h-40 w-40 object-contain border rounded bg-white p-1"
                              data-testid="img-upi-qr"
                            />
                            <p className="text-xs text-muted-foreground">Scan with any UPI app</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!agency.bankDetails && !agency.upiId && !agency.upiQrFileUrl && (
                    <div className="rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground mb-1">No offline methods configured</p>
                      <p>Contact <span className="font-medium">{agency.name}</span> directly to arrange payment.</p>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground border-t pt-3">
                    After paying offline, please share the transaction reference with the agency so they can mark this invoice as paid.
                  </p>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center">
          Powered by VisaShuttle · {agency.name}
        </p>
        {(agency.email || agency.phone) && (
          <p className="text-xs text-muted-foreground text-center flex justify-center gap-2">
            {agency.email && <a href={`mailto:${agency.email}`} className="hover:underline" data-testid="link-agency-email"><ExternalLink className="w-3 h-3 inline mr-0.5" />{agency.email}</a>}
            {agency.phone && <a href={`tel:${agency.phone}`} className="hover:underline" data-testid="link-agency-phone">{agency.phone}</a>}
          </p>
        )}
      </div>
    </div>
  );
}
