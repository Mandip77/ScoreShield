import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

const DORMANT_DAYS = 90;

export const rule: Rule = {
  id: "oauth-risk.dormant-oauth-grants",
  category: "oauth_risk",
  weight: 4,
  cisControl: "CIS 5.3",
  nistFunction: "PR.AC",
  appliesTo: ["google", "microsoft"],
  evaluate(snapshot): RuleResult {
    // Apps with 0 active users in last 90 days are considered dormant.
    // Google: userCount reflects distinct users who authorized in last 90 days (already windowed).
    // Microsoft: userCount from oauth2PermissionGrants is current grant count.
    const apps =
      snapshot.provider === "google"
        ? (snapshot.google?.oauthApps ?? []).filter((a) => a.userCount === 0)
        : (snapshot.microsoft?.oauthGrants ?? []).filter((a) => a.userCount === 0);

    const count = apps.length;
    if (count === 0) return { pointsEarned: this.weight, findings: [] };

    const threshold = 5;
    const pointsEarned = Math.round(this.weight * Math.max(0, 1 - count / threshold));

    return {
      pointsEarned,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: count >= 3 ? "medium" : "low",
          title: "Dormant OAuth app grants",
          description: `${count} OAuth app(s) have active grants but no user activity in the last ${DORMANT_DAYS} days.`,
          evidence: {
            apps: apps.map((a) =>
              "clientId" in a ? { name: (a as any).appName, id: (a as any).clientId } : { name: (a as any).appName, id: (a as any).appId },
            ),
            count,
          },
          evidenceHash: createHash("sha256")
            .update(
              apps
                .map((a) => ("clientId" in a ? (a as any).clientId : (a as any).appId))
                .sort()
                .join(","),
            )
            .digest("hex"),
          pointsLost: this.weight - pointsEarned,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            "1. Review each dormant app listed below.\n" +
            "2. If no longer needed, revoke the OAuth grant entirely.\n" +
            "3. For Google: **Admin Console → Security → API controls → App access control**.\n" +
            "4. For Microsoft: **Entra admin center → Applications → Enterprise applications** → remove permission grants.\n" +
            "5. Adopt a periodic quarterly review of all OAuth grants.",
          remediationUrl:
            snapshot.provider === "google"
              ? "https://admin.google.com/ac/owl/list?tab=apps"
              : "https://entra.microsoft.com/#view/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade/~/AppAppsPreview",
        },
      ],
    };
  },
};
