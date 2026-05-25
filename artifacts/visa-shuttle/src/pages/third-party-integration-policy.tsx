import type { ReactNode } from "react";
import { PlugZap } from "lucide-react";

const SUPPORT_EMAIL = "support@visashuttle.com";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function ThirdPartyIntegrationPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <div className="mb-10 rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-[#4055FF]/10 text-[#4055FF] flex items-center justify-center mb-5">
            <PlugZap className="w-5 h-5" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">3rd Party Integration Policy</h1>
          <p className="text-sm text-muted-foreground">Effective Date: May 1, 2026</p>
          <p className="text-sm text-muted-foreground">This policy applies to integrations used by visashuttle.com and Visa Shuttle business products.</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-sm md:text-base">
          <Section title="1. Overview">
            <p>
              Visa Shuttle integrates with selected third-party providers to deliver AI analysis, payments, email,
              SMS, hosting, analytics, security, customer communication, and business automation features.
            </p>
          </Section>

          <Section title="2. Types of Integrations">
            <ul className="list-disc pl-5 space-y-1">
              <li>AI providers for visa analysis, fraud-risk review, document guidance, and report generation.</li>
              <li>Payment gateways for checkout, subscriptions, invoices, and credit purchases.</li>
              <li>Email and SMS providers for OTPs, transactional notifications, reports, and alerts.</li>
              <li>Cloud, database, file storage, logging, and monitoring services for platform operations.</li>
              <li>Business APIs and agency tools, including Visa Desk, white-label, and customer portal features.</li>
            </ul>
          </Section>

          <Section title="3. Data Shared with Providers">
            <p>
              We share only the information reasonably required for the integration to work. Depending on the feature,
              this may include contact details, transaction metadata, visa-check inputs, uploaded document text/images,
              email content, SMS content, API request metadata, or diagnostic logs.
            </p>
          </Section>

          <Section title="4. Payment Providers">
            <p>
              Payments are processed by third-party payment gateways. Visa Shuttle does not store full card numbers,
              CVV, or sensitive payment authentication credentials. Payment providers may process payment identifiers,
              status, amount, currency, customer contact details, and fraud-prevention metadata.
            </p>
          </Section>

          <Section title="5. AI Providers">
            <p>
              AI providers may receive user-submitted answers, text, and uploaded files where required to generate
              visa estimates, fraud-risk analysis, recommendations, and reports. AI responses are informational and are not government or legal decisions.
            </p>
          </Section>

          <Section title="6. Availability and Reliability">
            <p>
              Third-party services may experience downtime, rate limits, regional outages, or API changes. We are not
              responsible for third-party service interruptions, but we work to handle failures gracefully and restore affected features quickly.
            </p>
          </Section>

          <Section title="7. User-Connected Integrations">
            <p>
              Where an agency or business customer connects its own third-party account, API key, payment gateway,
              email sender, SMS provider, or webhook, that customer is responsible for ensuring the integration is authorized,
              lawful, secure, and correctly configured.
            </p>
          </Section>

          <Section title="8. Security of Credentials">
            <p>
              Integration credentials and tokens must be kept confidential. Visa Shuttle stores supported credentials
              server-side and does not intentionally expose them to frontend users. Customers should rotate keys if unauthorized access is suspected.
            </p>
          </Section>

          <Section title="9. External Links">
            <p>
              Our Platform may contain links to third-party websites or services. We are not responsible for their
              content, privacy practices, security, terms, or service availability.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              For questions about integrations or provider usage, contact{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#4055FF] underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}
