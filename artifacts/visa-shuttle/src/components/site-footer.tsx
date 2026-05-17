import { Link } from "wouter";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return (
    <footer className="py-10 border-t px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/business" className="hover:text-foreground transition-colors">For Business</Link>
            <Link href="/business/agency-crm" className="hover:text-foreground transition-colors">Agency CRM</Link>
            <a href="/#contact" className="hover:text-foreground transition-colors">Contact</a>
            <Link href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy & Cookies</Link>
            <Link href="/terms-and-conditions" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/refund-policy" className="hover:text-foreground transition-colors">Refund Policy</Link>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-sm">
            AI-based estimation only. Does not guarantee visa approval.
          </p>
        </div>
      </div>
    </footer>
  );
}
