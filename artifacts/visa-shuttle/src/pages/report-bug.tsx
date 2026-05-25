import { useMemo, useState } from "react";
import { AlertTriangle, Bug, CheckCircle2, LifeBuoy, Mail, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SUPPORT_EMAIL = "support@visashuttle.com";

export default function ReportBugPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    area: "website",
    severity: "medium",
    title: "",
    steps: "",
    expected: "",
    actual: "",
  });

  const diagnostics = useMemo(() => {
    if (typeof window === "undefined") return "";
    return [
      `Page URL: ${window.location.href}`,
      `Browser: ${navigator.userAgent}`,
      `Viewport: ${window.innerWidth}x${window.innerHeight}`,
      `Time: ${new Date().toISOString()}`,
    ].join("\n");
  }, []);

  const canSubmit = form.title.trim() && form.steps.trim() && form.email.trim();

  function update(key: keyof typeof form, value: string) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function submitReport() {
    const subject = `Visa Shuttle bug report: ${form.title.trim() || "Issue report"}`;
    const body = [
      "Bug Report",
      "",
      `Name: ${form.name || "-"}`,
      `Email: ${form.email || "-"}`,
      `Product area: ${form.area}`,
      `Severity: ${form.severity}`,
      "",
      "Summary:",
      form.title || "-",
      "",
      "Steps to reproduce:",
      form.steps || "-",
      "",
      "Expected result:",
      form.expected || "-",
      "",
      "Actual result:",
      form.actual || "-",
      "",
      "Diagnostics:",
      diagnostics,
    ].join("\n");
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <section className="relative overflow-hidden px-4 py-14 md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_16%_0%,rgba(64,85,255,0.10),transparent_32%),radial-gradient(circle_at_88%_10%,rgba(255,32,96,0.08),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-9 max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#4055FF]/15 bg-white px-3 py-1.5 text-sm font-semibold text-[#4055FF] shadow-sm">
              <Bug className="h-3.5 w-3.5" />
              Report a Bug
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-6xl">
              Tell us what broke, and we’ll investigate.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Share what happened, where it happened, and the steps to reproduce it. We include basic browser diagnostics in your email draft to help our team fix it faster.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_0.45fr]">
            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5 md:p-7">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Your name</Label>
                    <Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Full name" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email address *</Label>
                    <Input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="you@example.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Product area</Label>
                    <Select value={form.area} onValueChange={value => update("area", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="b2c-dashboard">B2C Dashboard</SelectItem>
                        <SelectItem value="visa-tools">Visa Tools</SelectItem>
                        <SelectItem value="visa-desk">Visa Desk</SelectItem>
                        <SelectItem value="payments">Payments</SelectItem>
                        <SelectItem value="login">Login / Signup</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Severity</Label>
                    <Select value={form.severity} onValueChange={value => update("severity", value)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5">
                  <Label>Bug summary *</Label>
                  <Input value={form.title} onChange={e => update("title", e.target.value)} placeholder="Short description of the issue" />
                </div>

                <div className="mt-4 space-y-1.5">
                  <Label>Steps to reproduce *</Label>
                  <Textarea rows={5} value={form.steps} onChange={e => update("steps", e.target.value)} placeholder="1. Open...\n2. Click...\n3. Error appears..." />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Expected result</Label>
                    <Textarea rows={4} value={form.expected} onChange={e => update("expected", e.target.value)} placeholder="What should have happened?" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Actual result</Label>
                    <Textarea rows={4} value={form.actual} onChange={e => update("actual", e.target.value)} placeholder="What happened instead?" />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button
                    className="gap-2 border-0 text-white hover:opacity-90"
                    style={{ background: "linear-gradient(135deg,#4055FF,#9033F5,#FF2060)" }}
                    disabled={!canSubmit}
                    onClick={submitReport}
                  >
                    <Send className="h-4 w-4" />
                    Send Bug Report
                  </Button>
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#4055FF] hover:underline">
                    <Mail className="h-4 w-4" />
                    {SUPPORT_EMAIL}
                  </a>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card className="border-slate-200 bg-white shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#4055FF]/10 text-[#4055FF]">
                    <LifeBuoy className="h-5 w-5" />
                  </div>
                  <h2 className="font-bold text-slate-950">What to include</h2>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                    <div className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />The page or feature where it happened.</div>
                    <div className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />Exact steps that trigger the issue.</div>
                    <div className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />Any error text or screenshot context.</div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-amber-200 bg-amber-50 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <h2 className="font-bold text-amber-950">Urgent issue?</h2>
                      <p className="mt-2 text-sm leading-6 text-amber-800">
                        For payment, login, or account lockout issues, include your account email and transaction reference if available.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 bg-white shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h2 className="font-bold text-slate-950">Privacy note</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Please avoid sending passport numbers, payment card details, or private documents unless our support team specifically asks for them.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
