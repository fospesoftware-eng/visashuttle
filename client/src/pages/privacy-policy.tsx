import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Shield, Cookie, FileText } from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const LAST_UPDATED = "25 April 2025";
const EMAIL = "legal@visashuttle.com";

export default function PrivacyPolicyPage() {
  const [tab, setTab] = useState<"privacy" | "terms" | "cookies">("privacy");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <button className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <Logo size="sm" />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Legal</h1>
          <p className="text-muted-foreground text-sm">Last updated: {LAST_UPDATED}</p>
        </div>

        <div className="flex gap-1 p-1 bg-muted rounded-xl mb-8 w-fit">
          {[
            { key: "privacy", label: "Privacy Policy", icon: Shield },
            { key: "cookies", label: "Cookie Policy", icon: Cookie },
            { key: "terms", label: "Terms & Conditions", icon: FileText },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed">
          {tab === "privacy" && <PrivacyPolicy />}
          {tab === "cookies" && <CookiePolicy />}
          {tab === "terms" && <TermsAndConditions />}
        </div>

        <div className="mt-12 pt-6 border-t text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-2">
          <span>© {new Date().getFullYear()} Visa Shuttle. All rights reserved.</span>
          <a href={`mailto:${EMAIL}`} className="hover:text-foreground transition-colors">{EMAIL}</a>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold mb-2 text-foreground">{title}</h2>
      <div className="text-muted-foreground space-y-2">{children}</div>
    </section>
  );
}

function PrivacyPolicy() {
  return (
    <>
      <p className="text-muted-foreground">This Privacy Policy explains how Visa Shuttle collects, uses, stores and shares your personal data when you use our website and services.</p>

      <Section title="1. Data Controller">
        <p>Visa Shuttle is the data controller for all personal data collected through this website. For privacy enquiries contact <a href={`mailto:${EMAIL}`} className="text-[#4055FF] underline">{EMAIL}</a>.</p>
      </Section>

      <Section title="2. Data We Collect">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Account data:</strong> Full name, email address, phone number, and hashed password when you register.</li>
          <li><strong className="text-foreground">Visa check data:</strong> Nationality, travel destination, employment, income, bank balance, travel history and other profile information you provide to generate visa estimates.</li>
          <li><strong className="text-foreground">Usage data:</strong> Pages visited, features used, timestamps, device type, browser, and IP address.</li>
          <li><strong className="text-foreground">Cookie data:</strong> Session identifiers and, with consent, analytics identifiers.</li>
        </ul>
      </Section>

      <Section title="3. How We Use Your Data">
        <ul className="list-disc pl-5 space-y-1">
          <li>To create and manage your account</li>
          <li>To generate AI-powered visa probability estimates</li>
          <li>To send OTP codes and transactional emails</li>
          <li>To detect and prevent fraud and abuse</li>
          <li>To analyse usage patterns and improve the Service</li>
          <li>To comply with legal and regulatory obligations</li>
        </ul>
      </Section>

      <Section title="4. Legal Basis (GDPR Article 6)">
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Contract performance</strong> — to deliver the Service you signed up for</li>
          <li><strong className="text-foreground">Legitimate interests</strong> — security, fraud prevention, product improvement</li>
          <li><strong className="text-foreground">Consent</strong> — analytics cookies and optional marketing communications</li>
          <li><strong className="text-foreground">Legal obligation</strong> — compliance with applicable law</li>
        </ul>
      </Section>

      <Section title="5. Data Sharing">
        <p>We do not sell your personal data. We share data only with:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>AI providers (to process and generate visa estimates), under strict data processing agreements</li>
          <li>Payment processors (for paid transactions), who operate under PCI-DSS standards</li>
          <li>Cloud hosting and infrastructure providers, under data processing agreements</li>
          <li>Law enforcement or regulatory authorities, if legally required</li>
        </ul>
      </Section>

      <Section title="6. International Transfers">
        <p>Some of our service providers are based outside the EEA. Where your data is transferred internationally, we ensure appropriate safeguards such as Standard Contractual Clauses (SCCs) or adequacy decisions are in place.</p>
      </Section>

      <Section title="7. Data Retention">
        <ul className="list-disc pl-5 space-y-1">
          <li>Account data: retained for the duration of your account, plus 90 days after deletion</li>
          <li>Visa check results: retained for 24 months to allow access to your history</li>
          <li>Anonymised analytics data: may be retained indefinitely</li>
        </ul>
      </Section>

      <Section title="8. Your Rights">
        <p>Under GDPR, you have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Access</strong> — request a copy of your personal data</li>
          <li><strong className="text-foreground">Rectification</strong> — correct inaccurate data</li>
          <li><strong className="text-foreground">Erasure</strong> — request deletion of your data ("right to be forgotten")</li>
          <li><strong className="text-foreground">Restriction</strong> — limit processing in certain circumstances</li>
          <li><strong className="text-foreground">Portability</strong> — receive your data in a machine-readable format</li>
          <li><strong className="text-foreground">Objection</strong> — object to processing based on legitimate interests</li>
          <li><strong className="text-foreground">Withdraw consent</strong> — at any time, without affecting prior processing</li>
        </ul>
        <p>To exercise any right, email <a href={`mailto:${EMAIL}`} className="text-[#4055FF] underline">{EMAIL}</a>. We will respond within 30 days. You also have the right to lodge a complaint with the ICO (ico.org.uk).</p>
      </Section>

      <Section title="9. Data Security">
        <p>We implement industry-standard security measures including encrypted data transmission (TLS), hashed passwords, access controls, and regular security reviews. No system is 100% secure; please use a strong unique password and keep your credentials private.</p>
      </Section>

      <Section title="10. Children">
        <p>The Service is not directed to children under 18. We do not knowingly collect personal data from minors.</p>
      </Section>

      <Section title="11. Changes to This Policy">
        <p>We may update this policy from time to time. Material changes will be communicated by email or a notice on the website at least 14 days before taking effect.</p>
      </Section>
    </>
  );
}

function CookiePolicy() {
  function resetConsent() {
    localStorage.removeItem("vs_cookie_consent");
    window.location.reload();
  }

  return (
    <>
      <p className="text-muted-foreground">This Cookie Policy explains what cookies are, which cookies Visa Shuttle uses, and how you can control them.</p>

      <Section title="1. What Are Cookies?">
        <p>Cookies are small text files stored on your device when you visit a website. They help websites remember your preferences and understand how you interact with their pages.</p>
      </Section>

      <Section title="2. Cookies We Use">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse mt-2">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4 font-semibold text-foreground">Name</th>
                <th className="text-left py-2 pr-4 font-semibold text-foreground">Category</th>
                <th className="text-left py-2 pr-4 font-semibold text-foreground">Purpose</th>
                <th className="text-left py-2 font-semibold text-foreground">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { name: "vs_session", cat: "Essential", purpose: "Maintains your logged-in session", duration: "Session" },
                { name: "vs_cookie_consent", cat: "Essential", purpose: "Stores your cookie preferences", duration: "1 year" },
                { name: "theme", cat: "Preferences", purpose: "Remembers light/dark mode setting", duration: "1 year" },
                { name: "_vs_analytics", cat: "Analytics", purpose: "Tracks page views and feature usage anonymously", duration: "90 days" },
              ].map(row => (
                <tr key={row.name}>
                  <td className="py-2 pr-4 font-mono text-foreground">{row.name}</td>
                  <td className="py-2 pr-4">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      row.cat === "Essential" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                      row.cat === "Analytics" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}>{row.cat}</span>
                  </td>
                  <td className="py-2 pr-4">{row.purpose}</td>
                  <td className="py-2">{row.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="3. Your Choices">
        <p>You can control cookies in several ways:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong className="text-foreground">Cookie banner:</strong> When you first visit, choose "Accept All" or "Essential Only".</li>
          <li><strong className="text-foreground">Reset preferences:</strong> Click the button below to reset your cookie consent and see the banner again.</li>
          <li><strong className="text-foreground">Browser settings:</strong> Most browsers allow you to block or delete cookies. Note that blocking essential cookies may prevent the site from working correctly.</li>
        </ul>
        <button
          onClick={resetConsent}
          className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-[#4055FF]/40 text-[#4055FF] hover:bg-[#4055FF]/5 transition-colors"
        >
          Reset Cookie Preferences
        </button>
      </Section>

      <Section title="4. Third-Party Cookies">
        <p>We do not embed third-party advertising or social media trackers. Our AI processing partners may set technical cookies required for API communication; these are covered under our data processing agreements.</p>
      </Section>

      <Section title="5. Contact">
        <p>Questions about our use of cookies? Email <a href={`mailto:${EMAIL}`} className="text-[#4055FF] underline">{EMAIL}</a>.</p>
      </Section>
    </>
  );
}

function TermsAndConditions() {
  return (
    <>
      <p className="text-muted-foreground">By using Visa Shuttle you agree to these Terms and Conditions. Please read them carefully.</p>

      <Section title="1. Acceptance">
        <p>By accessing or using Visa Shuttle ("the Service"), you confirm you are at least 18 years old and agree to be bound by these Terms. If you do not agree, do not use the Service.</p>
      </Section>

      <Section title="2. Nature of the Service — Important Disclaimer">
        <p>Visa Shuttle provides <strong className="text-foreground">AI-powered visa probability estimates only</strong>. All results are for informational purposes and <strong className="text-foreground">do not constitute legal advice, immigration advice, or a guarantee of any visa outcome</strong>. You must consult a licensed immigration lawyer or registered adviser before making visa application decisions. Visa Shuttle is not responsible for visa refusals, travel disruptions, or losses arising from use of our estimates.</p>
      </Section>

      <Section title="3. AI Disclaimer">
        <p>Our AI models are trained on generalised patterns and cannot account for every individual circumstance, consular discretion, or policy change. Scores are probabilistic estimates, not predictions. Past patterns do not guarantee future outcomes.</p>
      </Section>

      <Section title="4. Account Registration">
        <p>You agree to provide accurate, current, and complete information. You are responsible for all activity under your account. Notify us immediately of any unauthorised access at {EMAIL}.</p>
      </Section>

      <Section title="5. Acceptable Use">
        <p>You may not: submit false information, scrape or copy our data or AI outputs, attempt to reverse-engineer our models, use the Service for unlawful purposes, or create multiple accounts to circumvent limits. We reserve the right to suspend accounts without notice for violations.</p>
      </Section>

      <Section title="6. Payments and Refunds">
        <p>Deep Check assessments are charged at the point of submission. Completed checks are non-refundable due to computational costs. If a technical error prevents delivery, contact {EMAIL} within 7 days for review.</p>
      </Section>

      <Section title="7. Intellectual Property">
        <p>All content, software, and AI models are the intellectual property of Visa Shuttle. You may not reproduce, distribute, or create derivative works without our written consent.</p>
      </Section>

      <Section title="8. Limitation of Liability">
        <p>To the fullest extent permitted by law, Visa Shuttle shall not be liable for indirect, incidental, special, or consequential damages. Our aggregate liability shall not exceed the greater of £50 or the amount paid by you in the preceding 30 days.</p>
      </Section>

      <Section title="9. Governing Law">
        <p>These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
      </Section>

      <Section title="10. Changes">
        <p>We may revise these Terms at any time. Continued use after changes constitutes acceptance of the updated Terms.</p>
      </Section>

      <Section title="11. Contact">
        <p><a href={`mailto:${EMAIL}`} className="text-[#4055FF] underline">{EMAIL}</a></p>
      </Section>
    </>
  );
}
