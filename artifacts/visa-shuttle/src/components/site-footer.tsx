import { Link } from "wouter";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaXTwitter } from "react-icons/fa6";
import { Logo } from "@/components/logo";

const footerColumns = [
  {
    title: "For Individuals",
    links: [
      { label: "Basic Check", href: "/plans/basic-check" },
      { label: "Deep Check", href: "/plans/deep-check" },
      { label: "Pro Plan", href: "/plans/pro" },
      { label: "✈️ Travel Virtual Sticker", href: "/travel-sticker" },
      { label: "Fake Visa Detector", href: "/tools/fake-visa-detector" },
      { label: "Rejection Recovery", href: "/tools/rejection-recovery" },
      { label: "Fake Agency Detector", href: "/tools/fake-agency-detector" },
      { label: "Fake Employment Detector", href: "/tools/fake-employment-detector" },
    ],
  },
  {
    title: "For Business",
    links: [
      { label: "Visa Desk", href: "/business/visa-desk" },
      { label: "Student Counselling", href: "/business/student-counselling" },
      { label: "Growth Hub", href: "/business/growth-hub" },
      { label: "Business API", href: "/business/api" },
      { label: "Enterprise Solutions", href: "/business/enterprise" },
      { label: "Whitelabel Solutions", href: "/business/whitelabel" },
      { label: "Agentic Visa AI", href: "/business/agentic-visa-ai" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "How It Works", href: "/help" },
      { label: "Help & Support", href: "/help" },
      { label: "FAQ", href: "/pricing" },
      { label: "Report a Bug", href: "/report-bug" },
      { label: "Version Logs", href: "/version-logs" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "Our Company", href: "/about" },
      { label: "Updates", href: "/updates" },
      { label: "Careers", href: "/careers" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Terms & Policies",
    links: [
      { label: "Privacy & Cookies", href: "/privacy-policy" },
      { label: "Terms and Conditions", href: "/terms-and-conditions" },
      { label: "Refund Policy", href: "/refund-policy" },
      { label: "Data Policy", href: "/data-policy" },
      { label: "3rd Party Integration Policy", href: "/third-party-integration-policy" },
    ],
  },
];

const socialLinks = [
  { label: "Facebook", href: "http://facebook.com/visashuttle", icon: FaFacebookF },
  { label: "Instagram", href: "http://instagram.com/visashuttle", icon: FaInstagram },
  { label: "X", href: "http://x.com/visa_shuttle", icon: FaXTwitter },
  { label: "LinkedIn", href: "http://linkedin.com/company/visashuttle", icon: FaLinkedinIn },
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
            <div className="flex items-center gap-2">
              {socialLinks.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  title={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/80 text-muted-foreground transition-colors hover:border-[#4055FF]/40 hover:bg-[#4055FF]/10 hover:text-[#4055FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4055FF]/35"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
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
                    {link.href.startsWith("http") ? (
                      <a href={link.href} target="_blank" rel="noreferrer" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                        {link.label}
                      </a>
                    ) : link.href.startsWith("/#") ? (
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
