import type { ReactNode } from "react";
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
          <p className="text-sm text-muted-foreground">Effective Date: May 1, 2026</p>
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8 text-sm md:text-base">
          <p className="text-muted-foreground leading-relaxed">
            Welcome to visashuttle.com (“Website”, “Platform”), a product of Fospe Software Private Limited (“Company”, “we”, “our”, “us”).
          </p>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using this Platform, you agree to be bound by these Terms and Conditions (“Terms”). If you do not agree, you must not use the Platform.
          </p>

          <Section title="1. Use of the Platform">
            <p>Visa Shuttle provides AI-powered visa assistance tools, including but not limited to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Visa eligibility assessments</li>
              <li>Approval probability predictions</li>
              <li>Document guidance and automation</li>
              <li>User dashboards and saved profiles</li>
            </ul>
            <p>You agree to use the Platform only for lawful purposes and in compliance with applicable laws.</p>
          </Section>

          <Section title="2. Eligibility">
            <p>You must:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Be at least 18 years old</li>
              <li>Provide accurate and complete information</li>
              <li>Not use the Platform for fraudulent or illegal activities</li>
            </ul>
          </Section>

          <Section title="3. User Accounts">
            <p>To access certain features, you must create an account.</p>
            <p>You agree to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Maintain confidentiality of login credentials</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of unauthorized access</li>
            </ul>
            <p>We reserve the right to suspend or terminate accounts at our discretion.</p>
          </Section>

          <Section title="4. Services & Disclaimer">
            <p>Visa Shuttle provides informational and predictive services only.</p>
            <p className="font-semibold text-foreground">Important:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>We are not a government authority</li>
              <li>We do not guarantee visa approval</li>
              <li>AI-based predictions are estimates only</li>
            </ul>
            <p>Final decisions are made solely by:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Embassies</li>
              <li>Consulates</li>
              <li>Immigration authorities</li>
            </ul>
          </Section>

          <Section title="5. Payments & Subscriptions">
            <p>Some features may be paid, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Deep visa checks</li>
              <li>Advanced analytics</li>
              <li>Premium tools</li>
            </ul>
            <p className="font-semibold text-foreground">Payment Terms:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>All fees are non-refundable unless stated otherwise</li>
              <li>Pricing may change without prior notice</li>
              <li>Subscription plans renew automatically unless canceled</li>
            </ul>
          </Section>

          <Section title="6. Intellectual Property">
            <p>All content, including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Software</li>
              <li>Design</li>
              <li>Branding</li>
              <li>Algorithms</li>
            </ul>
            <p>are owned by Fospe Software Private Limited.</p>
            <p>You may not:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Copy, reproduce, or distribute</li>
              <li>Reverse engineer the system</li>
              <li>Use the platform for competitive purposes</li>
            </ul>
          </Section>

          <Section title="7. User Data & Privacy">
            <p>
              By using the Platform, you agree to our{" "}
              <Link href="/privacy-policy" className="text-[#4055FF] underline">
                Privacy Policy
              </Link>
              .
            </p>
            <p>You consent to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Collection of personal data</li>
              <li>Use of data for AI processing and improvements</li>
              <li>Storage of user inputs for service functionality</li>
            </ul>
            <p>We take reasonable measures to protect your data but cannot guarantee absolute security.</p>
          </Section>

          <Section title="8. Prohibited Activities">
            <p>You agree NOT to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Submit false or misleading information</li>
              <li>Attempt to hack or disrupt the system</li>
              <li>Use bots or automation to abuse the platform</li>
              <li>Resell services without authorization</li>
            </ul>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>To the maximum extent permitted by law:</p>
            <p>We are not liable for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Visa rejections</li>
              <li>Financial losses</li>
              <li>Incorrect predictions</li>
              <li>Service interruptions</li>
            </ul>
            <p>Your use of the Platform is at your own risk.</p>
          </Section>

          <Section title="10. Third-Party Services">
            <p>The Platform may integrate with third-party services.</p>
            <p>We are not responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Third-party content</li>
              <li>External links</li>
              <li>Service reliability of third parties</li>
            </ul>
          </Section>

          <Section title="11. Termination">
            <p>We may suspend or terminate access if:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You violate these Terms</li>
              <li>You misuse the platform</li>
              <li>Required by law</li>
            </ul>
          </Section>

          <Section title="12. Changes to Terms">
            <p>We may update these Terms at any time.</p>
            <p>Continued use of the Platform means:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You accept the updated Terms</li>
            </ul>
          </Section>

          <Section title="13. Governing Law">
            <p>These Terms are governed by the laws of India.</p>
            <p>Any disputes shall be subject to the exclusive jurisdiction of the courts in Bangalore, Karnataka, India.</p>
          </Section>

          <Section title="14. Contact Information">
            <p>For any questions or concerns:</p>
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

          <Section title="15. Acceptance of Terms">
            <p>By using this Platform, you confirm that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You have read these Terms</li>
              <li>You agree to be legally bound by them</li>
            </ul>
          </Section>
        </div>
      </main>
    </div>
  );
}
