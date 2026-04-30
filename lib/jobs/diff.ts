import { db } from "@/lib/db/client";
import { findings, scans } from "@/lib/db/schema";
import { eq, and, lt, ne } from "drizzle-orm";

export interface ScanDiff {
  newFindings: number;
  resolvedFindings: number;
}

/**
 * Compare findings from the current scan against the previous scan for the same tenant.
 * A finding is "new" if its firstSeenAt equals lastSeenAt (only seen once, in this scan).
 * A finding is "resolved" if it was open in the previous scan but not updated in this scan.
 */
export async function computeScanDiff(
  tenantId: string,
  currentScanId: string,
): Promise<ScanDiff> {
  const currentScan = await db.query.scans.findFirst({
    where: eq(scans.id, currentScanId),
  });
  if (!currentScan) return { newFindings: 0, resolvedFindings: 0 };

  // New findings: first seen in this scan (firstSeenAt == lastSeenAt and latestScanId == currentScanId)
  const allCurrentFindings = await db.query.findings.findMany({
    where: eq(findings.tenantId, tenantId),
  });

  const currentScanStarted = currentScan.startedAt;

  const newFindings = allCurrentFindings.filter(
    (f) =>
      f.latestScanId === currentScanId &&
      f.firstSeenAt.getTime() === f.lastSeenAt.getTime(),
  ).length;

  // Resolved findings: open findings whose lastSeenAt is before the current scan started
  const resolvedFindings = allCurrentFindings.filter(
    (f) =>
      f.status === "open" &&
      f.latestScanId !== currentScanId &&
      f.lastSeenAt < currentScanStarted,
  ).length;

  return { newFindings, resolvedFindings };
}
