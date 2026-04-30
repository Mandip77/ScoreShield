import type { Client } from "@microsoft/microsoft-graph-client";

interface UserRegistrationDetail {
  id: string;
  isMfaRegistered: boolean;
  isMfaCapable: boolean;
  methodsRegistered: string[];
}

const WEAK_MFA_ONLY = ["mobilePhone", "alternateMobilePhone"];

/**
 * Returns a map of userId → hasStrongMfa.
 * Strong MFA = any method that is NOT SMS/voice.
 */
export async function getMfaRegistration(
  client: Client,
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};
  let url = "/reports/authenticationMethods/userRegistrationDetails?$top=500";

  while (url) {
    const res = await client.api(url).get();
    for (const u of (res.value ?? []) as UserRegistrationDetail[]) {
      const methods: string[] = u.methodsRegistered ?? [];
      const strongMethods = methods.filter((m) => !WEAK_MFA_ONLY.includes(m));
      result[u.id] = strongMethods.length > 0;
    }
    url = res["@odata.nextLink"] ?? null;
  }

  return result;
}
