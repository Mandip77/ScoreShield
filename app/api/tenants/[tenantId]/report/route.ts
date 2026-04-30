import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { tenants, scans, scores, findings, workspaceMembers, workspaces } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { planAtLeast } from "@/lib/billing/plans";
import { generatePdfReport } from "@/lib/pdf/report";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> },
) {
  const { tenantId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, tenant.workspaceId),
      eq(workspaceMembers.userId, session.user!.id!),
    ),
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, tenant.workspaceId),
  });
  if (!planAtLeast(workspace?.plan ?? "free", "pro")) {
    return NextResponse.json({ error: "PDF reports require the Pro plan or higher." }, { status: 402 });
  }

  const latestScan = await db.query.scans.findFirst({
    where: and(eq(scans.tenantId, tenantId), eq(scans.status, "success")),
    orderBy: [desc(scans.startedAt)],
  });
  if (!latestScan) return NextResponse.json({ error: "No completed scan found." }, { status: 404 });

  const latestScore = await db.query.scores.findFirst({ where: eq(scores.scanId, latestScan.id) });
  if (!latestScore) return NextResponse.json({ error: "No score data found." }, { status: 404 });

  const allFindings = await db.query.findings.findMany({
    where: eq(findings.tenantId, tenantId),
    orderBy: [desc(findings.pointsLost)],
  });

  const pdfBuffer = await generatePdfReport({
    tenantName: tenant.displayName ?? tenant.primaryDomain ?? tenantId,
    provider: tenant.provider,
    generatedAt: new Date(),
    score: latestScore.total,
    grade: latestScore.grade,
    categories: {
      identity: latestScore.identity,
      dataExposure: latestScore.dataExposure,
      oauthRisk: latestScore.oauthRisk,
      detection: latestScore.detection,
      configHygiene: latestScore.configHygiene,
    },
    findings: allFindings.map((f) => ({
      id: f.id,
      title: f.title,
      severity: f.severity,
      category: f.category,
      description: f.description,
      pointsLost: f.pointsLost,
      remediationMd: f.remediationMd ?? "",
      cisControl: "",
      nistFunction: "",
      status: f.status,
    })),
  });

  const filename = `scoreshield-${(tenant.primaryDomain ?? tenantId).replace(/[^a-z0-9]/gi, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`;

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
