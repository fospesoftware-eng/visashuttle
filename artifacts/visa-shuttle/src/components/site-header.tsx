import { Link } from "wouter";
import { useState } from "react";
import { ChevronRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useB2cAuth } from "@/hooks/use-b2c-auth";
import { formatB2cPrice, getStoredB2cCurrency } from "@/lib/b2c-pricing";

export function SiteHeader() {
  const { user } = useB2cAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const basicCheckPrice = formatB2cPrice(getStoredB2cCurrency(), 0);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const navItems = [
    { label: "How It Works", href: "/#how-it-works", anchor: true },
    { label: "Pricing", href: "/pricing" },
    { label: "For Business", href: "/business" },
    { label: "Growth Hub", href: "/business/growth-hub" },
    { label: "Help", href: "/help" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Logo size="md" />
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) =>
            item.anchor ? (
              <a key={item.href} href={item.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {item.label}
              </Link>
            )
          )}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <Link href="/account" className="hidden md:inline-flex">
              <Button size="sm" className="gap-2 border-0 text-white hover:opacity-90" style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }} data-testid="button-account">
                My Account
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="hidden md:inline-flex">
                <Button variant="ghost" size="sm" data-testid="button-signin">Sign In</Button>
              </Link>
              <Link href="/join" className="hidden md:inline-flex">
                <Button size="sm" className="border-0 text-white hover:opacity-90" style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }} data-testid="button-join">
                  Start Basic Check {basicCheckPrice}
                </Button>
              </Link>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen((open) => !open)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background/98 backdrop-blur-xl shadow-lg">
          <div className="mx-auto max-w-7xl px-4 py-4">
            <nav className="grid gap-1">
              {navItems.map((item) =>
                item.anchor ? (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className="rounded-lg px-3 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </a>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileMenu}
                    className="rounded-lg px-3 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                )
              )}
            </nav>
            <div className="mt-4 grid gap-2 border-t pt-4">
              {user ? (
                <Link href="/account" onClick={closeMobileMenu}>
                  <Button className="w-full gap-2 border-0 text-white hover:opacity-90" style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }} data-testid="button-mobile-account">
                    My Account
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/sign-in" onClick={closeMobileMenu}>
                    <Button variant="outline" className="w-full" data-testid="button-mobile-signin">Sign In</Button>
                  </Link>
                  <Link href="/join" onClick={closeMobileMenu}>
                    <Button className="w-full border-0 text-white hover:opacity-90" style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }} data-testid="button-mobile-join">
                      Start Basic Check {basicCheckPrice}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
