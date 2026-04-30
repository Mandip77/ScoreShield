import type { Client } from "@microsoft/microsoft-graph-client";
import type { MsCAP } from "@/lib/scoring/types";

interface GraphCAP {
  id: string;
  displayName: string;
  state: string;
  conditions: {
    users?: { includeRoles?: string[] };
    applications?: { includeApplications?: string[] };
  };
  grantControls?: { builtInControls?: string[] };
}

// Well-known role IDs for Global Administrator and other privileged roles
const ADMIN_ROLE_IDS = [
  "62e90394-69f5-4237-9190-012177145e10", // Global Administrator
  "194ae4cb-b126-40b2-bd5b-6091b380977d", // Security Administrator
  "f28a1f50-f6e7-4571-818b-6a12f2af6b6c", // SharePoint Administrator
  "29232cdf-9323-42fd-ade2-1d097af3e4de", // Exchange Administrator
];

export async function listConditionalAccessPolicies(client: Client): Promise<MsCAP[]> {
  try {
    const res = await client.api("/policies/conditionalAccessPolicies").get();
    const policies: MsCAP[] = [];

    for (const cap of (res.value ?? []) as GraphCAP[]) {
      const controls = cap.grantControls?.builtInControls ?? [];
      const requiresMfa = controls.includes("mfa");

      const targetRoles = cap.conditions?.users?.includeRoles ?? [];
      const targetsAll = targetRoles.includes("All");
      const targetsAdmins =
        targetsAll || targetRoles.some((r) => ADMIN_ROLE_IDS.includes(r));

      policies.push({
        id: cap.id,
        displayName: cap.displayName,
        state: cap.state as MsCAP["state"],
        requiresMfa,
        targetsAdmins,
      });
    }

    return policies;
  } catch {
    return [];
  }
}

export function hasMfaPolicyForAdmins(policies: MsCAP[]): boolean {
  return policies.some(
    (p) => p.state === "enabled" && p.requiresMfa && p.targetsAdmins,
  );
}
