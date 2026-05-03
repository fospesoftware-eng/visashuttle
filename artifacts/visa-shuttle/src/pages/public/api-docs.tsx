import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const BRAND_GRADIENT = "linear-gradient(90deg, #4055FF 0%, #9033F5 50%, #FF2060 100%)";

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen py-16 px-6" style={{ fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-4xl mx-auto">
        <div
          className="text-xs font-semibold uppercase tracking-widest mb-2 inline-block bg-clip-text text-transparent"
          style={{ backgroundImage: BRAND_GRADIENT }}
        >Developer Reference</div>
        <h1 className="text-4xl font-bold mb-3">API Documentation</h1>
        <p className="text-muted-foreground mb-10">
          Two simple, fully managed REST endpoints. Bring your own key, pay per successful call.
        </p>

        <Card className="mb-6">
          <CardHeader><CardTitle>Authentication</CardTitle><CardDescription>Issue keys in the agency dashboard. The plaintext secret is shown only at creation.</CardDescription></CardHeader>
          <CardContent className="text-sm">
            <pre className="bg-muted rounded p-3 text-xs overflow-x-auto"><code>{`Authorization: Bearer vs_<prefix>_<secret>`}</code></pre>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader><CardTitle>POST /api/v1/deep-check</CardTitle><CardDescription>Embassy-style risk assessment.</CardDescription></CardHeader>
          <CardContent className="text-sm space-y-3">
            <div>Request:</div>
            <pre className="bg-muted rounded p-3 text-xs overflow-x-auto"><code>{`{
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
}`}</code></pre>
            <div>Response (200):</div>
            <pre className="bg-muted rounded p-3 text-xs overflow-x-auto"><code>{`{
  "meta": { "endpoint": "deep-check", "costCents": 199, "currency": "USD", "balanceCents": 4801, "latencyMs": 2143 },
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
}`}</code></pre>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader><CardTitle>POST /api/v1/visa-requirements</CardTitle><CardDescription>Required documents and visa-free / e-visa status.</CardDescription></CardHeader>
          <CardContent className="text-sm space-y-3">
            <div>Request:</div>
            <pre className="bg-muted rounded p-3 text-xs overflow-x-auto"><code>{`{
  "nationality": "India",
  "destinationCountry": "Germany",
  "visaType": "Tourist Visa"
}`}</code></pre>
            <div>Response (200):</div>
            <pre className="bg-muted rounded p-3 text-xs overflow-x-auto"><code>{`{
  "meta": { "endpoint": "visa-requirements", "costCents": 25, "currency": "USD", "balanceCents": 4776, "latencyMs": 84 },
  "result": {
    "nationality": "India",
    "destinationCountry": "Germany",
    "visaType": "Tourist Visa",
    "entryRequirement": { "status": "visa_required", ... },
    "allowedVisaTypes": ["Tourist Visa","Business Visa","Student Visa", ...],
    "template": { "visaType": "Tourist Visa", "processingTime": "15 days", "fee": "...", "requiredDocuments": [...], "notes": "..." }
  }
}`}</code></pre>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader><CardTitle>Errors</CardTitle></CardHeader>
          <CardContent className="text-sm">
            <p className="mb-2">All errors are returned as <code>{`{ error: { code, message } }`}</code>. Common codes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><code>unauthorized</code> (401) — missing or invalid key.</li>
              <li><code>bad_request</code> (400) — required fields missing.</li>
              <li><code>insufficient_balance</code> (402) — wallet does not cover the per-call price.</li>
              <li><code>upstream_error</code> (502) — provider failure. Calls are auto-refunded.</li>
              <li><code>internal_error</code> (500) — unexpected. Calls are auto-refunded.</li>
            </ul>
          </CardContent>
        </Card>

        <div className="text-center mt-10 space-x-3">
          <Link href="/api"><Button variant="outline">See pricing</Button></Link>
          <Link href="/agency-register">
            <Button style={{ backgroundImage: BRAND_GRADIENT }} className="text-white border-0">Get an API key</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
