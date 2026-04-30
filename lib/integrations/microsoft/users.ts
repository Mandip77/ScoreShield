import type { Client } from "@microsoft/microsoft-graph-client";
import type { MsUser } from "@/lib/scoring/types";

interface GraphUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  accountEnabled: boolean;
  signInActivity?: { lastSignInDateTime?: string };
}

export async function listUsers(client: Client): Promise<MsUser[]> {
  const users: MsUser[] = [];
  let url =
    "/users?$select=id,displayName,userPrincipalName,accountEnabled,signInActivity&$top=500";

  while (url) {
    const res = await client.api(url).get();
    for (const u of (res.value ?? []) as GraphUser[]) {
      users.push({
        id: u.id,
        displayName: u.displayName ?? "",
        userPrincipalName: u.userPrincipalName ?? "",
        accountEnabled: u.accountEnabled ?? false,
        lastSignIn: u.signInActivity?.lastSignInDateTime
          ? new Date(u.signInActivity.lastSignInDateTime)
          : null,
      });
    }
    url = res["@odata.nextLink"] ?? null;
  }

  return users;
}

export async function listGlobalAdmins(client: Client): Promise<MsUser[]> {
  // Get the Global Administrator role object
  const rolesRes = await client
    .api("/directoryRoles?$filter=displayName eq 'Global Administrator'")
    .get();

  const roleId: string | undefined = rolesRes.value?.[0]?.id;
  if (!roleId) return [];

  const membersRes = await client
    .api(`/directoryRoles/${roleId}/members?$select=id,displayName,userPrincipalName,accountEnabled`)
    .get();

  return (membersRes.value ?? []).map((u: GraphUser) => ({
    id: u.id,
    displayName: u.displayName ?? "",
    userPrincipalName: u.userPrincipalName ?? "",
    accountEnabled: u.accountEnabled ?? false,
    lastSignIn: null,
  }));
}
