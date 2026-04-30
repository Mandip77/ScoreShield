import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { tenants, scores, scans, findings, workspaceMembers, workspaces } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import Link from "next/link";
import { Shield, RefreshCw, History, ListFilter, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/score-gauge";
import { RescanButton } from "@/components/rescan-button";
import { planAtLeast } from "@/lib/billing/plans";

const FREE_FINDINGS_LIMIT = 10;

const SEVERITY_COLOR: Record<string, string> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

export default async function TenantDashboardPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) notFound();

  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, tenant.workspaceId),
      eq(workspaceMembers.userId, session.user.id),
    ),
  });
  if (!member) notFound();

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, tenant.workspaceId),
  });
  const plan = workspace?.plan ?? "free";
  const isPaid = planAtLeast(plan, "starter");

  const latestScan = await db.query.scans.findFirst({
    where: eq(scans.tenantId, tenantId),
    orderBy: [desc(scans.startedAt)],
  });

  const latestScore = latestScan
    ? await db.query.scores.findFirst({ where: eq(scores.scanId, latestScan.id) })
    : null;

  const allOpenFindings = await db.query.findings.findMany({
    where: and(eq(findings.tenantId, tenantId), eq(findings.status, "open")),
    orderBy: [desc(findings.pointsLost)],
  });

  const visibleFindings = isPaid
    ? allOpenFindings
    : allOpenFindings.slice(0, FREE_FINDINGS_LIMIT);

  const hiddenCount = isPaid ? 0 : Math.max(0, allOpenFindings.length - FREE_FINDINGS_LIMIT);

  const isScanning =
    latestScan?.status === "queued" || latestScan?.status === "running";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-2 font-bold">
              <Shield className="h-5 w-5 text-primary" />
              ScoreShield
            </Link>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-medium">
              {tenant.displayName ?? tenant.primaryDomain}
            </span>
            <Badge variant="secondary" className="text-xs">
              {tenant.provider === "google" ? "Google Workspace" : "Microsoft 365"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/${tenantId}/history`}>
                <History className="h-4 w-4 mr-1" />
                History
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/${tenantId}/findings`}>
                <ListFilter className="h-4 w-4 mr-1" />
                All findings
              </Link>
            </Button>
            <RescanButton tenantId={tenantId} isScanning={isScanning} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 space-y-8">
        {isScanning && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <RefreshCw className="h-5 w-5 text-primary animate-spin" />
            <span className="text-sm">Scan in progress — this page will show results when complete.</span>
          </div>
        )}

        {!latestScore && !isScanning && (
          <div className="text-center py-16 text-muted-foreground">
            <p>No scan data yet. Click "Rescan" to run your first scan.</p>
          </div>
        )}

        {latestScore && (
          <>
            {/* Score overview */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="flex flex-col items-center justify-center py-8">
                <ScoreGauge score={latestScore.total} grade={latestScore.grade} />
                <p className="text-sm text-muted-foreground mt-2">
                  Last scanned{" "}
                  {tenant.lastScanAt
                    ? new Date(tenant.lastScanAt).toLocaleDateString()
                    : "—"}
                </p>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Category breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Identity & Access", value: latestScore.identity, max: 25 },
                    { label: "Data Exposure", value: latestScore.dataExposure, max: 25 },
                    { label: "OAuth / Third-party Risk", value: latestScore.oauthRisk, max: 20 },
                    { label: "Detection & Logging", value: latestScore.detection, max: 15 },
                    { label: "Configuration Hygiene", value: latestScore.configHygiene, max: 15 },
                  ].map(({ label, value, max }) => (
                    <div key={label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{label}</span>
                        <span className="text-muted-foreground">{value}/{max}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(value / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Findings */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">
                  Open findings ({allOpenFindings.length})
                </CardTitle>
                {allOpenFindings.length > 0 && (
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/dashboard/${tenantId}/findings`}>View all →</Link>
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {allOpenFindings.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No open findings! Great security posture.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {visibleFindings.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-start gap-4 p-4 rounded-lg border border-border/50 hover:border-border transition-colors"
                      >
                        <Badge
                          variant={(SEVERITY_COLOR[f.severity] as any) ?? "outline"}
                          className="mt-0.5 shrink-0 capitalize"
                        >
                          {f.severity}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{f.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span className="text-sm font-mono text-destructive">
                            -{f.pointsLost} pts
                          </span>
                        </div>
                      </div>
                    ))}

                    {hiddenCount > 0 && (
                      <div className="flex flex-col items-center gap-3 p-6 rounded-lg border border-dashed border-border/60 bg-muted/30">
                        <Lock className="h-5 w-5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground text-center">
                          {hiddenCount} more finding{hiddenCount !== 1 ? "s" : ""} hidden on the free plan.
                        </p>
                        <Button size="sm" asChild>
                          <Link href="/billing">Upgrade to see all findings</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
