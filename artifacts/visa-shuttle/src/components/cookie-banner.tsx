import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Cookie, X, ShieldCheck, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "vs_cookie_consent";

export type CookieConsent = "accepted" | "essential";

export function getCookieConsent(): CookieConsent | null {
  try {
    return localStorage.getItem(STORAGE_KEY) as CookieConsent | null;
  } catch {
    return null;
  }
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const stored = getCookieConsent();
    if (!stored) {
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setVisible(false);
  }

  function essential() {
    localStorage.setItem(STORAGE_KEY, "essential");
    setVisible(false);
  }

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "essential");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-14 sm:bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-1rem)] sm:w-[calc(100%-2rem)] max-w-2xl"
      style={{ animation: "cookie-slide-up 0.35s ease-out both" }}
      data-testid="cookie-banner"
    >
      <style>{`
        @keyframes cookie-slide-up {
          from { transform: translateX(-50%) translateY(30px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);   opacity: 1; }
        }
      `}</style>

      <div className="rounded-2xl border bg-white dark:bg-slate-950 shadow-2xl overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="hidden sm:flex flex-shrink-0 w-10 h-10 rounded-xl bg-[#4055FF]/10 items-center justify-center">
              <Cookie className="w-5 h-5 text-[#4055FF]" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="font-semibold text-sm">We use cookies 🍪</p>
                <button
                  onClick={dismiss}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  aria-label="Dismiss"
                  data-testid="button-cookie-dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We use essential cookies to keep the site working, and optional analytics cookies to improve your experience. By clicking "Accept All" you consent to all cookies. See our{" "}
                <Link href="/privacy-policy" className="text-[#4055FF] underline underline-offset-2">
                  Privacy & Cookie Policy
                </Link>{" "}
                for details.
              </p>

              {expanded && (
                <div className="mt-3 space-y-2 border rounded-lg p-3 bg-muted/40">
                  <div className="flex items-start gap-2 text-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Essential Cookies</p>
                      <p className="text-muted-foreground">Required for authentication and security. Always active.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <BarChart2 className="w-3.5 h-3.5 text-[#4055FF] mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Analytics Cookies</p>
                      <p className="text-muted-foreground">Help us understand site usage to improve the product. Only set with consent.</p>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setExpanded(e => !e)}
                className="text-xs text-[#4055FF] mt-2 hover:underline"
                data-testid="button-cookie-manage"
              >
                {expanded ? "Hide details" : "Manage preferences"}
              </button>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={essential}
              className="flex-1 text-xs"
              data-testid="button-cookie-essential"
            >
              Essential Only
            </Button>
            <Button
              size="sm"
              onClick={accept}
              className="flex-1 text-xs border-0 text-white hover:opacity-90"
              style={{ background: "linear-gradient(135deg,#4055FF,#9033F5)" }}
              data-testid="button-cookie-accept"
            >
              Accept All
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
