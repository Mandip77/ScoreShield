import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { exchangeCodeForTokens } from "@/lib/integrations/google/client";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db/client";
import { tenants, workspaces, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { google } from "googleapis";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/tenants/new?error=${error ?? "missing_code"}`, req.url),
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token || !tokens.access_token) {
      throw new Error("No refresh token returned — re-authorize with prompt=consent");
    }

    // Fetch the customer's domain to identify the tenant
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_INTEGRATION_CLIENT_ID,
      process.env.GOOGLE_INTEGRATION_CLIENT_SECRET,
      process.env.GOOGLE_INTEGRATION_REDIRECT_URI,
    );
    oauth2Client.setCredentials(tokens);

    const adminDir = google.admin({ version: "directory_v1", auth: oauth2Client });
    const domainRes = await adminDir.domains.list({ customer: "my_customer" });
    const primaryDomain =
      domainRes.data.domains?.find((d) => d.isPrimary)?.domainName ??
      domainRes.data.domains?.[0]?.domainName;

    // Get or create workspace for this user
    let workspace = await db.query.workspaces.findFirst({
      where: eq(workspaces.ownerUserId, session.user.id),
    });

    if (!workspace) {
      const [created] = await db
        .insert(workspaces)
        .values({
          name: `${session.user.name ?? session.user.email}'s workspace`,
          ownerUserId: session.user.id,
        })
        .returning();
      workspace = created;
      await db.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId: session.user.id,
        role: "owner",
      });
    }

    // Upsert the tenant record
    const existing = await db.query.tenants.findFirst({
      where: and(
        eq(tenants.workspaceId, workspace.id),
        eq(tenants.provider, "google"),
      ),
    });

    const refreshTokenEncrypted = encrypt(tokens.refresh_token);
    const accessTokenEncrypted = encrypt(tokens.access_token);
    const accessTokenExpiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : undefined;

    let tenantId: string;

    if (existing) {
      await db
        .update(tenants)
        .set({
          refreshTokenEncrypted,
          accessTokenEncrypted,
          accessTokenExpiresAt,
          primaryDomain: primaryDomain ?? existing.primaryDomain,
          displayName: primaryDomain ?? existing.displayName,
          status: "active",
          scopes: tokens.scope?.split(" "),
        })
        .where(eq(tenants.id, existing.id));
      tenantId = existing.id;
    } else {
      const [created] = await db
        .insert(tenants)
        .values({
          workspaceId: workspace.id,
          provider: "google",
          primaryDomain: primaryDomain ?? undefined,
          displayName: primaryDomain ?? undefined,
          refreshTokenEncrypted,
          accessTokenEncrypted,
          accessTokenExpiresAt,
          scopes: tokens.scope?.split(" "),
          status: "active",
        })
        .returning();
      tenantId = created.id;
    }

    // Kick off the first scan
    const scanRes = await fetch(new URL("/api/scan", req.url).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });

    return NextResponse.redirect(new URL(`/dashboard/${tenantId}`, req.url));
  } catch (err) {
    console.error("Google callback error:", err);
    return NextResponse.redirect(
      new URL("/tenants/new?error=google_callback_failed", req.url),
    );
  }
}
