import { ConfidentialClientApplication, Configuration } from "@azure/msal-node";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";
import { ClientSecretCredential } from "@azure/identity";

export const MICROSOFT_SCOPES = ["https://graph.microsoft.com/.default"];

export function getMicrosoftAuthUrl(tenantIdHint?: string): string {
  const tenantId = tenantIdHint ?? "common";
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_INTEGRATION_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.MICROSOFT_INTEGRATION_REDIRECT_URI!,
    scope: "https://graph.microsoft.com/.default offline_access",
    response_mode: "query",
    prompt: "consent",
  });

  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, tenantId: string) {
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_INTEGRATION_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_INTEGRATION_CLIENT_SECRET!,
    code,
    redirect_uri: process.env.MICROSOFT_INTEGRATION_REDIRECT_URI!,
    grant_type: "authorization_code",
    scope: "https://graph.microsoft.com/.default offline_access",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Microsoft token exchange failed: ${err}`);
  }

  return res.json() as Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: string;
    scope: string;
  }>;
}

export async function refreshAccessToken(
  refreshToken: string,
  tenantId: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in: number }> {
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_INTEGRATION_CLIENT_ID!,
    client_secret: process.env.MICROSOFT_INTEGRATION_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    scope: "https://graph.microsoft.com/.default offline_access",
  });

  const res = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    { method: "POST", body, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Microsoft token refresh failed: ${err}`);
  }

  return res.json();
}

export function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

export async function getGraphClientForTenant(tenantId: string): Promise<Client> {
  const { db } = await import("@/lib/db/client");
  const { tenants } = await import("@/lib/db/schema");
  const { decrypt, encrypt } = await import("@/lib/crypto");
  const { eq } = await import("drizzle-orm");

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant || !tenant.refreshTokenEncrypted) throw new Error("Tenant not found or not connected");

  const refreshToken = decrypt(tenant.refreshTokenEncrypted);
  const msftTenantId = tenant.externalTenantId ?? "common";

  let accessToken: string;
  if (
    tenant.accessTokenEncrypted &&
    tenant.accessTokenExpiresAt &&
    tenant.accessTokenExpiresAt > new Date(Date.now() + 60_000)
  ) {
    accessToken = decrypt(tenant.accessTokenEncrypted);
  } else {
    const refreshed = await refreshAccessToken(refreshToken, msftTenantId);
    accessToken = refreshed.access_token;
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

    await db
      .update(tenants)
      .set({
        accessTokenEncrypted: encrypt(accessToken),
        accessTokenExpiresAt: expiresAt,
        ...(refreshed.refresh_token
          ? { refreshTokenEncrypted: encrypt(refreshed.refresh_token) }
          : {}),
      })
      .where(eq(tenants.id, tenantId));
  }

  return createGraphClient(accessToken);
}
