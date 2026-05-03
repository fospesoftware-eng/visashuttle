import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const BRAND_GRADIENT = "linear-gradient(90deg, #4055FF 0%, #9033F5 50%, #FF2060 100%)";

function fmt(cents: number) { return `$${(cents / 100).toFixed(2)}`; }

export default function ApiPricingPage() {
  const { data } = useQuery<{ currency: string; endpoints: { endpoint: string; priceCents: number; description: string | null }[] }>({
    queryKey: ["/api/api-pricing"],
  });
  const items = data?.endpoints ?? [];
  return (
    <div className="min-h-screen" style={{ fontFamily: "Inter, sans-serif" }}>
      <section className="py-20 px-6 text-center">
        <div
          className="inline-block text-xs font-semibold uppercase tracking-widest mb-3 bg-clip-text text-transparent"
          style={{ backgroundImage: BRAND_GRADIENT }}
        >Developer APIs</div>
        <h1 className="text-5xl font-bold mb-3">Pay-per-call. No subscriptions.</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Embed visa intelligence into your product. You only pay for the calls you make.
        </p>
      </section>
      <section className="px-6 pb-20">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          {items.map((p) => (
            <Card key={p.endpoint} className="border-2">
              <CardHeader>
                <CardTitle className="capitalize text-2xl">{p.endpoint.replace(/-/g, " ")}</CardTitle>
                <CardDescription>{p.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 mb-4">
                  <div
                    className="text-5xl font-bold bg-clip-text text-transparent"
                    style={{ backgroundImage: BRAND_GRADIENT }}
                  >{fmt(p.priceCents)}</div>
                  <div className="text-muted-foreground">/ call</div>
                </div>
                <code className="text-xs block px-2 py-1 bg-muted rounded">POST /api/v1/{p.endpoint}</code>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-center mt-12 space-x-3">
          <Link href="/api-docs"><Button size="lg" variant="outline">Read the docs</Button></Link>
          <Link href="/agency-register">
            <Button size="lg" style={{ backgroundImage: BRAND_GRADIENT }} className="text-white border-0">
              Get an API key
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
