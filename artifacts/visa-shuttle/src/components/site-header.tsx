import { Link } from "wouter";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { useB2cAuth } from "@/hooks/use-b2c-auth";

export function SiteHeader() {
  const { user } = useB2cAuth();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Logo size="md" />
        <nav className="hidden md:flex items-center gap-6">
          <a href="/#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
          <Link href="/visa-check" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Visa Check</Link>
          <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          <Link href="/business" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">For Business</Link>
          <a href="/#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Contact</a>
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <Link href="/account">
              <Button size="sm" className="gap-2 border-0 text-white hover:opacity-90" style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }} data-testid="button-account">
                My Account
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/sign-in">
                <Button variant="ghost" size="sm" data-testid="button-signin">Sign In</Button>
              </Link>
              <Link href="/join">
                <Button size="sm" className="border-0 text-white hover:opacity-90" style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }} data-testid="button-join">
                  Start Basic Check ₹0
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
