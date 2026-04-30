import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "identity.weak-password-policy",
  category: "identity",
  weight: 4,
  cisControl: "CIS 5.2",
  nistFunction: "PR.AC",
  appliesTo: ["google"],
  evaluate(snapshot): RuleResult {
    if (snapshot.provider !== "google" || !snapshot.google) {
      return { pointsEarned: this.weight, findings: [] };
    }

    const { users } = snapshot.google;

    // Proxy: users with no 2SV enrolled AND who are not suspended represent accounts
    // that rely solely on password — the weakest authentication factor.
    // If >20% of active users have no MFA, flag a weak password policy finding.
    const activeUsers = users.filter((u) => !u.suspended);
    const noMfaUsers = activeUsers.filter((u) => !u.isEnrolledIn2Sv);
    const ratio = activeUsers.length > 0 ? noMfaUsers.length / activeUsers.length : 0;

    // Award full points if fewer than 10% lack MFA (password policy compensated by MFA)
    if (ratio < 0.1) return { pointsEarned: this.weight, findings: [] };

    const pointsEarned = Math.round(this.weight * (1 - ratio));

    return {
      pointsEarned,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: ratio >= 0.5 ? "high" : "medium",
          title: "Weak password policy — MFA not enforced for all users",
          description: `${noMfaUsers.length} of ${activeUsers.length} active users (${Math.round(ratio * 100)}%) have no MFA enrolled, relying solely on passwords.`,
          evidence: {
            activeUsers: activeUsers.length,
            noMfaUsers: noMfaUsers.length,
            ratioPercent: Math.round(ratio * 100),
          },
          evidenceHash: createHash("sha256")
            .update(`weak-password-${noMfaUsers.length}-of-${activeUsers.length}`)
            .digest("hex"),
          pointsLost: this.weight - pointsEarned,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            "1. Go to **Admin Console → Security → 2-Step Verification**.\n" +
            "2. Enable enforcement for all users in your organisation.\n" +
            "3. Set a grace period (e.g., 1 week) so users can enrol before being locked out.\n" +
            "4. Require a hardware security key or TOTP app — disallow SMS for high-privilege accounts.\n" +
            "5. Enable **Password alert** extension (Chrome) to detect password reuse on phishing sites.",
          remediationUrl: "https://admin.google.com/ac/security/2sv",
        },
      ],
    };
  },
};
