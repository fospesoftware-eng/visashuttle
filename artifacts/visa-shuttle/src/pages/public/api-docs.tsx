import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

const BRAND_GRADIENT = "linear-gradient(90deg, #4055FF 0%, #9033F5 50%, #FF2060 100%)";

const SECTIONS = [
  { id: "auth", label: "Authentication" },
  { id: "rate-limits", label: "Rate limits" },
  { id: "errors", label: "Errors" },
  { id: "deep-check", label: "POST /v1/deep-check" },
  { id: "visa-requirements", label: "POST /v1/visa-requirements" },
  { id: "billing", label: "Billing & wallet" },
];

// Three language samples per endpoint, all pulled from the same logical
// request shape so the docs and the OpenAPI contract can never drift.
const SAMPLES = {
  "deep-check": {
    curl: `curl -X POST https://YOUR_DOMAIN/api/v1/deep-check \\
  -H "Authorization: Bearer vs_xxxxxxx_yyyyyyyyyyyyyyyy" \\
  -H "Content-Type: application/json" \\
  -d '{
    "formData": {
      "nationality": "India",
      "destinationCountry": "Germany",
      "visaType": "Tourist Visa",
      "age": "32",
      "occupation": "Software Engineer",
      "annualIncome": "$30k-$50k",
      "previousTravel": ["UAE","Singapore"],
      "purposeOfVisit": "Tourism",
      "stayDuration": "10 days"
    }
  }'`,
    node: `import fetch from "node-fetch";

const res = await fetch("https://YOUR_DOMAIN/api/v1/deep-check", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.VISASHUTTLE_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    formData: {
      nationality: "India",
      destinationCountry: "Germany",
      visaType: "Tourist Visa",
    },
  }),
});
if (res.status === 429) {
  const retry = res.headers.get("retry-after");
  console.warn(\`Rate limited; retry in \${retry}s\`);
}
const { meta, result } = await res.json();
console.log(result.approvalChance, "approval chance");`,
    python: `import os, requests

r = requests.post(
    "https://YOUR_DOMAIN/api/v1/deep-check",
    headers={
        "Authorization": f"Bearer {os.environ['VISASHUTTLE_KEY']}",
        "Content-Type": "application/json",
    },
    json={
        "formData": {
            "nationality": "India",
            "destinationCountry": "Germany",
            "visaType": "Tourist Visa",
        }
    },
)
if r.status_code == 429:
    print("retry in", r.headers.get("Retry-After"), "s")
data = r.json()
print(data["result"]["approvalChance"])`,
  },
  "visa-requirements": {
    curl: `curl -X POST https://YOUR_DOMAIN/api/v1/visa-requirements \\
  -H "Authorization: Bearer vs_xxxxxxx_yyyyyyyyyyyyyyyy" \\
  -H "Content-Type: application/json" \\
  -d '{
    "nationality": "India",
    "destinationCountry": "Germany",
    "visaType": "Tourist Visa"
  }'`,
    node: `const res = await fetch("https://YOUR_DOMAIN/api/v1/visa-requirements", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.VISASHUTTLE_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    nationality: "India",
    destinationCountry: "Germany",
    visaType: "Tourist Visa",
  }),
});
const { meta, result } = await res.json();`,
    python: `r = requests.post(
    "https://YOUR_DOMAIN/api/v1/visa-requirements",
    headers={"Authorization": f"Bearer {os.environ['VISASHUTTLE_KEY']}",
             "Content-Type": "application/json"},
    json={"nationality": "India", "destinationCountry": "Germany",
          "visaType": "Tourist Visa"},
)
print(r.json()["result"]["allowedVisaTypes"])`,
  },
} as const;

function CopyBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group">
      <pre className="bg-muted rounded p-3 pr-12 text-xs overflow-x-auto"><code>{code}</code></pre>
      <Button
        type="button" variant="outline" size="icon"
        className="absolute top-2 right-2 h-7 w-7"
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
        aria-label="Copy code"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}

