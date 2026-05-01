import type { ReactNode } from "react";
import { Link } from "wouter";
import { ArrowLeft, ReceiptText } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const SUPPORT_EMAIL = "support@visashuttle.com";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Back to home">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <Logo size="sm" />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <div className="mb-10 rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-[#4055FF]/10 text-[#4055FF] flex items-center justify-center mb-5">
            <ReceiptText className="w-5 h-5" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Refund Policy</h1>
          <p className="text-sm text-muted-foreground">Effective Date: May 1, 2026</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-sm md:text-base">
          <p className="text-muted-foreground leading-relaxed">
            This Refund Policy applies to all services offered on visashuttle.com, a product of Fospe Software Private Limited (“Company”, “we”, “our”, “us”).
          </p>

          <Section title="1. No Refund Policy">
            <p>All payments made on Visa Shuttle are final and non-refundable.</p>
            <p>Due to the nature of our services:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Results are generated instantly upon purchase</li>
              <li>Digital services are consumed immediately</li>
              <li>No physical goods are returned or exchanged</li>
            </ul>
            <p>Therefore, no refunds, cancellations, or reversals will be provided once a payment is successfully completed.</p>
          </Section>

          <Section title="2. Acknowledgment Before Purchase">
            <p>By purchasing any service on the Platform, you acknowledge and agree that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You understand the instant delivery nature of the service</li>
              <li>You waive any right to request a refund</li>
              <li>You are satisfied with the service description before making payment</li>
            </ul>
          </Section>

          <Section title="3. Exceptions (If Applicable)">
            <p>Refunds will only be considered in the following rare cases:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Duplicate payment due to technical error</li>
              <li>Payment deducted but service not delivered due to system failure</li>
            </ul>
            <p>In such cases, users must contact us within 3 days of the transaction with valid proof.</p>
          </Section>

          <Section title="4. No Guarantee of Outcomes">
            <p>Visa Shuttle provides AI-based predictions and informational services only.</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>We do not guarantee visa approvals</li>
              <li>Refunds will not be issued based on outcomes, including visa rejection</li>
            </ul>
          </Section>

          <Section title="5. Chargebacks">
            <p>Initiating a chargeback without valid reason may result in:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Immediate account suspension</li>
              <li>Permanent restriction from using the Platform</li>
              <li>Legal action where applicable</li>
            </ul>
          </Section>

          <Section title="6. Contact for Billing Issues">
            <p>If you believe there has been a billing error, please contact:</p>
            <div>
              <p className="font-semibold text-foreground">Fospe Software Private Limited</p>
              <p>
                Email:{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#4055FF] underline">
                  {SUPPORT_EMAIL}
                </a>
              </p>
              <p>
                Website:{" "}
                <a href="https://visashuttle.com" className="text-[#4055FF] underline">
                  https://visashuttle.com
                </a>
              </p>
            </div>
          </Section>

          <Section title="7. Policy Updates">
            <p>We reserve the right to update this Refund Policy at any time without prior notice.</p>
            <p>Continued use of the Platform indicates acceptance of the updated policy.</p>
          </Section>
        </div>
      </main>
    </div>
  );
}
