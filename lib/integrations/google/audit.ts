import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export interface SuspiciousLoginEvent {
  actorEmail: string;
  eventType: string;
  time: Date;
}

export interface ExternalForwardingRule {
  userEmail: string;
  forwardTo: string;
}

export async function listSuspiciousLogins(
  auth: OAuth2Client,
  days = 30,
): Promise<SuspiciousLoginEvent[]> {
  const reports = google.admin({ version: "reports_v1", auth });
  const events: SuspiciousLoginEvent[] = [];
  const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  let pageToken: string | undefined;

  do {
    const res = await reports.activities.list({
      userKey: "all",
      applicationName: "login",
      eventName: "suspicious_login",
      startTime,
      maxResults: 1000,
      pageToken,
    });

    for (const activity of res.data.items ?? []) {
      events.push({
        actorEmail: activity.actor?.email ?? "unknown",
        eventType: activity.events?.[0]?.name ?? "suspicious_login",
        time: new Date(activity.id?.time ?? Date.now()),
      });
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return events;
}

export async function listAlertCenterAlerts(auth: OAuth2Client): Promise<number> {
  try {
    const alertCenter = google.alertcenter({ version: "v1beta1", auth });
    const res = await alertCenter.alerts.list({
      filter: 'status="ACTIVE"',
      pageSize: 100,
    });
    return (res.data.alerts ?? []).length;
  } catch {
    return 0;
  }
}
