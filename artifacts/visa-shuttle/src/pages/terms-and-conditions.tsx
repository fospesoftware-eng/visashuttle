import type { ReactNode } from "react";
import { Link } from "wouter";
import { FileText } from "lucide-react";

const SUPPORT_EMAIL = "support@visashuttle.com";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <div className="space-y-3 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-4xl mx-auto px-4 py-10 md:py-14">
        <div className="mb-10 rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-[#4055FF]/10 text-[#4055FF] flex items-center justify-center mb-5">
            <FileText className="w-5 h-5" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Terms and Conditions</h1>
          <p className="text-sm text-muted-foreground">Effective Date: May 5, 2026</p>
          <p className="text-sm text-muted-foreground">Website: visashuttle.com</p>
          <p className="text-sm text-muted-foreground">Legal Entity: Fospe Software Private Limited</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-sm md:text-base">
          <Section title="1. Introduction">
            <p>
              Welcome to Visa Shuttle (“Platform”), a product of Fospe Software Private Limited (“Company”, “we”, “our”, “us”).
              By accessing or using our website and services, you agree to be bound by these Terms and Conditions (“Terms”).
              If you do not agree, please do not use the Platform.
            </p>
          </Section>

          <Section title="2. Nature of Service">
            <p>
              Visa Shuttle is an AI-powered platform that provides visa approval probability assessments based on
              user-provided information and AI-driven analysis.
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>We provide informational insights only</li>
              <li>We do not process visas</li>
              <li>We do not guarantee visa approval</li>
              <li>We are not affiliated with any embassy, consulate, or government authority</li>
            </ul>
          </Section>

          <Section title="3. Eligibility">
            <p>
              You must be at least 18 years old or accessing the service under the supervision of a legal guardian to
              use this Platform.
            </p>
          </Section>

          <Section title="4. User Account">
            <p>To access certain features, you must create an account.</p>
            <p>You agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide accurate and complete information</li>
              <li>Maintain confidentiality of your login credentials</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
          </Section>

          <Section title="5. Services & Access">
            <p>Visa Shuttle offers two types of services:</p>
            <p className="font-semibold text-foreground">a. Basic Check (Free)</p>
            <p>Limited assessment based on basic inputs.</p>
            <p className="font-semibold text-foreground">b. Deep Check (Paid)</p>
            <p>Advanced AI-based analysis with detailed insights and recommendations.</p>
            <p>All payments are processed securely via third-party payment gateways.</p>
          </Section>

          <Section title="6. No Refund Policy">
            <p>All payments made on Visa Shuttle are non-refundable.</p>
            <p>By making a payment, you acknowledge that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Results are generated instantly</li>
              <li>The service is consumed immediately upon purchase</li>
            </ul>
          </Section>

          <Section title="7. User Responsibilities">
            <p>You agree:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Not to provide false or misleading information</li>
              <li>Not to misuse or attempt to manipulate the system</li>
              <li>Not to use the Platform for unlawful purposes</li>
            </ul>
          </Section>

          <Section title="8. Disclaimer">
            <p>The results provided by Visa Shuttle:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Are AI-generated estimates</li>
              <li>Are not official decisions</li>
              <li>May not reflect actual visa outcomes</li>
            </ul>
            <p>The Company shall not be held liable for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Visa rejections</li>
              <li>Losses incurred based on platform results</li>
              <li>Any decisions made using our insights</li>
            </ul>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>
              To the maximum extent permitted by law, Fospe Software Private Limited shall not be liable for any
              indirect, incidental, or consequential damages arising from the use of the Platform.
            </p>
          </Section>

          <Section title="10. Intellectual Property">
            <p>
              All content, branding, algorithms, and software on this Platform are the property of Fospe Software
              Private Limited and are protected under applicable intellectual property laws.
            </p>
          </Section>

          <Section title="11. Privacy">
            <p>
              Your use of the Platform is also governed by our{" "}
              <Link href="/privacy-policy" className="text-[#4055FF] underline">
                Privacy Policy
              </Link>
              . By using the service, you consent to data collection and usage as described therein.
            </p>
          </Section>

          <Section title="12. Third-Party Services">
            <p>
              We may use third-party services (such as payment gateways and AI APIs). We are not responsible for the
              availability or performance of such third-party services.
            </p>
          </Section>

          <Section title="13. Modifications">
            <p>
              We reserve the right to update or modify these Terms at any time. Continued use of the Platform after
              changes constitutes acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="14. Termination">
            <p>We may suspend or terminate access to the Platform if:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You violate these Terms</li>
              <li>We suspect fraudulent or abusive activity</li>
            </ul>
          </Section>

          <Section title="15. Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with the laws of Bangalore, India.
            </p>
          </Section>

          <Section title="16. Contact Information">
            <p>For any queries or support, please contact:</p>
            <div>
              <p>
                Email:{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#4055FF] underline">
                  {SUPPORT_EMAIL}
                </a>
              </p>
              <p className="font-semibold text-foreground mt-2">Company: Fospe Software Private Limited</p>
            </div>
          </Section>
        </div>
      </main>
    </div>
  );
}
