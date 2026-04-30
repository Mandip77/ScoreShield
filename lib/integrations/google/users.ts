import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export interface GoogleUser {
  id: string;
  primaryEmail: string;
  isAdmin: boolean;
  isDelegatedAdmin: boolean;
  suspended: boolean;
  isEnforcedIn2Sv: boolean;
  isEnrolledIn2Sv: boolean;
  lastLoginTime: Date | null;
  recoveryEmail: string | null;
}

export async function listUsers(auth: OAuth2Client): Promise<GoogleUser[]> {
  const adminDir = google.admin({ version: "directory_v1", auth });
  const users: GoogleUser[] = [];
  let pageToken: string | undefined;

  do {
    const res = await adminDir.users.list({
      customer: "my_customer",
      maxResults: 500,
      pageToken,
      projection: "full",
      fields:
        "users(id,primaryEmail,isAdmin,isDelegatedAdmin,suspended,isEnforcedIn2Sv,isEnrolledIn2Sv,lastLoginTime,recoveryEmail),nextPageToken",
    });

    for (const u of res.data.users ?? []) {
      users.push({
        id: u.id ?? "",
        primaryEmail: u.primaryEmail ?? "",
        isAdmin: u.isAdmin ?? false,
        isDelegatedAdmin: u.isDelegatedAdmin ?? false,
        suspended: u.suspended ?? false,
        isEnforcedIn2Sv: u.isEnforcedIn2Sv ?? false,
        isEnrolledIn2Sv: u.isEnrolledIn2Sv ?? false,
        lastLoginTime: u.lastLoginTime ? new Date(u.lastLoginTime) : null,
        recoveryEmail: u.recoveryEmail ?? null,
      });
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  return users;
}

export async function getVerifiedDomains(auth: OAuth2Client): Promise<string[]> {
  const adminDir = google.admin({ version: "directory_v1", auth });
  const res = await adminDir.domains.list({ customer: "my_customer" });
  return (res.data.domains ?? []).map((d) => d.domainName!).filter(Boolean);
}
