import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "oauth-risk.unverified-publisher-oauth",
  category: "oauth_risk",
  weight: 4,
  cisControl: "CIS 5.4",
  nistFunction: "PR.AC",
  appliesTo: ["microsoft"],
  evaluate(snapshot): RuleResult {
    if (snapshot.provider !== "microsoft" || !snapshot.microsoft) {
      return { pointsEarned: this.weight, findings: [] };
    }

    const { oauthGrants } = snapshot.microsoft;
    const unverified = oauthGrants.filter((a) => !a.publisherVerified);

    if (unverified.length === 0) return { pointsEarned: this.weight, findings: [] };

    const pointsEarned = Math.round(
      this.weight * Math.max(0, 1 - unverified.length / Math.max(oauthGrants.length, 1)),
    );

    return {
      pointsEarned,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: "medium",
          title: "OAuth apps from unverified publishers",
          description: `${unverified.length} of ${oauthGrants.length} consented OAuth app(s) are from publishers not verified by Microsoft.`,
          evidence: {
            unverifiedApps: unverified.slice(0, 15).map((a) => a.appName),
            count: unverified.length,
            total: oauthGrants.length,
          },
          evidenceHash: createHash("sha256")
            .update(unverified.map((a) => a.appId).sort().join(","))
            .digest("hex"),
          pointsLost: this.weight - pointsEarned,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            "1. Go to **Entra admin center → Applications → Enterprise applications**.\n" +
            "2. Filter by **Unverified** publisher.\n" +
            "3. For each app, assess whether it is legitimate and actively used.\n" +
            "4. Revoke consent for apps that are unrecognized or unused.\n" +
            "5. Configure **Admin consent workflow** to require IT approval for new OAuth grants.",
          remediationUrl:
            "https://entra.microsoft.com/#view/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade/~/AppAppsPreview",
        },
      ],
    };
  },
};
