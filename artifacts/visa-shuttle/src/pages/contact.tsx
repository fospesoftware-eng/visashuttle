import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { Building2, Clock, Mail, MapPin, MessageSquareText, Send, ShieldCheck } from "lucide-react";
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

const CONTACT_EMAIL = "hello@visashuttle.com";
const TOPICS = [
  { value: "basic-check", label: "Basic Check" },
  { value: "deep-check", label: "Deep Check" },
  { value: "pro-plan", label: "Pro Plan" },
  { value: "visa-tools", label: "Visa Tools" },
  { value: "agency-crm", label: "Agency CRM" },
  { value: "business-api", label: "Business API" },
  { value: "billing", label: "Billing & Payments" },
  { value: "technical-support", label: "Technical Support" },
  { value: "partnership", label: "Partnership / Sales" },
  { value: "other", label: "Other" },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", company: "", topic: "deep-check", message: "" });

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const subject = `Visa Shuttle contact: ${form.name || "Website enquiry"}`;
    const body = [
      "Contact Enquiry",
      "",
      `Name: ${form.name || "-"}`,
      `Email: ${form.email || "-"}`,
      `Company: ${form.company || "-"}`,
      `Topic: ${TOPICS.find((topic) => topic.value === form.topic)?.label || form.topic}`,
      "",
      "Message:",
      form.message || "-",
    ].join("\n");
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <section className="relative overflow-hidden px-4 py-14 md:py-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(64,85,255,0.10),transparent_34%),radial-gradient(circle_at_86%_8%,rgba(255,32,96,0.08),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="mb-10 max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#4055FF]/15 bg-white px-3 py-1.5 text-sm font-semibold text-[#4055FF] shadow-sm">
              <MessageSquareText className="h-4 w-4" />
              Contact Visa Shuttle
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Talk to our team</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              Questions about visa checks, agency CRM, business API access, billing, or support? Send us a message and
              the right team will follow up.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardContent className="flex gap-4 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#4055FF]/10 text-[#4055FF]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-950">Fospe Software Private Limited</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Visa Shuttle is operated by Fospe Software Private Limited.</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardContent className="flex gap-4 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FF2060]/10 text-[#FF2060]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-950">Office Address</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">Level 8, Tower I, UBB</p>
                    <p className="text-sm leading-6 text-slate-600">Cessna Business Park, ORR, Bangalore – 560 103</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardContent className="flex gap-4 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-950">Email</p>
                    <a href={`mailto:${CONTACT_EMAIL}`} className="mt-1 block text-sm font-semibold text-[#4055FF] hover:underline">
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <ShieldCheck className="mb-3 h-5 w-5 text-[#4055FF]" />
                  <p className="text-sm font-bold text-slate-950">Secure support</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Never share passwords, OTPs, or full payment details by email.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <Clock className="mb-3 h-5 w-5 text-[#FF2060]" />
                  <p className="text-sm font-bold text-slate-950">Response window</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Most enquiries are reviewed within 1 business day.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#4055FF]/20 bg-[#4055FF]/5 p-5 shadow-sm">
                <p className="text-sm font-bold text-slate-950">Signed agency users</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  For signed agencies, please use the in-app support system instead of this contact form.
                </p>
                <Link href="/app/support">
                  <Button variant="outline" className="mt-4 rounded-xl border-[#4055FF]/25 text-[#4055FF] hover:bg-[#4055FF]/10">
                    Open Agency Support
                  </Button>
                </Link>
              </div>
            </div>

            <Card className="rounded-3xl border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <CardContent className="p-6 md:p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">Send a message</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    This opens your email app with the details filled in, so you can review and send it securely.
                  </p>
                </div>

                <form className="space-y-5" onSubmit={handleSubmit}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">Name</Label>
                      <Input
                        id="contact-name"
                        value={form.name}
                        onChange={(event) => update("name", event.target.value)}
                        placeholder="Your name"
                        required
                        data-testid="input-contact-page-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email</Label>
                      <Input
                        id="contact-email"
                        type="email"
                        value={form.email}
                        onChange={(event) => update("email", event.target.value)}
                        placeholder="you@example.com"
                        required
                        data-testid="input-contact-page-email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-topic">Topic</Label>
                    <Select value={form.topic} onValueChange={(value) => update("topic", value)}>
                      <SelectTrigger id="contact-topic" data-testid="select-contact-page-topic">
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        {TOPICS.map((topic) => (
                          <SelectItem key={topic.value} value={topic.value}>
                            {topic.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-company">Company or agency</Label>
                    <Input
                      id="contact-company"
                      value={form.company}
                      onChange={(event) => update("company", event.target.value)}
                      placeholder="Optional"
                      data-testid="input-contact-page-company"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-message">Message</Label>
                    <Textarea
                      id="contact-message"
                      value={form.message}
                      onChange={(event) => update("message", event.target.value)}
                      placeholder="How can we help?"
                      rows={7}
                      required
                      data-testid="textarea-contact-page-message"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-2 border-0 text-white hover:opacity-90 md:w-auto"
                    style={{ background: "linear-gradient(135deg,#4055FF,#FF2060)" }}
                    data-testid="button-contact-page-submit"
                  >
                    <Send className="h-4 w-4" />
                    Send Message
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
