import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runScan } from "@/lib/jobs/scan";
import { db } from "@/lib/db/client";
import { tenants, workspaceMembers, workspaces } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({ tenantId: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();

  let body: { tenantId: string };
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { tenantId } = body;

  // If called from a user session, verify membership
  if (session?.user?.id) {
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
    if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

    const member = await db.query.workspaceMembers.findFirst({
      where: (wm) =>
        eq(wm.workspaceId, tenant.workspaceId) && eq(wm.userId, session.user!.id!),
    });

    if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Run scan asynchronously (fire-and-forget for now; later use a queue)
  runScan(tenantId).catch((err) => console.error(`Scan failed for tenant ${tenantId}:`, err));

  return NextResponse.json({ ok: true, tenantId });
}
