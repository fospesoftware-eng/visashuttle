import type { ReactNode } from "react";
import { Database } from "lucide-react";

const SUPPORT_EMAIL = "support@visashuttle.com";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function DataPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <div className="mb-10 rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-[#4055FF]/10 text-[#4055FF] flex items-center justify-center mb-5">
            <Database className="w-5 h-5" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Data Policy</h1>
          <p className="text-sm text-muted-foreground">Effective Date: May 1, 2026</p>
          <p className="text-sm text-muted-foreground">Applies to Visa Shuttle users, agencies, and business customers.</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-sm md:text-base">
          <Section title="1. Purpose">
            <p>
              This Data Policy explains how Visa Shuttle collects, processes, stores, protects, and deletes data used
              across our AI visa checks, Visa Tools, Visa Desk, proposal links, payment workflows, and business APIs.
            </p>
          </Section>

          <Section title="2. Data We Process">
            <ul className="list-disc pl-5 space-y-1">
              <li>Account details such as name, email address, mobile number, and login metadata.</li>
              <li>Visa assessment inputs such as nationality, destination, travel purpose, employment, income, travel history, and documents.</li>
              <li>Visa Desk data such as leads, customers, proposals, applications, invoices, document checklists, and team activity.</li>
              <li>Uploaded files, including passport scans, visa documents, offer letters, screenshots, and supporting documents.</li>
              <li>Payment, subscription, and credit records, excluding full card details, which are handled by payment providers.</li>
              <li>Technical logs, device data, IP address, browser data, audit events, and API usage details.</li>
            </ul>
          </Section>

          <Section title="3. Legal and Operational Basis">
            <p>We process data to provide requested services, maintain accounts, prevent abuse, improve product reliability, meet legal obligations, and support customer service.</p>
          </Section>

          <Section title="4. AI Processing">
            <p>
              Visa Shuttle may process user-provided answers, text, and uploaded documents through AI systems to generate visa scores,
              risk analysis, fraud indicators, recommendations, and reports. AI outputs are informational and should be verified with official sources.
            </p>
          </Section>

          <Section title="5. Storage and Retention">
            <ul className="list-disc pl-5 space-y-1">
              <li>Account and transaction records are retained while the account is active and as required for legal, tax, or audit purposes.</li>
              <li>Visa check history and reports are retained to allow users to re-open past results unless deletion is requested.</li>
              <li>Visa Desk records are retained for the agency workspace unless deleted by authorized users or required by law.</li>
              <li>Temporary logs and diagnostics may be rotated or deleted periodically.</li>
            </ul>
          </Section>

          <Section title="6. Security Measures">
            <p>
              We use reasonable technical and organizational safeguards including access controls, server-side secret handling,
              secure transport, audit logs, and role-based access for agency and admin functions. No system can guarantee absolute security.
            </p>
          </Section>

          <Section title="7. Data Sharing">
            <p>
              We share data only where necessary to operate the Platform, such as AI analysis, payments, email/SMS delivery,
              hosting, analytics, fraud prevention, customer support, legal compliance, and authorized agency workflows.
            </p>
          </Section>

          <Section title="8. User Rights">
            <p>
              Depending on applicable law, users may request access, correction, export, deletion, or restriction of their personal data.
              Some records may be retained where required for legal, audit, payment, fraud prevention, or security purposes.
            </p>
          </Section>

          <Section title="9. Contact">
            <p>
              For data requests or concerns, contact{" "}
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
