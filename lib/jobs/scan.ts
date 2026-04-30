import { db } from "@/lib/db/client";
import { scans, scores, findings, exposedFiles, oauthApps, tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notifyOnScanComplete } from "@/lib/jobs/notify";
import { computeScanDiff } from "@/lib/jobs/diff";
// Google
import { getAuthenticatedClient } from "@/lib/integrations/google/client";
import { listUsers as listGoogleUsers, getVerifiedDomains } from "@/lib/integrations/google/users";
import { listOAuthGrants as listGoogleOAuthGrants } from "@/lib/integrations/google/oauth-grants";
import { listExposedFiles } from "@/lib/integrations/google/drive";
import { listSuspiciousLogins, listAlertCenterAlerts } from "@/lib/integrations/google/audit";
// Microsoft
import { getGraphClientForTenant } from "@/lib/integrations/microsoft/client";
import { listUsers as listMsUsers, listGlobalAdmins } from "@/lib/integrations/microsoft/users";
import { getSecureScore } from "@/lib/integrations/microsoft/secure-score";
import { getMfaRegistration } from "@/lib/integrations/microsoft/mfa-registration";
import {
  listConditionalAccessPolicies,
} from "@/lib/integrations/microsoft/conditional-access";
import { listOAuthGrants as listMsOAuthGrants } from "@/lib/integrations/microsoft/oauth-grants";
import { listExposedItems } from "@/lib/integrations/microsoft/drive";
import { countRiskySignIns, countLegacyAuthSignIns } from "@/lib/integrations/microsoft/audit";
import { countExternalForwarders } from "@/lib/integrations/microsoft/mail-flow";
// Scoring
import { runScoringEngine } from "@/lib/scoring/engine";
import type { TenantSnapshot, GoogleSnapshot, MicrosoftSnapshot } from "@/lib/scoring/types";

export async function runScan(tenantId: string): Promise<string> {
  const [scan] = await db
    .insert(scans)
    .values({ tenantId, status: "running" })
    .returning();

  try {
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
    if (!tenant) throw new Error("Tenant not found");

    let snapshot: TenantSnapshot;

    if (tenant.provider === "google") {
      snapshot = await buildGoogleSnapshot(tenantId);
      await persistGoogleData(tenantId, scan.id, snapshot.google!);
    } else if (tenant.provider === "microsoft") {
      snapshot = await buildMicrosoftSnapshot(tenantId, tenant.primaryDomain ?? "");
      await persistMicrosoftData(tenantId, scan.id, snapshot.microsoft!);
    } else {
      throw new Error(`Unknown provider: ${tenant.provider}`);
    }

    const result = runScoringEngine(snapshot);

    await db.insert(scores).values({
      scanId: scan.id,
      tenantId,
      total: result.total,
      grade: result.grade,
      identity: result.categories.identity,
      dataExposure: result.categories.dataExposure,
      oauthRisk: result.categories.oauthRisk,
      detection: result.categories.detection,
      configHygiene: result.categories.configHygiene,
    });

    for (const finding of result.findings) {
      await db
        .insert(findings)
        .values({
          tenantId,
          latestScanId: scan.id,
          ruleId: finding.ruleId,
          category: finding.category,
          severity: finding.severity,
          title: finding.title,
          description: finding.description,
          evidence: finding.evidence,
          evidenceHash: finding.evidenceHash,
          pointsLost: finding.pointsLost,
          remediationMd: finding.remediationMd,
          remediationUrl: finding.remediationUrl,
          status: "open",
          lastSeenAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [findings.tenantId, findings.ruleId, findings.evidenceHash],
          set: {
            latestScanId: scan.id,
            evidence: finding.evidence,
            pointsLost: finding.pointsLost,
            lastSeenAt: new Date(),
          },
        });
    }

    await db
      .update(scans)
      .set({
        status: "success",
        finishedAt: new Date(),
        rawSummary: { total: result.total, findingCount: result.findings.length },
      })
      .where(eq(scans.id, scan.id));

    await db.update(tenants).set({ lastScanAt: new Date() }).where(eq(tenants.id, tenantId));

    const diff = await computeScanDiff(tenantId, scan.id);

    // Fire-and-forget notification (don't fail the scan if notification fails)
    notifyOnScanComplete({
      tenantId,
      score: result.total,
      grade: result.grade,
      newFindings: diff.newFindings,
      resolvedFindings: diff.resolvedFindings,
    }).catch((err) => console.error("Notification error:", err));

    return scan.id;
  } catch (error) {
    await db
      .update(scans)
      .set({
        status: "error",
        finishedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      })
      .where(eq(scans.id, scan.id));

    throw error;
  }
}

