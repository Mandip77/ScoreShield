import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "oauth-risk.domain-wide-delegation-count",
  category: "oauth_risk",
  weight: 4,
  cisControl: "CIS 5.4",
  nistFunction: "PR.AC",
  appliesTo: ["google"],
  evaluate(snapshot): RuleResult {
    if (snapshot.provider !== "google" || !snapshot.google) {
      return { pointsEarned: this.weight, findings: [] };
    }

    // Apps with domain-wide delegation granted have the "admin.directory" or
    // service-account-style scopes. We proxy this via apps that hold admin directory
    // scopes, which are only grantable through DWD in Google Workspace.
    const DWD_SCOPES = [
      "https://www.googleapis.com/auth/admin.directory.user",
      "https://www.googleapis.com/auth/admin.directory.group",
      "https://www.googleapis.com/auth/admin.directory.orgunit",
      "https://www.googleapis.com/auth/admin.reports.audit.readonly",
      "https://www.googleapis.com/auth/admin.reports.usage.readonly",
    ];

    const dwdApps = snapshot.google.oauthApps.filter((a) =>
      a.scopes.some((s) => DWD_SCOPES.includes(s)),
    );

    const count = dwdApps.length;
    if (count === 0) return { pointsEarned: this.weight, findings: [] };

    // More than 2 DWD apps is unusual and risky
    const threshold = 2;
    const pointsEarned = count <= threshold ? this.weight : 0;

    return {
      pointsEarned,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: count > threshold ? "high" : "medium",
          title: "Excessive domain-wide delegation grants",
          description: `${count} app(s) have domain-wide delegation scopes, granting them access to all users' data.`,
          evidence: {
            apps: dwdApps.map((a) => ({ name: a.appName, id: a.clientId, scopes: a.scopes.filter((s) => DWD_SCOPES.includes(s)) })),
            count,
          },
          evidenceHash: createHash("sha256")
            .update(dwdApps.map((a) => a.clientId).sort().join(","))
            .digest("hex"),
          pointsLost: this.weight - pointsEarned,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            "1. Go to **Admin Console → Security → API controls → Domain-wide delegation**.\n" +
            "2. Review each listed service account.\n" +
            "3. Remove any DWD grants for apps that no longer require cross-user access.\n" +
            "4. Limit DWD scopes to the minimum required — avoid granting admin.directory scopes unless absolutely necessary.\n" +
            "5. Audit service account keys and rotate any that are more than 90 days old.",
          remediationUrl: "https://admin.google.com/ac/owl/domainwidedelegation",
        },
      ],
    };
  },
};
