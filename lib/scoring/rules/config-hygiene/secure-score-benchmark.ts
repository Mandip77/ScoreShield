import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "config-hygiene.secure-score-vs-industry",
  category: "config_hygiene",
  weight: 3,
  cisControl: "CIS 18.1",
  nistFunction: "PR.IP",
  appliesTo: ["microsoft"],
  evaluate(snapshot): RuleResult {
    if (snapshot.provider !== "microsoft" || !snapshot.microsoft) {
      return { pointsEarned: this.weight, findings: [] };
    }

    const { secureScore } = snapshot.microsoft;
    if (!secureScore) return { pointsEarned: Math.round(this.weight / 2), findings: [] };

    const { percentage } = secureScore;
    // Full credit above 70%, scaled credit 40–70%, no credit below 40%
    const pointsEarned =
      percentage >= 70
        ? this.weight
        : percentage >= 40
          ? Math.round(this.weight * ((percentage - 40) / 30))
          : 0;

    if (pointsEarned >= this.weight) return { pointsEarned, findings: [] };

    return {
      pointsEarned,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: percentage < 40 ? "high" : "medium",
          title: "Microsoft Secure Score is below recommended threshold",
          description: `Your Microsoft Secure Score is ${secureScore.current}/${secureScore.max} (${percentage}%). Aim for at least 70% to be in line with industry best practice.`,
          evidence: {
            current: secureScore.current,
            max: secureScore.max,
            percentage,
          },
          evidenceHash: createHash("sha256")
            .update(`secure-score-${percentage}`)
            .digest("hex"),
          pointsLost: this.weight - pointsEarned,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            "1. Go to **Microsoft Secure Score** in the Microsoft Defender portal.\n" +
            "2. Review the **Recommended actions** tab for the highest-impact improvements.\n" +
            "3. Prioritize Identity and Data controls first.\n" +
            "4. Use the **Compare** tab to benchmark against similar organizations.",
          remediationUrl:
            "https://security.microsoft.com/securescore",
        },
      ],
    };
  },
};
