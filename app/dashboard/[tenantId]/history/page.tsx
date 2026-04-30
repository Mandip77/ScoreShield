import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { tenants, scans, scores, workspaceMembers } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import Link from "next/link";
import { Shield, ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const GRADE_COLOR: Record<string, string> = {
  A: "text-green-500",
  B: "text-emerald-400",
  C: "text-yellow-400",
  D: "text-orange-400",
  F: "text-red-500",
};

export default async function HistoryPage({
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

  const recentScans = await db.query.scans.findMany({
    where: and(eq(scans.tenantId, tenantId), eq(scans.status, "success")),
    orderBy: [desc(scans.startedAt)],
    limit: 30,
  });

  const scanScores = await Promise.all(
    recentScans.map(async (scan) => {
      const score = await db.query.scores.findFirst({ where: eq(scores.scanId, scan.id) });
      return { scan, score };
    }),
  );

  const dataPoints = scanScores
    .filter((s) => s.score !== null)
    .map((s) => ({ date: s.scan.startedAt, total: s.score!.total, grade: s.score!.grade }))
    .reverse();

  // Simple sparkline: find min/max for normalization
  const totals = dataPoints.map((d) => d.total);
  const minScore = Math.min(...totals, 0);
  const maxScore = Math.max(...totals, 100);
  const range = maxScore - minScore || 1;

  const W = 600;
  const H = 120;
  const PAD = 10;

  const points = dataPoints.map((d, i) => {
    const x = PAD + (i / Math.max(dataPoints.length - 1, 1)) * (W - 2 * PAD);
    const y = PAD + (1 - (d.total - minScore) / range) * (H - 2 * PAD);
    return { x, y, ...d };
  });

  const pathD =
    points.length > 1
      ? points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ")
      : "";

  const latest = dataPoints[dataPoints.length - 1];
  const previous = dataPoints[dataPoints.length - 2];
  const delta = latest && previous ? latest.total - previous.total : 0;

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
          <span className="text-sm">History</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/${tenantId}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-2xl font-bold">Score history</h1>
        </div>

        {dataPoints.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-16">
            No scan history yet. Run at least one scan to see trends.
          </p>
        ) : (
          <>
            {/* Trend chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">30-day score trend</CardTitle>
                  {latest && (
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${GRADE_COLOR[latest.grade] ?? ""}`}>
                        {latest.total}
                      </span>
                      {delta !== 0 && (
                        <span className={`flex items-center gap-1 text-sm ${delta > 0 ? "text-green-500" : "text-red-500"}`}>
                          {delta > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                          {delta > 0 ? "+" : ""}{delta}
                        </span>
                      )}
                      {delta === 0 && previous && (
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Minus className="h-4 w-4" /> No change
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {points.length > 1 ? (
                  <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full h-auto"
                    preserveAspectRatio="none"
                  >
                    {/* Grid lines at 25, 50, 75 */}
                    {[25, 50, 75].map((v) => {
                      const y = PAD + (1 - (v - minScore) / range) * (H - 2 * PAD);
                      return (
                        <line
                          key={v}
                          x1={PAD}
                          y1={y}
                          x2={W - PAD}
                          y2={y}
                          stroke="currentColor"
                          strokeOpacity="0.1"
                          strokeWidth="1"
                        />
                      );
                    })}
                    {/* Fill */}
                    <path
                      d={`${pathD} L${points[points.length - 1].x.toFixed(1)},${(H - PAD).toFixed(1)} L${points[0].x.toFixed(1)},${(H - PAD).toFixed(1)} Z`}
                      fill="hsl(var(--primary))"
                      fillOpacity="0.1"
                    />
                    {/* Line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {/* Dots */}
                    {points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="3" fill="hsl(var(--primary))" />
                    ))}
                  </svg>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Run at least 2 scans to see the trend chart.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Scan log table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Scan log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-border/50">
                  {[...dataPoints].reverse().map((d, i) => (
                    <div key={i} className="py-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {new Date(d.date).toLocaleString()}
                      </span>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`font-bold ${GRADE_COLOR[d.grade] ?? ""}`}>
                          {d.grade}
                        </Badge>
                        <span className="text-sm font-mono w-8 text-right">{d.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
