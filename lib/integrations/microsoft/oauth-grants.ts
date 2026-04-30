import type { Client } from "@microsoft/microsoft-graph-client";
import type { MsOAuthGrant } from "@/lib/scoring/types";

interface GraphSP {
  id: string;
  appId: string;
  displayName: string;
  verifiedPublisher?: { displayName?: string };
}

interface GraphOAuth2Grant {
  clientId: string;
  scope: string;
}

export async function listOAuthGrants(client: Client): Promise<MsOAuthGrant[]> {
  // Build a map of service principal ID → SP info
  const spMap = new Map<string, GraphSP>();
  let url = "/servicePrincipals?$select=id,appId,displayName,verifiedPublisher&$top=500";

  while (url) {
    const res = await client.api(url).get();
    for (const sp of (res.value ?? []) as GraphSP[]) {
      spMap.set(sp.id, sp);
    }
    url = res["@odata.nextLink"] ?? null;
  }

  // Fetch delegated OAuth2 permission grants
  const grantsMap = new Map<string, MsOAuthGrant>();
  let grantsUrl = "/oauth2PermissionGrants?$top=500";

  while (grantsUrl) {
    const res = await client.api(grantsUrl).get();
    for (const grant of (res.value ?? []) as GraphOAuth2Grant[]) {
      const sp = spMap.get(grant.clientId);
      const scopes = (grant.scope ?? "").split(" ").filter(Boolean);

      if (grantsMap.has(grant.clientId)) {
        const existing = grantsMap.get(grant.clientId)!;
        for (const s of scopes) {
          if (!existing.scopes.includes(s)) existing.scopes.push(s);
        }
        existing.userCount++;
      } else {
        grantsMap.set(grant.clientId, {
          appId: sp?.appId ?? grant.clientId,
          appName: sp?.displayName ?? grant.clientId,
          scopes,
          userCount: 1,
          publisherVerified: !!sp?.verifiedPublisher?.displayName,
        });
      }
    }
    grantsUrl = res["@odata.nextLink"] ?? null;
  }

  return Array.from(grantsMap.values());
}
