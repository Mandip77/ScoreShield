import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "data-exposure.mailbox-external-forwarding",
  category: "data_exposure",
  weight: 4,
  cisControl: "CIS 4.6",
  nistFunction: "PR.DS",
  appliesTo: ["microsoft"],
  evaluate(snapshot): RuleResult {
    if (snapshot.provider !== "microsoft" || !snapshot.microsoft) {
      return { pointsEarned: this.weight, findings: [] };
    }

    const { externalForwarders } = snapshot.microsoft;

    if (externalForwarders === 0) return { pointsEarned: this.weight, findings: [] };

    return {
      pointsEarned: 0,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: "high",
          title: "Mailboxes with external auto-forwarding rules",
          description: `${externalForwarders} mailbox(es) are configured to automatically forward email to external addresses. This is a common data exfiltration vector.`,
          evidence: { count: externalForwarders },
          evidenceHash: createHash("sha256")
            .update(`mailbox-forwarding-${externalForwarders}`)
            .digest("hex"),
          pointsLost: this.weight,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            "1. Go to **Exchange admin center → Mail flow → Rules**.\n" +
            "2. Create a transport rule to **Block** or **Redirect and notify** when mail is auto-forwarded externally.\n" +
            "3. Review each user's mailbox forwarding settings: **Exchange admin center → Recipients → Mailboxes** → select user → Mail flow → Email forwarding.\n" +
            "4. Disable any forwarding rules that are not explicitly authorized.\n" +
            "5. Enable the **Outbound anti-spam policy** setting to block auto-forwarding to external domains.",
          remediationUrl:
            "https://admin.exchange.microsoft.com/#/transportrules",
        },
      ],
    };
  },
};
