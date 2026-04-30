import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { findings, tenants, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({
  status: z.enum(["open", "acknowledged", "resolved", "suppressed"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ findingId: string }> },
) {
  const { findingId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const finding = await db.query.findings.findFirst({ where: eq(findings.id, findingId) });
  if (!finding) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, finding.tenantId) });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, tenant.workspaceId),
      eq(workspaceMembers.userId, session.user!.id!),
    ),
  });
  if (!member || member.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { status } = parsed.data;
  const now = new Date();

  await db
    .update(findings)
    .set({
      status,
      ...(status === "acknowledged"
        ? { acknowledgedByUserId: session.user!.id!, acknowledgedAt: now }
        : {}),
      ...(status === "resolved" ? { resolvedAt: now } : {}),
    })
    .where(eq(findings.id, findingId));

  return NextResponse.json({ ok: true });
}
