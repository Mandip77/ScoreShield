import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export interface OAuthApp {
  clientId: string;
  appName: string;
  scopes: string[];
  userCount: number;
  userEmails: string[];
}

export async function listOAuthGrants(auth: OAuth2Client): Promise<OAuthApp[]> {
  const reports = google.admin({ version: "reports_v1", auth });
  const appMap = new Map<string, OAuthApp>();

  let pageToken: string | undefined;
  const startTime = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  do {
    const res = await reports.activities.list({
      userKey: "all",
      applicationName: "token",
      eventName: "authorize",
      startTime,
      maxResults: 1000,
      pageToken,
    });

    for (const activity of res.data.items ?? []) {
      const actor = activity.actor?.email ?? "unknown";
      for (const event of activity.events ?? []) {
        const params = Object.fromEntries(
          (event.parameters ?? []).map((p) => [p.name, p.value ?? p.multiValue ?? ""]),
        );
        const clientId = params["client_id"] as string;
        const appName = params["app_name"] as string ?? clientId;
        const rawScopes = params["scope"] as string | string[];
        const scopes = Array.isArray(rawScopes)
          ? rawScopes
          : typeof rawScopes === "string"
            ? rawScopes.split(" ")
            : [];

        if (!clientId) continue;

        const existing = appMap.get(clientId);
        if (existing) {
          if (!existing.userEmails.includes(actor)) {
            existing.userEmails.push(actor);
            existing.userCount++;
          }
          for (const s of scopes) {
            if (!existing.scopes.includes(s)) existing.scopes.push(s);
          }
        } else {
          appMap.set(clientId, {
            clientId,
            appName,
            scopes,
            userCount: 1,
            userEmails: [actor],
          });
        }
      }
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return Array.from(appMap.values());
}
