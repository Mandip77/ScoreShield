import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { tenants, findings, workspaceMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import Link from "next/link";
import { Shield, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FindingActions } from "@/components/finding-actions";

const SEVERITY_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  high: "destructive",
  medium: "secondary",
  low: "outline",
};

const CATEGORY_LABEL: Record<string, string> = {
  identity: "Identity & Access",
  data_exposure: "Data Exposure",
  oauth_risk: "OAuth Risk",
  detection: "Detection",
  config_hygiene: "Config Hygiene",
};

export default async function FindingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ status?: string; category?: string }>;
}) {
  const { tenantId } = await params;
  const { status: statusFilter, category: categoryFilter } = await searchParams;

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

  const allFindings = await db.query.findings.findMany({
    where: eq(findings.tenantId, tenantId),
    orderBy: [desc(findings.pointsLost), desc(findings.lastSeenAt)],
  });

  const filtered = allFindings.filter((f) => {
    if (statusFilter && f.status !== statusFilter) return false;
    if (categoryFilter && f.category !== categoryFilter) return false;
    return true;
  });

  const statusCounts = {
    all: allFindings.length,
    open: allFindings.filter((f) => f.status === "open").length,
    acknowledged: allFindings.filter((f) => f.status === "acknowledged").length,
    resolved: allFindings.filter((f) => f.status === "resolved").length,
    suppressed: allFindings.filter((f) => f.status === "suppressed").length,
  };

  const filterBase = `/dashboard/${tenantId}/findings`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <Shield className="h-5 w-5 text-primary" />
            ScoreShield
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href={`/dashboard/${tenantId}`} className="text-sm hover:underline">
            {tenant.displayName ?? tenant.primaryDomain}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm">Findings</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/${tenantId}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold">All findings</h1>
        </div>

        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2">
          {(["all", "open", "acknowledged", "resolved", "suppressed"] as const).map((s) => {
            const href =
              s === "all"
                ? filterBase
                : `${filterBase}?status=${s}${categoryFilter ? `&category=${categoryFilter}` : ""}`;
            const isActive = (s === "all" && !statusFilter) || statusFilter === s;
            return (
              <Link key={s} href={href}>
                <Badge variant={isActive ? "default" : "outline"} className="cursor-pointer capitalize">
                  {s} ({statusCounts[s]})
                </Badge>
              </Link>
            );
          })}
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(CATEGORY_LABEL).map(([cat, label]) => {
            const href = `${filterBase}?${statusFilter ? `status=${statusFilter}&` : ""}category=${cat}`;
            const clearHref = `${filterBase}${statusFilter ? `?status=${statusFilter}` : ""}`;
            const isActive = categoryFilter === cat;
            return (
              <Link key={cat} href={isActive ? clearHref : href}>
                <Badge variant={isActive ? "secondary" : "outline"} className="cursor-pointer text-xs">
                  {label}
                </Badge>
              </Link>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {filtered.length} finding{filtered.length !== 1 ? "s" : ""}
              {statusFilter ? ` · ${statusFilter}` : ""}
              {categoryFilter ? ` · ${CATEGORY_LABEL[categoryFilter] ?? categoryFilter}` : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No findings match this filter.</p>
            ) : (
              <div className="divide-y divide-border/50">
                {filtered.map((f) => (
                  <div key={f.id} className="py-4 flex items-start gap-4">
                    <Badge
                      variant={SEVERITY_VARIANT[f.severity] ?? "outline"}
                      className="mt-0.5 shrink-0 capitalize"
                    >
                      {f.severity}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{f.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground capitalize">
                          {CATEGORY_LABEL[f.category] ?? f.category}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          First seen {new Date(f.firstSeenAt).toLocaleDateString()}
                        </span>
                        {f.remediationUrl && (
                          <a
                            href={f.remediationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            Remediate →
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-2">
                      <span className="text-sm font-mono text-destructive">
                        -{f.pointsLost} pts
                      </span>
                      <FindingActions findingId={f.id} currentStatus={f.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
