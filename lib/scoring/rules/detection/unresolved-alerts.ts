import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "detection.unresolved-alerts",
  category: "detection",
  weight: 4,
  cisControl: "CIS 8.11",
  nistFunction: "DE.CM",
  appliesTo: ["google", "microsoft"],
  evaluate(snapshot): RuleResult {
    const count =
      snapshot.provider === "google"
        ? (snapshot.google?.unresolvedAlerts ?? 0)
        : (snapshot.microsoft?.riskySignIns ?? 0);

    if (count === 0) return { pointsEarned: this.weight, findings: [] };

    const pointsEarned = Math.round(this.weight * Math.max(0, 1 - count / 10));

    return {
      pointsEarned,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: count >= 5 ? "high" : "medium",
          title:
            snapshot.provider === "google"
              ? "Unresolved Alert Center security alerts"
              : "Risky sign-ins in the last 30 days",
          description:
            snapshot.provider === "google"
              ? `${count} active security alert(s) in the Google Workspace Alert Center have not been resolved.`
              : `${count} risky sign-in(s) detected by Entra ID Protection in the last 30 days.`,
          evidence: { count },
          evidenceHash: createHash("sha256").update(`alerts-${snapshot.provider}-${count}`).digest("hex"),
          pointsLost: this.weight - pointsEarned,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            snapshot.provider === "google"
              ? "1. Go to **Admin Console → Security → Alert Center**.\n" +
                "2. Review and resolve each active alert.\n" +
                "3. For leaked credentials alerts, force-reset the affected user's password immediately.\n" +
                "4. Enable email notifications for new alerts in Alert Center settings."
              : "1. Go to **Entra admin center → Protection → Identity Protection → Risky sign-ins**.\n" +
                "2. Review each risk event and take action (confirm compromise or dismiss).\n" +
                "3. For confirmed compromised accounts, reset credentials and revoke sessions.\n" +
                "4. Enable **Conditional Access risk-based policies** to automate remediation.",
          remediationUrl:
            snapshot.provider === "google"
              ? "https://admin.google.com/ac/ac/alert/list"
              : "https://entra.microsoft.com/#view/Microsoft_AAD_IAM/SecurityMenuBlade/~/RiskySignIns",
        },
      ],
    };
  },
};
