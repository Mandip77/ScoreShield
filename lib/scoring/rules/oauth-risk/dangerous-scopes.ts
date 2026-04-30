import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

const DANGEROUS_SCOPES = [
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/admin.directory.user",
  // Microsoft Graph
  "Mail.ReadWrite",
  "Mail.Read",
  "Files.ReadWrite.All",
  "Sites.FullControl.All",
  "Directory.ReadWrite.All",
  "User.ReadWrite.All",
];

export const rule: Rule = {
  id: "oauth-risk.dangerous-oauth-scopes",
  category: "oauth_risk",
  weight: 8,
  cisControl: "CIS 5.4",
  nistFunction: "PR.AC",
  appliesTo: ["google", "microsoft"],
  evaluate(snapshot): RuleResult {
    const apps =
      snapshot.provider === "google"
        ? (snapshot.google?.oauthApps ?? []).filter((a) =>
            a.scopes.some((s) => DANGEROUS_SCOPES.includes(s)),
          )
        : (snapshot.microsoft?.oauthGrants ?? []).filter((a) =>
            a.scopes.some((s) => DANGEROUS_SCOPES.some((d) => s.includes(d))),
          );

    const count = apps.length;
    const threshold = 5;
    const pointsEarned = Math.round(this.weight * Math.max(0, 1 - count / threshold));

    if (count === 0) return { pointsEarned: this.weight, findings: [] };

    return {
      pointsEarned,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: count >= 3 ? "critical" : "high",
          title: "Third-party OAuth apps with high-risk scopes",
          description: `${count} OAuth app(s) have been granted scopes that allow reading or modifying email/files for all users.`,
          evidence: {
            apps: apps.map((a) => ({
              name: a.appName,
              dangerousScopes: (a.scopes as string[]).filter((s) =>
                DANGEROUS_SCOPES.some((d) => s.includes(d)),
              ),
            })),
            count,
          },
          evidenceHash: createHash("sha256")
            .update(
              apps
                .map((a) => ("clientId" in a ? (a as { clientId: string }).clientId : (a as { appId: string }).appId))
                .sort()
                .join(","),
            )
            .digest("hex"),
          pointsLost: this.weight - pointsEarned,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            "1. Review each app listed below with your team.\n" +
            "2. For apps that aren't recognized or no longer used, revoke access.\n" +
            "3. For Google: **Admin Console → Security → API controls → App access control**.\n" +
            "4. For Microsoft: **Entra admin center → Applications → Enterprise applications** → revoke permissions.\n" +
            "5. Implement an app approval process for any new OAuth grants.",
          remediationUrl:
            snapshot.provider === "google"
              ? "https://admin.google.com/ac/owl/list?tab=apps"
              : "https://entra.microsoft.com/#view/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade/~/AppAppsPreview",
        },
      ],
    };
  },
};
