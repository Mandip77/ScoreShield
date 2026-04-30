import type { Client } from "@microsoft/microsoft-graph-client";

interface MessageRule {
  actions?: { forwardTo?: Array<{ emailAddress?: { address?: string } }> };
  isEnabled?: boolean;
}

interface MailboxSettings {
  automaticRepliesSetting?: { externalReplyMessage?: string };
  // forwardingSmtpAddress is the key field
  forwardingSmtpAddress?: string | null;
}

/**
 * Counts mailboxes with auto-forwarding to external addresses.
 * Samples up to 100 users to stay within Graph throttling limits.
 */
export async function countExternalForwarders(
  client: Client,
  internalDomain: string,
  sampleSize = 100,
): Promise<number> {
  let count = 0;

  try {
    const usersRes = await client
      .api(`/users?$select=id,userPrincipalName&$top=${sampleSize}`)
      .get();

    const users: Array<{ id: string; userPrincipalName: string }> = usersRes.value ?? [];

    // Batch: use $batch (up to 20 per batch)
    const BATCH_SIZE = 20;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      const requests = batch.map((u, idx) => ({
        id: String(idx),
        method: "GET",
        url: `/users/${u.id}/mailboxSettings`,
      }));

      try {
        const batchRes = await client.api("/$batch").post({ requests });
        for (const response of batchRes.responses ?? []) {
          if (response.status === 200) {
            const settings: MailboxSettings = response.body;
            const fwd = settings.forwardingSmtpAddress;
            if (fwd) {
              const domain = fwd.split("@")[1]?.toLowerCase() ?? "";
              if (domain && domain !== internalDomain.toLowerCase()) {
                count++;
              }
            }
          }
        }
      } catch {
        continue;
      }
    }
  } catch {
    return 0;
  }

  return count;
}
