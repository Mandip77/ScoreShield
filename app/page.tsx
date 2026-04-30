import Link from "next/link";
import { Shield, CheckCircle, AlertTriangle, Lock, Eye, Zap, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Eye,
    title: "Exposed Files & Sharing",
    description:
      'Instantly see every Drive or OneDrive file shared publicly, with "Anyone with the link," or externally — without reading file contents.',
  },
  {
    icon: Lock,
    title: "MFA & Identity Gaps",
    description:
      "Identify admins and users without multi-factor authentication, inactive accounts still holding admin roles, and weak password policies.",
  },
  {
    icon: AlertTriangle,
    title: "Risky Third-Party Apps",
    description:
      "Surface OAuth apps granted dangerous scopes (Mail.ReadWrite, Files.ReadWrite.All) or apps nobody remembers approving.",
  },
  {
    icon: Zap,
    title: "Detection & Logging",
    description:
      "Check audit log retention, unresolved Alert Center alerts, risky sign-ins, and whether logging is properly configured.",
  },
];

const CHECKS = [
  "Users & admins without MFA",
  "Publicly exposed Drive / OneDrive files",
  "Risky third-party OAuth app grants",
  "Inactive accounts with admin access",
  "External email forwarding rules",
  "Dangerous sharing defaults",
  "Unresolved security alerts",
  "Legacy auth & weak password policy",
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "One tenant, manual scan, top 10 findings.",
    features: [
      "1 connected tenant (Google OR M365)",
      "One-time scan + manual rescan",
      "Score + top 10 findings",
      "Basic email notification",
    ],
    cta: "Get my free score",
    highlight: false,
  },
  {
    name: "Starter",
    price: "$29",
    period: "/ month",
    description: "Daily monitoring for a single SMB.",
    features: [
      "Everything in Free",
      "Daily automated rescans",
      "Full findings list — all categories",
      "90-day history",
      "CSV export",
      "Weekly email digest",
    ],
    cta: "Start free trial",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/ month",
    description: "Google + Microsoft in one dashboard.",
    features: [
      "Everything in Starter",
      "Both Google Workspace & M365",
      "Hourly rescans",
      "Slack alerts",
      "White-label PDF reports",
      "CIS / NIST CSF / SOC 2 mapping",
      "1-year history",
    ],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Agency",
    price: "$299",
    period: "/ month",
    description: "Multi-tenant dashboard for MSPs & vCISOs.",
    features: [
      "Everything in Pro",
      "5 tenants included (+$25 each after)",
      "White-label portal & PDF",
      "Scheduled client reports",
      "API access",
      "Role-based team access",
    ],
    cta: "Contact us",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <Shield className="h-6 w-6 text-primary" />
            ScoreShield
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="#faq" className="hover:text-foreground transition-colors">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/signin">Sign in</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signin">Get free score</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto px-4 py-24 text-center">
          <Badge variant="secondary" className="mb-6">
            Free for one tenant · No install required
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-3xl mx-auto">
            Get your Google Workspace or Microsoft 365{" "}
            <span className="text-primary">Security Score</span> in 5 minutes
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            ScoreShield scans your cloud workspace for exposed files, missing MFA, risky app grants, and
            misconfigured sharing — then gives you a 0–100 score with a prioritized fix list.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="gap-2" asChild>
              <Link href="/signin">
                Get my free security score
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">See what we check</Link>
            </Button>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            No agents. No installs. Just OAuth — your admin signs in and the scan runs automatically.
          </p>
        </section>

        {/* Social proof strip */}
        <section className="border-y border-border/40 bg-muted/30 py-8">
          <div className="container mx-auto px-4 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Read metadata only — never file contents
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Aligned to CIS Controls v8 & NIST CSF 2.0
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Scan completes in under 2 minutes
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Zero config — no agents, no MDM
            </span>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="container mx-auto px-4 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">What ScoreShield checks</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              25+ security checks across 5 categories, each mapped to CIS Controls v8 and NIST CSF 2.0.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{f.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">{f.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="bg-muted/30 rounded-xl p-8">
            <h3 className="font-semibold mb-6 text-center">Specific checks include</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {CHECKS.map((check) => (
                <div key={check} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  {check}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="container mx-auto px-4 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground">Free to start. Upgrade when you need monitoring.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PRICING.map((plan) => (
              <Card
                key={plan.name}
                className={plan.highlight ? "border-primary ring-1 ring-primary" : ""}
              >
                <CardHeader>
                  {plan.highlight && (
                    <Badge className="w-fit mb-2" variant="default">
                      Most popular
                    </Badge>
                  )}
                  <CardTitle>{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                  </div>
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
                    variant={plan.highlight ? "default" : "outline"}
                    className="w-full"
                    asChild
                  >
                    <Link href="/signin">{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="container mx-auto px-4 py-24 max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              {
                q: "Do you read our emails or file contents?",
                a: "No. ScoreShield only reads metadata — file names, sharing permissions, user attributes, and audit log events. We never read the contents of emails, documents, or messages. The OAuth scopes we request are drive.metadata.readonly (not drive.readonly or gmail.readonly).",
              },
              {
                q: "What does 'no install required' mean?",
                a: "There are no agents, no browser extensions, no MDM enrollment, and no desktop software to install. Your Google Workspace admin or Microsoft 365 Global Admin simply signs in via OAuth and grants consent. The scan runs entirely server-side.",
              },
              {
                q: "How long does a scan take?",
                a: "For most SMBs (under 200 users), a full scan completes in under 2 minutes. For larger tenants, the scan may take up to 10 minutes, and we'll email you when it's done.",
              },
              {
                q: "Is this compliant with Google's OAuth policies?",
                a: "Yes. We request only sensitive scopes (not restricted scopes), which require a standard OAuth verification process with a YouTube demo video — no CASA security assessment. We store only metadata, never file contents.",
              },
              {
                q: "Can I disconnect my workspace at any time?",
                a: "Yes. You can disconnect at any time from Settings. This immediately revokes our access and deletes your stored refresh tokens. You can also revoke access directly from your Google Admin Console or Microsoft Entra portal.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-border pb-6">
                <h3 className="font-semibold mb-2">{q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-4 py-24 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to see your score?</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            It takes 5 minutes. No credit card required. Free forever for one tenant.
          </p>
          <Button size="lg" asChild>
            <Link href="/signin">
              Get my free security score <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border/40 py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>ScoreShield &copy; {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/security" className="hover:text-foreground transition-colors">
              Security
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
