"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Shield, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    monthly: 29,
    yearly: 290,
    description: "Daily monitoring for a single SMB.",
    features: [
      "1 connected tenant",
      "Daily automated rescans",
      "Full findings list",
      "90-day history",
      "CSV export",
      "Weekly email digest",
    ],
  },
  {
    id: "pro" as const,
    name: "Pro",
    monthly: 99,
    yearly: 990,
    description: "Google + Microsoft in one dashboard.",
    features: [
      "Both Google Workspace & M365",
      "Hourly rescans",
      "Slack alerts",
      "White-label PDF reports",
      "CIS / NIST CSF mapping",
      "1-year history",
    ],
    highlight: true,
  },
  {
    id: "agency" as const,
    name: "Agency",
    monthly: 299,
    yearly: 2990,
    description: "Multi-tenant dashboard for MSPs.",
    features: [
      "5 tenants included",
      "+$25/tenant after 5",
      "White-label portal & PDF",
      "Scheduled client reports",
      "API access",
      "Role-based team access",
    ],
  },
];

function BillingPageInner() {
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  async function handleUpgrade(plan: "starter" | "pro" | "agency") {
    setLoading(plan);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, interval }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(null);
  }

  async function handleManage() {
    setLoading("portal");
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(null);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <Shield className="h-5 w-5 text-primary" />
            ScoreShield
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm">Billing</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        {status === "success" && (
          <div className="mb-8 p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm">Subscription activated! Your plan has been upgraded.</span>
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold mb-3">Choose your plan</h1>
          <p className="text-muted-foreground mb-6">Upgrade to unlock continuous monitoring and more.</p>
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted">
            <Button
              variant={interval === "monthly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setInterval("monthly")}
            >
              Monthly
            </Button>
            <Button
              variant={interval === "yearly" ? "default" : "ghost"}
              size="sm"
              onClick={() => setInterval("yearly")}
            >
              Yearly
              <Badge variant="secondary" className="ml-2 text-xs">2 months free</Badge>
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={"highlight" in plan && plan.highlight ? "border-primary ring-1 ring-primary" : ""}
            >
              <CardHeader>
                {"highlight" in plan && plan.highlight && (
                  <Badge className="w-fit mb-2">Most popular</Badge>
                )}
                <CardTitle>{plan.name}</CardTitle>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">
                    ${interval === "monthly" ? plan.monthly : Math.round(plan.yearly / 12)}
                  </span>
                  <span className="text-muted-foreground text-sm">/ month</span>
                </div>
                {interval === "yearly" && (
                  <p className="text-xs text-green-500">${plan.yearly}/year — save ${plan.monthly * 12 - plan.yearly}</p>
                )}
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={"highlight" in plan && plan.highlight ? "default" : "outline"}
                  className="w-full"
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading === plan.id}
                >
                  {loading === plan.id ? "Redirecting…" : "Upgrade to " + plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">Already subscribed?</p>
          <Button variant="outline" onClick={handleManage} disabled={loading === "portal"}>
            {loading === "portal" ? "Redirecting…" : "Manage subscription"}
          </Button>
        </div>
      </main>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense>
      <BillingPageInner />
    </Suspense>
  );
}
