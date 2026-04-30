import { db } from "@/lib/db/client";
import { notifications, workspaces, tenants, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { sendEmail } from "@/lib/email/send";
import { scanCompleteEmail } from "@/lib/email/templates/scan-complete";

interface ScanSummary {
  tenantId: string;
  score: number;
  grade: string;
  newFindings: number;
  resolvedFindings: number;
}

export async function notifyOnScanComplete(summary: ScanSummary): Promise<void> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, summary.tenantId),
  });
  if (!tenant) return;

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, tenant.workspaceId),
  });
  if (!workspace) return;

  const owner = await db.query.users.findFirst({
    where: eq(users.id, workspace.ownerUserId),
  });

  const orgName = tenant.displayName ?? tenant.primaryDomain ?? "Your organization";
  const notifList = await db.query.notifications.findMany({
    where: eq(notifications.workspaceId, workspace.id),
  });

  // Email notification
  if (owner?.email) {
    const emailEnabled = notifList.find((n) => n.channel === "email")?.enabled ?? true;
    if (emailEnabled) {
      const { subject, html, text } = scanCompleteEmail({
        orgName,
        tenantId: summary.tenantId,
        score: summary.score,
        grade: summary.grade,
        newFindings: summary.newFindings,
        resolvedFindings: summary.resolvedFindings,
      });

      await sendEmail({ to: owner.email, subject, html, text }).catch((err) =>
        console.error("Failed to send scan complete email:", err),
      );
    }
  }

  // Slack notification
  const slackConfig = notifList.find((n) => n.channel === "slack" && n.enabled);
  if (slackConfig) {
    const config = slackConfig.config as { webhookUrl?: string };
    if (config.webhookUrl) {
      await sendSlackNotification(config.webhookUrl, {
        orgName,
        tenantId: summary.tenantId,
        score: summary.score,
        grade: summary.grade,
        newFindings: summary.newFindings,
      }).catch((err) => console.error("Failed to send Slack notification:", err));
    }
  }
}

async function sendSlackNotification(
  webhookUrl: string,
  {
    orgName,
    tenantId,
    score,
    grade,
    newFindings,
  }: { orgName: string; tenantId: string; score: number; grade: string; newFindings: number },
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://scoreshield.app";
  const emoji = score >= 80 ? "✅" : score >= 60 ? "⚠️" : "🚨";

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: `${emoji} *ScoreShield scan complete* — ${orgName}`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `${emoji} *ScoreShield security scan complete*\n*${orgName}* scored *${score}/100* (Grade *${grade}*)${newFindings > 0 ? `\n⚠️ ${newFindings} new finding${newFindings !== 1 ? "s" : ""} detected` : "\n✅ No new findings"}`,
          },
          accessory: {
            type: "button",
            text: { type: "plain_text", text: "View report" },
            url: `${appUrl}/dashboard/${tenantId}`,
          },
        },
      ],
    }),
  });
}
