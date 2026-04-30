import { google } from "googleapis";
import { db } from "@/lib/db/client";
import { tenants } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encrypt, decrypt } from "@/lib/crypto";

export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/admin.directory.user.readonly",
  "https://www.googleapis.com/auth/admin.directory.user.security",
  "https://www.googleapis.com/auth/admin.directory.group.readonly",
  "https://www.googleapis.com/auth/admin.directory.domain.readonly",
  "https://www.googleapis.com/auth/admin.directory.orgunit.readonly",
  "https://www.googleapis.com/auth/admin.reports.audit.readonly",
  "https://www.googleapis.com/auth/admin.reports.usage.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/apps.alerts",
];

export function getGoogleAuthUrl(): string {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_INTEGRATION_CLIENT_ID,
    process.env.GOOGLE_INTEGRATION_CLIENT_SECRET,
    process.env.GOOGLE_INTEGRATION_REDIRECT_URI,
  );

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GOOGLE_SCOPES,
    prompt: "consent",
    include_granted_scopes: true,
  });
}

export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_INTEGRATION_CLIENT_ID,
    process.env.GOOGLE_INTEGRATION_CLIENT_SECRET,
    process.env.GOOGLE_INTEGRATION_REDIRECT_URI,
  );
}

export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

export async function getAuthenticatedClient(tenantId: string) {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant || !tenant.refreshTokenEncrypted) {
    throw new Error("Tenant not found or not connected");
  }

  const oauth2Client = createOAuth2Client();
  const refreshToken = decrypt(tenant.refreshTokenEncrypted);

  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // Refresh access token if expired or missing
  if (
    !tenant.accessTokenEncrypted ||
    !tenant.accessTokenExpiresAt ||
    tenant.accessTokenExpiresAt < new Date()
  ) {
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (credentials.access_token) {
      await db
        .update(tenants)
        .set({
          accessTokenEncrypted: encrypt(credentials.access_token),
          accessTokenExpiresAt: credentials.expiry_date
            ? new Date(credentials.expiry_date)
            : undefined,
        })
        .where(eq(tenants.id, tenantId));

      oauth2Client.setCredentials(credentials);
    }
  } else {
    const accessToken = decrypt(tenant.accessTokenEncrypted);
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
      access_token: accessToken,
    });
  }

  return oauth2Client;
}
