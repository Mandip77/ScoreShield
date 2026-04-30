import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "identity.no-conditional-access-for-admins",
  category: "identity",
  weight: 4,
  cisControl: "CIS 6.6",
  nistFunction: "PR.AC",
  appliesTo: ["microsoft"],
  evaluate(snapshot): RuleResult {
    if (snapshot.provider !== "microsoft" || !snapshot.microsoft) {
      return { pointsEarned: this.weight, findings: [] };
    }

    const { conditionalAccessPolicies } = snapshot.microsoft;

    const hasMfaForAdmins = conditionalAccessPolicies.some(
      (p) => p.state === "enabled" && p.requiresMfa && p.targetsAdmins,
    );

    if (hasMfaForAdmins) return { pointsEarned: this.weight, findings: [] };

    return {
      pointsEarned: 0,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: "high",
          title: "No Conditional Access policy requiring MFA for admins",
          description:
            "No enabled Conditional Access policy enforces MFA for Global Administrators or privileged roles.",
          evidence: {
            policiesEvaluated: conditionalAccessPolicies.length,
            hasMfaForAdmins: false,
          },
          evidenceHash: createHash("sha256")
            .update("no-cap-mfa-admins")
            .digest("hex"),
          pointsLost: this.weight,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            "1. Go to **Entra admin center → Protection → Conditional Access → Policies**.\n" +
            "2. Create a new policy named **Require MFA for Admins**.\n" +
            "3. Under **Users**, select **Directory roles** → choose all admin roles.\n" +
            "4. Under **Grant**, select **Require multifactor authentication**.\n" +
            "5. Set **Enable policy** to **On** and save.\n" +
            "6. Test in report-only mode for 7 days before enforcing.",
          remediationUrl:
            "https://entra.microsoft.com/#view/Microsoft_AAD_ConditionalAccess/ConditionalAccessBlade/~/Policies",
        },
      ],
    };
  },
};