async function buildGoogleSnapshot(tenantId: string): Promise<TenantSnapshot> {
  const auth = await getAuthenticatedClient(tenantId);
  const [users, verifiedDomains, oauthGrantList, alerts, suspiciousLogins] = await Promise.all([
    listGoogleUsers(auth),
    getVerifiedDomains(auth),
    listGoogleOAuthGrants(auth),
    listAlertCenterAlerts(auth),
    listSuspiciousLogins(auth),
  ]);
  const exposedFileList = await listExposedFiles(auth, verifiedDomains);

  const googleSnapshot: GoogleSnapshot = {
    users,
    verifiedDomains,
    oauthApps: oauthGrantList,
    exposedFiles: exposedFileList,
    suspiciousLogins: suspiciousLogins.length,
    unresolvedAlerts: alerts,
  };

  return { provider: "google", google: googleSnapshot };
}

async function buildMicrosoftSnapshot(
  tenantId: string,
  primaryDomain: string,
): Promise<TenantSnapshot> {
  const client = await getGraphClientForTenant(tenantId);

  const [
    users,
    globalAdmins,
    mfaRegistration,
    secureScore,
    conditionalAccessPolicies,
    oauthGrants,
    exposedItems,
    riskySignIns,
    legacyAuthSignIns,
    externalForwarders,
  ] = await Promise.all([
    listMsUsers(client),
    listGlobalAdmins(client),
    getMfaRegistration(client),
    getSecureScore(client),
    listConditionalAccessPolicies(client),
    listMsOAuthGrants(client),
    listExposedItems(client, primaryDomain),
    countRiskySignIns(client),
    countLegacyAuthSignIns(client),
    countExternalForwarders(client, primaryDomain),
  ]);

  const microsoftSnapshot: MicrosoftSnapshot = {
    users,
    globalAdmins,
    mfaRegistration,
    conditionalAccessPolicies,
    secureScore,
    oauthGrants,
    exposedItems,
    riskySignIns,
    externalForwarders,
    legacyAuthSignIns,
  };

  return { provider: "microsoft", microsoft: microsoftSnapshot };
}

async function persistGoogleData(
  tenantId: string,
  scanId: string,
  google: GoogleSnapshot,
): Promise<void> {
  if (google.exposedFiles.length > 0) {
    await db.delete(exposedFiles).where(eq(exposedFiles.tenantId, tenantId));
    await db.insert(exposedFiles).values(
      google.exposedFiles.map((f) => ({
        tenantId,
        scanId,
        externalFileId: f.fileId,
        name: f.name,
        webLink: f.webLink,
        exposureType: f.exposureType,
        externalRecipients: f.externalRecipients,
        ownerEmail: f.ownerEmail,
        modifiedAt: f.modifiedAt,
      })),
    );
  }

  if (google.oauthApps.length > 0) {
    await db.delete(oauthApps).where(eq(oauthApps.tenantId, tenantId));
    await db.insert(oauthApps).values(
      google.oauthApps.map((a) => ({
        tenantId,
        provider: "google" as const,
        externalAppId: a.clientId,
        appName: a.appName,
        scopes: a.scopes,
        userCount: a.userCount,
      })),
    );
  }
}

async function persistMicrosoftData(
  tenantId: string,
  scanId: string,
  microsoft: MicrosoftSnapshot,
): Promise<void> {
  if (microsoft.exposedItems.length > 0) {
    await db.delete(exposedFiles).where(eq(exposedFiles.tenantId, tenantId));
    await db.insert(exposedFiles).values(
      microsoft.exposedItems.map((f) => ({
        tenantId,
        scanId,
        externalFileId: f.itemId,
        name: f.name,
        webLink: f.webUrl,
        exposureType: f.exposureType,
        externalRecipients: f.externalRecipients,
        ownerEmail: null,
        modifiedAt: null,
      })),
    );
  }

  if (microsoft.oauthGrants.length > 0) {
    await db.delete(oauthApps).where(eq(oauthApps.tenantId, tenantId));
    await db.insert(oauthApps).values(
      microsoft.oauthGrants.map((a) => ({
        tenantId,
        provider: "microsoft" as const,
        externalAppId: a.appId,
        appName: a.appName,
        scopes: a.scopes,
        userCount: a.userCount,
      })),
    );
  }
}
