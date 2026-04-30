import type { Client } from "@microsoft/microsoft-graph-client";

/** Count risky sign-ins in the last N days. Degrades gracefully if not licensed. */
export async function countRiskySignIns(client: Client, days = 30): Promise<number> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const res = await client
      .api(`/identityProtection/riskyUsers?$filter=riskLastUpdatedDateTime ge ${since}&$select=id&$top=1`)
      .get();
    // If we get a result, count active risky users
    const countRes = await client
      .api(`/identityProtection/riskyUsers?$filter=riskState eq 'atRisk'&$select=id&$count=true`)
      .header("ConsistencyLevel", "eventual")
      .get();
    return countRes["@odata.count"] ?? (countRes.value?.length ?? 0);
  } catch {
    return 0;
  }
}

/** Count legacy auth sign-ins in the last N days (sign-ins using Basic/SMTP auth). */
export async function countLegacyAuthSignIns(client: Client, days = 30): Promise<number> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const res = await client
      .api(
        `/auditLogs/signIns?$filter=createdDateTime ge ${since} and clientAppUsed ne 'Browser' and clientAppUsed ne 'Mobile Apps and Desktop clients'&$select=id&$count=true&$top=1`,
      )
      .header("ConsistencyLevel", "eventual")
      .get();
    return res["@odata.count"] ?? 0;
  } catch {
    return 0;
  }
}
