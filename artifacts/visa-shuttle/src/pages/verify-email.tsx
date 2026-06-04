import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const status = params.get("status");

  const [state, setState] = useState<"loading" | "success" | "error">(
    status === "success" ? "success" : token ? "loading" : "error"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (status === "success") { setState("success"); return; }
    if (!token) { setState("error"); setMessage("No verification token found."); return; }

    fetch(`/api/b2c/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(r => {
        if (r.redirected || r.ok) { setState("success"); }
        else { return r.json().then(d => { throw new Error(d.error || "Verification failed"); }); }
      })
      .catch(err => { setState("error"); setMessage(err.message); });
  }, [token, status]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 p-8 text-center space-y-5">
        {state === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
            <h2 className="text-xl font-bold">Verifying your email…</h2>
            <p className="text-sm text-muted-foreground">Please wait a moment.</p>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Email verified!</h2>
            <p className="text-sm text-muted-foreground">Your email has been verified. You can now use Basic Check, Deep Check, and Visa Tools.</p>
            <Button className="w-full" onClick={() => navigate("/account")}>Go to Dashboard</Button>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Verification failed</h2>
            <p className="text-sm text-muted-foreground">{message || "This link is invalid or has expired. Please request a new verification email."}</p>
            <Button className="w-full" onClick={() => navigate("/account")}>Go to Dashboard</Button>
          </>
        )}
      </div>
    </div>
  );
}
