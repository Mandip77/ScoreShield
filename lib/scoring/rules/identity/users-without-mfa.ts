import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "identity.users-without-mfa",
  category: "identity",
  weight: 6,
  cisControl: "CIS 6.3",
  nistFunction: "PR.AC",
  appliesTo: ["google", "microsoft"],
  evaluate(snapshot): RuleResult {
    if (snapshot.provider === "google" && snapshot.google) {
      const { users } = snapshot.google;
      const active = users.filter((u) => !u.suspended);
      const withoutMfa = active.filter((u) => !u.isEnrolledIn2Sv);

      const ratio = active.length === 0 ? 0 : withoutMfa.length / active.length;
      const pointsEarned = Math.round(this.weight * Math.max(0, 1 - ratio * 1.5));

      if (withoutMfa.length === 0) return { pointsEarned: this.weight, findings: [] };

      return {
        pointsEarned,
        findings: [
          {
            ruleId: this.id,
            category: this.category,
            severity: ratio > 0.5 ? "high" : "medium",
            title: "Users without multi-factor authentication",
            description: `${withoutMfa.length} of ${active.length} active users (${Math.round(ratio * 100)}%) have no MFA enrolled.`,
            evidence: { withoutMfa: withoutMfa.slice(0, 20).map((u) => u.primaryEmail), total: active.length, affected: withoutMfa.length },
            evidenceHash: createHash("sha256").update(`users-mfa-${withoutMfa.length}-${active.length}`).digest("hex"),
            pointsLost: this.weight - pointsEarned,
            cisControl: this.cisControl,
            nistFunction: this.nistFunction,
            remediationMd:
              "1. Go to **Admin Console → Security → 2-Step Verification**.\n" +
              "2. Enable 2SV enforcement for the entire organization or OU.\n" +
              "3. Set a grace period (7 days) for users to enroll.\n" +
              "4. Send an enrollment reminder via the Admin Console.",
            remediationUrl: "https://admin.google.com/ac/security/2sv",
          },
        ],
      };
    }

    if (snapshot.provider === "microsoft" && snapshot.microsoft) {
      const { users, mfaRegistration } = snapshot.microsoft;
      const active = users.filter((u) => u.accountEnabled);
      const withoutMfa = active.filter((u) => !mfaRegistration[u.id]);

      const ratio = active.length === 0 ? 0 : withoutMfa.length / active.length;
      const pointsEarned = Math.round(this.weight * Math.max(0, 1 - ratio * 1.5));

      if (withoutMfa.length === 0) return { pointsEarned: this.weight, findings: [] };

      return {
        pointsEarned,
        findings: [
          {
            ruleId: this.id,
            category: this.category,
            severity: ratio > 0.5 ? "high" : "medium",
            title: "Users without multi-factor authentication",
            description: `${withoutMfa.length} of ${active.length} active users (${Math.round(ratio * 100)}%) have no MFA method registered.`,
            evidence: { withoutMfa: withoutMfa.slice(0, 20).map((u) => u.userPrincipalName), total: active.length, affected: withoutMfa.length },
            evidenceHash: createHash("sha256").update(`ms-users-mfa-${withoutMfa.length}-${active.length}`).digest("hex"),
            pointsLost: this.weight - pointsEarned,
            cisControl: this.cisControl,
            nistFunction: this.nistFunction,
            remediationMd:
              "1. Navigate to **Entra admin center → Identity → Users → Per-user MFA** (legacy) or\n" +
              "2. Create a **Conditional Access policy** requiring MFA for all users.\n" +
              "3. Enable **Security defaults** if you are on a Basic/Standard license.\n" +
              "4. Run the **MFA registration campaign** to prompt users to register.",
            remediationUrl: "https://entra.microsoft.com/#view/Microsoft_AAD_IAM/AuthenticationMethodsMenuBlade",
          },
        ],
      };
    }

    return { pointsEarned: 0, findings: [] };
  },
};
