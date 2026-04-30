import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db/client";
import { tenants, notifications, workspaceMembers, workspaces } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import Link from "next/link";
import { Shield, ArrowLeft, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { SlackWebhookForm } from "@/components/slack-webhook-form";
import { DisconnectTenantButton } from "@/components/disconnect-tenant-button";

export default async function TenantSettingsPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) notFound();

  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, tenant.workspaceId),
      eq(workspaceMembers.userId, session.user.id),
    ),
  });
  if (!member) notFound();

  const slackNotif = await db.query.notifications.findFirst({
    where: and(
      eq(notifications.workspaceId, tenant.workspaceId),
      eq(notifications.channel, "slack"),
    ),
  });

  const slackWebhookUrl = (slackNotif?.config as { webhookUrl?: string })?.webhookUrl ?? "";

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, tenant.workspaceId),
  });
  const hasPdfAccess =
    workspace?.plan === "pro" ||
    workspace?.plan === "agency" ||
    workspace?.plan === "enterprise";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="container mx-auto px-4 h-16 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <Shield className="h-5 w-5 text-primary" />
            ScoreShield
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href={`/dashboard/${tenantId}`} className="text-sm hover:underline">
            {tenant.displayName ?? tenant.primaryDomain}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm">Settings</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tenant.displayName ?? tenant.primaryDomain}
          </p>
        </div>

        {/* PDF Report */}
        <Card>
          <CardHeader>
            <CardTitle>PDF report</CardTitle>
            <CardDescription>
              Download a white-label PDF report with your current score, category breakdown, and all findings.
              {!hasPdfAccess && " Requires the Pro plan or higher."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasPdfAccess ? (
              <Button asChild>
                <a href={`/api/tenants/${tenantId}/report`} download>
                  <FileDown className="h-4 w-4 mr-2" />
                  Download PDF report
                </a>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/billing">Upgrade to Pro to unlock PDF reports</Link>
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Slack */}
        <Card>
          <CardHeader>
            <CardTitle>Slack alerts</CardTitle>
            <CardDescription>
              Get notified in Slack when a scan completes or new findings are detected.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SlackWebhookForm
              workspaceId={tenant.workspaceId}
              currentWebhookUrl={slackWebhookUrl}
              notificationId={slackNotif?.id}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Danger zone */}
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
            <CardDescription>
              Disconnecting will revoke our access and delete stored credentials. Your scan history
              is retained for 30 days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DisconnectTenantButton tenantId={tenantId} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
