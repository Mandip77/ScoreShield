import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  exchangeCodeForTokens,
  createGraphClient,
} from "@/lib/integrations/microsoft/client";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db/client";
import { tenants, workspaces, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  // Microsoft returns tenant ID in the state or as tid in the JWT claim
  // We use 'common' for exchange and extract tid from the token
  const adminConsentTenantId = searchParams.get("tenant") ?? "common";

  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/tenants/new?error=${error ?? "missing_code"}`, req.url),
    );
  }

  try {
    const tokenData = await exchangeCodeForTokens(code, adminConsentTenantId);

    // Decode the access token to extract tid (tenant ID)
    const payload = JSON.parse(
      Buffer.from(tokenData.access_token.split(".")[1], "base64url").toString(),
    );
    const externalTenantId: string = payload.tid;
    const primaryDomain: string | undefined = payload.tid;

    const graphClient = createGraphClient(tokenData.access_token);
    const orgData = await graphClient.api("/organization").select("displayName,verifiedDomains").get();
    const org = orgData?.value?.[0];
    const displayName: string | undefined = org?.displayName;
    const domain: string | undefined = org?.verifiedDomains?.find(
      (d: { isDefault: boolean; name: string }) => d.isDefault,
    )?.name;

    // Get or create workspace
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

    const existing = await db.query.tenants.findFirst({
      where: and(
        eq(tenants.workspaceId, workspace.id),
        eq(tenants.provider, "microsoft"),
      ),
    });

    const refreshTokenEncrypted = encrypt(tokenData.refresh_token);
    const accessTokenEncrypted = encrypt(tokenData.access_token);
    const accessTokenExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    let tenantId: string;

    if (existing) {
      await db
        .update(tenants)
        .set({
          externalTenantId,
          primaryDomain: domain ?? existing.primaryDomain,
          displayName: displayName ?? existing.displayName,
          refreshTokenEncrypted,
          accessTokenEncrypted,
          accessTokenExpiresAt,
          status: "active",
        })
        .where(eq(tenants.id, existing.id));
      tenantId = existing.id;
    } else {
      const [created] = await db
        .insert(tenants)
        .values({
          workspaceId: workspace.id,
          provider: "microsoft",
          externalTenantId,
          primaryDomain: domain,
          displayName,
          refreshTokenEncrypted,
          accessTokenEncrypted,
          accessTokenExpiresAt,
          status: "active",
        })
        .returning();
      tenantId = created.id;
    }

    // Kick off initial scan
    await fetch(new URL("/api/scan", req.url).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });

    return NextResponse.redirect(new URL(`/dashboard/${tenantId}`, req.url));
  } catch (err) {
    console.error("Microsoft callback error:", err);
    return NextResponse.redirect(
      new URL("/tenants/new?error=microsoft_callback_failed", req.url),
    );
  }
}
