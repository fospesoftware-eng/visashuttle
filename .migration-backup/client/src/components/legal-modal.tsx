import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

type LegalType = "terms" | "privacy";

interface LegalModalProps {
  open: boolean;
  onClose: () => void;
  type: LegalType;
}

const LAST_UPDATED = "25 April 2025";
const COMPANY = "Visa Shuttle";
const EMAIL = "legal@visashuttle.com";

function TermsContent() {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-5 text-sm leading-relaxed text-foreground">
      <p className="text-muted-foreground text-xs">Last updated: {LAST_UPDATED}</p>

      <section>
        <h3 className="font-semibold text-base mb-1">1. Acceptance of Terms</h3>
        <p>By accessing or using {COMPANY} ("the Service"), you confirm that you are at least 18 years old and agree to be bound by these Terms and Conditions. If you do not agree, please do not use the Service.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">2. Nature of the Service</h3>
        <p>{COMPANY} provides AI-powered visa probability estimates based on information you provide. <strong>All results are for informational purposes only and do not constitute legal advice, immigration advice, or a guarantee of any visa outcome.</strong> You should consult a licensed immigration lawyer or adviser before making any visa application decisions.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">3. AI Estimates Disclaimer</h3>
        <p>Our AI models are trained on generalised data and cannot account for every individual circumstance, policy change, or embassy discretion. Scores may not reflect your actual probability of approval. {COMPANY} accepts no liability for any visa refusals, travel disruptions, or financial losses arising from reliance on our estimates.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">4. Account Registration</h3>
        <p>You agree to provide accurate, current, and complete information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activity under your account.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">5. Acceptable Use</h3>
        <p>You may not use the Service to submit false or misleading information, scrape or copy our data, attempt to reverse-engineer our AI models, or engage in any unlawful activity. We reserve the right to suspend accounts that violate these terms.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">6. Payment and Refunds</h3>
        <p>Paid checks (Deep Check) are charged at the point of submission. Due to the computational cost of AI analysis, completed checks are non-refundable. If a technical error prevents delivery of results, contact us at {EMAIL} within 7 days.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">7. Intellectual Property</h3>
        <p>All content, design, and AI models on the Service are the intellectual property of {COMPANY}. You may not reproduce, distribute, or create derivative works without our prior written consent.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">8. Limitation of Liability</h3>
        <p>To the maximum extent permitted by law, {COMPANY} shall not be liable for any indirect, incidental, special, or consequential damages. Our total liability for any claim shall not exceed the amount you paid us in the 30 days preceding the claim.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">9. Governing Law</h3>
        <p>These Terms are governed by the laws of England and Wales. Disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">10. Changes to Terms</h3>
        <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes your acceptance of the revised Terms.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">11. Contact</h3>
        <p>For questions about these Terms, contact us at <a href={`mailto:${EMAIL}`} className="text-[#4055FF] underline">{EMAIL}</a>.</p>
      </section>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none space-y-5 text-sm leading-relaxed text-foreground">
      <p className="text-muted-foreground text-xs">Last updated: {LAST_UPDATED}</p>

      <section>
        <h3 className="font-semibold text-base mb-1">1. Who We Are</h3>
        <p>{COMPANY} ("we", "us", "our") is the data controller for personal data collected through this website. Contact: <a href={`mailto:${EMAIL}`} className="text-[#4055FF] underline">{EMAIL}</a>.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">2. Data We Collect</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account data:</strong> Name, email address, phone number, password (hashed).</li>
          <li><strong>Visa check data:</strong> Nationality, destination, employment, financial information, travel history — provided by you to generate visa estimates.</li>
          <li><strong>Usage data:</strong> Pages visited, check history, device/browser type, IP address.</li>
          <li><strong>Cookies:</strong> Session cookies (essential) and analytics cookies (with consent).</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">3. How We Use Your Data</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>To provide and improve the Service</li>
          <li>To generate AI visa probability estimates</li>
          <li>To send transactional communications (OTP codes, account notices)</li>
          <li>To comply with legal obligations</li>
          <li>To detect fraud and maintain security</li>
        </ul>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">4. Legal Basis (GDPR)</h3>
        <p>We process your data on the following legal bases: <strong>contract performance</strong> (to deliver the Service you signed up for), <strong>legitimate interests</strong> (security, fraud prevention, service improvement), and <strong>consent</strong> (analytics cookies, marketing).</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">5. Cookies</h3>
        <p>We use the following categories of cookies:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Essential:</strong> Required for the Service to function (session authentication, security). Cannot be disabled.</li>
          <li><strong>Analytics:</strong> Help us understand how visitors use the site (e.g., page views, feature usage). Only set with your consent.</li>
          <li><strong>Preferences:</strong> Remember your settings (theme, country). Only set with consent.</li>
        </ul>
        <p className="mt-2">You can withdraw cookie consent at any time by clicking "Cookie Settings" in the footer or clearing your browser cookies.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">6. Data Sharing</h3>
        <p>We do not sell your personal data. We may share data with trusted processors: our AI provider (for generating estimates), payment processors, and cloud hosting providers — all under data processing agreements. We may disclose data to law enforcement if legally required.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">7. Data Retention</h3>
        <p>Account data is retained for as long as your account is active plus 90 days after deletion. Visa check results are retained for 24 months to allow you to access your history. Anonymised analytics data may be retained indefinitely.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">8. Your Rights (GDPR)</h3>
        <p>You have the right to: access your data, rectify inaccuracies, erase your data ("right to be forgotten"), restrict processing, data portability, and object to processing. To exercise any right, email <a href={`mailto:${EMAIL}`} className="text-[#4055FF] underline">{EMAIL}</a>. We will respond within 30 days.</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">9. International Transfers</h3>
        <p>Your data may be processed outside the EEA. Where this occurs, we ensure appropriate safeguards are in place (Standard Contractual Clauses or adequacy decisions).</p>
      </section>

      <section>
        <h3 className="font-semibold text-base mb-1">10. Changes to This Policy</h3>
        <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or a prominent notice on the site.</p>
      </section>
    </div>
  );
}

export function LegalModal({ open, onClose, type }: LegalModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-xl font-bold">
            {type === "terms" ? "Terms & Conditions" : "Privacy & Cookie Policy"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-6 py-5">
            {type === "terms" ? <TermsContent /> : <PrivacyContent />}
          </div>
        </ScrollArea>
        <div className="px-6 py-4 border-t flex-shrink-0">
          <Button onClick={onClose} className="w-full border-0 text-white hover:opacity-90" style={{background:"linear-gradient(135deg,#4055FF,#9033F5)"}}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