function CodeTabs({ samples }: { samples: { curl: string; node: string; python: string } }) {
  return (
    <Tabs defaultValue="curl">
      <TabsList>
        <TabsTrigger value="curl">curl</TabsTrigger>
        <TabsTrigger value="node">Node</TabsTrigger>
        <TabsTrigger value="python">Python</TabsTrigger>
      </TabsList>
      <TabsContent value="curl"><CopyBlock code={samples.curl} /></TabsContent>
      <TabsContent value="node"><CopyBlock code={samples.node} /></TabsContent>
      <TabsContent value="python"><CopyBlock code={samples.python} /></TabsContent>
    </Tabs>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen py-12 px-6" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
        {/* Sticky in-page nav with anchored links */}
        <aside className="lg:sticky lg:top-12 lg:self-start">
          <div
            className="text-xs font-semibold uppercase tracking-widest mb-3 inline-block bg-clip-text text-transparent"
            style={{ backgroundImage: BRAND_GRADIENT }}
          >On this page</div>
          <nav className="space-y-1 text-sm">
            {SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="block hover:underline text-muted-foreground hover:text-foreground">
                {s.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="space-y-10">
          <header>
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-2 inline-block bg-clip-text text-transparent"
              style={{ backgroundImage: BRAND_GRADIENT }}
            >Developer Reference</div>
            <h1 className="text-4xl font-bold mb-3">API Documentation</h1>
            <p className="text-muted-foreground">
              Two REST endpoints. Pay-per-call from your tenant wallet, no subscription, no minimums.
            </p>
          </header>

          <section id="auth" className="scroll-mt-12">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>Issue keys in the agency dashboard. The plaintext secret is shown only once at creation.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <CopyBlock code={`Authorization: Bearer vs_<prefix>_<secret>`} />
                <p className="text-muted-foreground">
                  Treat secrets like passwords — anyone with the secret can spend your wallet. Revoke compromised
                  keys from the API Keys page; revoked keys return <code>401 unauthorized</code> immediately.
                </p>
              </CardContent>
            </Card>
          </section>

          <section id="rate-limits" className="scroll-mt-12">
            <Card>
              <CardHeader>
                <CardTitle>Rate limits</CardTitle>
                <CardDescription>60 requests per minute per API key. On hit you receive <code>429</code> with a <code>Retry-After</code> header (seconds).</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <CopyBlock code={`HTTP/1.1 429 Too Many Requests
Retry-After: 17
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 0

{ "error": { "code": "rate_limited", "message": "Rate limit 60/min exceeded. Retry in 17s." } }`} />
              </CardContent>
            </Card>
          </section>

          <section id="errors" className="scroll-mt-12">
            <Card>
              <CardHeader>
                <CardTitle>Error envelope</CardTitle>
                <CardDescription>All errors share this shape — never echoes upstream provider details.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-3">
                <CopyBlock code={`{ "error": { "code": "<code>", "message": "<human-readable>" } }`} />
                <ul className="list-disc pl-6 space-y-1">
                  <li><code>unauthorized</code> (401) — missing, invalid, or revoked key.</li>
                  <li><code>bad_request</code> (400) — required field missing or schema mismatch.</li>
                  <li><code>insufficient_balance</code> (402) — wallet does not cover the per-call price.</li>
                  <li><code>rate_limited</code> (429) — per-key limit exceeded; honour <code>Retry-After</code>.</li>
                  <li><code>upstream_error</code> (502) — provider failure. <strong>Not billed.</strong></li>
                  <li><code>internal_error</code> (500) — unexpected. <strong>Not billed.</strong></li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section id="deep-check" className="scroll-mt-12">
            <Card>
              <CardHeader>
                <CardTitle>POST /api/v1/deep-check</CardTitle>
                <CardDescription>Embassy-style risk assessment with dimension scores, risk register, and action plan.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                <div>
                  <div className="font-semibold mb-2">Request</div>
                  <CodeTabs samples={SAMPLES["deep-check"]} />
                </div>
                <div>
                  <div className="font-semibold mb-2">Response (200)</div>
                  <CopyBlock code={`{
  "meta": { "endpoint": "deep-check", "costCents": 199, "currency": "USD",
            "balanceCents": 4801, "latencyMs": 2143, "usageId": "..." },
  "result": {
    "approvalChance": 78,
    "profileGrade": "B+",
    "statusLabel": "Good Chance",
    "confidenceLevel": "High",
    "summary": "...",
    "dimensionScores": { "financial": 80, "documents": 70, "travelHistory": 75, "homeTies": 82, "visaProfile": 78 },
    "riskDetails": [...],
    "actionPlan": [...]
  }
}`} />
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="visa-requirements" className="scroll-mt-12">
            <Card>
              <CardHeader>
                <CardTitle>POST /api/v1/visa-requirements</CardTitle>
                <CardDescription>Required documents, allowed visa types, processing times, and visa-free / e-visa status.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                <div>
                  <div className="font-semibold mb-2">Request</div>
                  <CodeTabs samples={SAMPLES["visa-requirements"]} />
                </div>
                <div>
                  <div className="font-semibold mb-2">Response (200)</div>
                  <CopyBlock code={`{
  "meta": { "endpoint": "visa-requirements", "costCents": 25, "currency": "USD",
            "balanceCents": 4776, "latencyMs": 84, "usageId": "..." },
  "result": {
    "nationality": "India",
    "destinationCountry": "Germany",
    "visaType": "Tourist Visa",
    "entryRequirement": { "status": "visa_required", "...": "..." },
    "allowedVisaTypes": ["Tourist Visa","Business Visa","Student Visa"],
    "template": { "visaType": "Tourist Visa", "processingTime": "15 days",
                  "fee": "...", "requiredDocuments": [], "notes": "..." }
  }
}`} />
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="billing" className="scroll-mt-12">
            <Card>
              <CardHeader>
                <CardTitle>Billing & wallet</CardTitle>
                <CardDescription>Each successful call atomically debits your wallet at the per-endpoint price.</CardDescription>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p>Top up via Cashfree from <Link href="/app/business/api/usage" className="underline">your Usage page</Link>. Failed upstream calls are never billed; the wallet update and the call log are written together in a single transaction.</p>
                <p>Every successful response includes <code>meta.balanceCents</code> so you can monitor balance from your client.</p>
              </CardContent>
            </Card>
          </section>

          <div className="text-center mt-10 space-x-3">
            <Link href="/api"><Button variant="outline">See pricing</Button></Link>
            <Link href="/agency-register">
              <Button style={{ backgroundImage: BRAND_GRADIENT }} className="text-white border-0">Get an API key</Button>
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
