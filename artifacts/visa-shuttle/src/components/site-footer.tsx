import { Link } from "wouter";
import { Logo } from "@/components/logo";

const footerColumns = [
  {
    title: "For Individuals",
    links: [
      { label: "Basic Check", href: "/check" },
      { label: "Deep Check", href: "/deep-check" },
      { label: "Pro Plan", href: "/pricing" },
      { label: "Fake Visa Detector", href: "/visa-tools/fake_visa" },
      { label: "Fake Agency Detector", href: "/visa-tools/fake_agency" },
      { label: "Fake Employment Detector", href: "/visa-tools/fake_employment_offer" },
    ],
  },
  {
    title: "For Business",
    links: [
      { label: "Agency CRM", href: "/business/agency-crm" },
      { label: "Business API", href: "/api-pricing" },
      { label: "Enterprise Solutions", href: "/business" },
      { label: "Whitelabel Solutions", href: "/business" },
      { label: "Agentic Visa AI", href: "/business" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "How It Works", href: "/help" },
      { label: "Help & Support", href: "/help" },
      { label: "FAQ", href: "/pricing" },
      { label: "Report a Bug", href: "/report-bug" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Our Company", href: "/business" },
      { label: "News Updates", href: "/help" },
      { label: "Careers", href: "/help" },
      { label: "Contact", href: "/#contact" },
    ],
  },
  {
    title: "Terms & Policies",
    links: [
      { label: "Privacy & Cookies", href: "/privacy-policy" },
      { label: "Terms and Conditions", href: "/terms-and-conditions" },
      { label: "Refund Policy", href: "/refund-policy" },
      { label: "Data Policy", href: "/privacy-policy" },
      { label: "3rd Party Integration Policy", href: "/terms-and-conditions" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t bg-background px-4 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-9 flex flex-col gap-4 border-b pb-8 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <Logo size="sm" />
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              AI-powered visa checks, fraud-risk tools, and agency automation for individuals and businesses.
            </p>
          </div>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground md:text-right">
            AI-based estimation only. Does not guarantee visa approval.
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3 text-sm font-bold text-foreground">{column.title}</h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    {link.href.startsWith("/#") ? (
                      <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {link.label}
                      </a>
                    ) : (
                      <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Visa Shuttle. All rights reserved.</p>
          <p>Fospe Software Private Limited</p>
        </div>
      </div>
    </footer>
  );
}
