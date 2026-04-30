import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { tenants, workspaces } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { runScan } from "@/lib/jobs/scan";

export async function GET(req: NextRequest) {
  // Vercel Cron sends an Authorization header with the CRON_SECRET
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all paid tenants (starter and above)
  const paidWorkspaces = await db.query.workspaces.findMany({
    where: (ws) => inArray(ws.plan, ["starter", "pro", "agency", "enterprise"]),
  });

  const workspaceIds = paidWorkspaces.map((w) => w.id);

  if (workspaceIds.length === 0) {
    return NextResponse.json({ ok: true, scanned: 0 });
  }

  const tenantList = await db.query.tenants.findMany({
    where: (t) => inArray(t.workspaceId, workspaceIds) && eq(t.status, "active"),
  });

  let scanned = 0;
  for (const tenant of tenantList) {
    try {
      await runScan(tenant.id);
      scanned++;
    } catch (err) {
      console.error(`Daily cron scan failed for tenant ${tenant.id}:`, err);
    }
  }

  return NextResponse.json({ ok: true, scanned });
}
