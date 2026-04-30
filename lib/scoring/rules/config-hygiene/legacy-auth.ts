import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "config-hygiene.legacy-auth-allowed",
  category: "config_hygiene",
  weight: 4,
  cisControl: "CIS 4.8",
  nistFunction: "PR.IP",
  appliesTo: ["microsoft"],
  evaluate(snapshot): RuleResult {
    if (snapshot.provider !== "microsoft" || !snapshot.microsoft) {
      return { pointsEarned: this.weight, findings: [] };
    }

    const { legacyAuthSignIns } = snapshot.microsoft;

    if (legacyAuthSignIns === 0) return { pointsEarned: this.weight, findings: [] };

    const pointsEarned = legacyAuthSignIns > 10 ? 0 : Math.round(this.weight * 0.5);

    return {
      pointsEarned,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: legacyAuthSignIns > 10 ? "high" : "medium",
          title: "Legacy authentication protocols in use",
          description: `${legacyAuthSignIns} sign-in(s) using legacy auth (Basic auth, SMTP, IMAP, POP) detected in the last 30 days. These bypass MFA and Conditional Access.`,
          evidence: { legacyAuthSignIns },
          evidenceHash: createHash("sha256")
            .update(`legacy-auth-${legacyAuthSignIns}`)
            .digest("hex"),
          pointsLost: this.weight - pointsEarned,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            "1. Create a **Conditional Access policy** to block legacy authentication:\n" +
            "   - Users: **All users**\n" +
            "   - Cloud apps: **All cloud apps**\n" +
            "   - Conditions → Client apps: **Exchange ActiveSync clients** + **Other clients**\n" +
            "   - Grant: **Block access**\n" +
            "2. Audit which apps are still using legacy auth via sign-in logs.\n" +
            "3. Migrate mail clients to OAuth-based modern authentication.\n" +
            "4. Disable Basic auth in Exchange Online admin center.",
          remediationUrl:
            "https://entra.microsoft.com/#view/Microsoft_AAD_ConditionalAccess/ConditionalAccessBlade/~/Policies",
        },
      ],
    };
  },
};
