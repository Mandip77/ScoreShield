import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

const INACTIVE_DAYS = 90;

export const rule: Rule = {
  id: "identity.inactive-admin-accounts",
  category: "identity",
  weight: 4,
  cisControl: "CIS 5.3",
  nistFunction: "PR.AC",
  appliesTo: ["google", "microsoft"],
  evaluate(snapshot): RuleResult {
    const cutoff = new Date(Date.now() - INACTIVE_DAYS * 24 * 60 * 60 * 1000);

    if (snapshot.provider === "google" && snapshot.google) {
      const { users } = snapshot.google;
      const activeAdmins = users.filter((u) => !u.suspended && (u.isAdmin || u.isDelegatedAdmin));
      const inactiveAdmins = activeAdmins.filter(
        (u) => !u.lastLoginTime || u.lastLoginTime < cutoff,
      );

      if (inactiveAdmins.length === 0) return { pointsEarned: this.weight, findings: [] };

      return {
        pointsEarned: 0,
        findings: [
          {
            ruleId: this.id,
            category: this.category,
            severity: "high",
            title: `Inactive admin accounts (no login in ${INACTIVE_DAYS} days)`,
            description: `${inactiveAdmins.length} admin account(s) have not logged in for over ${INACTIVE_DAYS} days but still hold admin roles.`,
            evidence: { accounts: inactiveAdmins.map((u) => u.primaryEmail), count: inactiveAdmins.length },
            evidenceHash: createHash("sha256").update(inactiveAdmins.map((u) => u.id).sort().join(",")).digest("hex"),
            pointsLost: this.weight,
            cisControl: this.cisControl,
            nistFunction: this.nistFunction,
            remediationMd:
              `1. Go to **Admin Console → Directory → Users**.\n` +
              `2. Sort by **Last sign-in** to identify dormant accounts.\n` +
              `3. Remove admin roles from stale accounts and suspend or delete them.\n` +
              `4. Set up an automated review schedule for admin accounts quarterly.`,
            remediationUrl: "https://admin.google.com/ac/users",
          },
        ],
      };
    }

    if (snapshot.provider === "microsoft" && snapshot.microsoft) {
      const { globalAdmins } = snapshot.microsoft;
      const inactive = globalAdmins.filter(
        (u) => u.accountEnabled && (!u.lastSignIn || u.lastSignIn < cutoff),
      );

      if (inactive.length === 0) return { pointsEarned: this.weight, findings: [] };

      return {
        pointsEarned: 0,
        findings: [
          {
            ruleId: this.id,
            category: this.category,
            severity: "high",
            title: `Inactive Global Admin accounts (no sign-in in ${INACTIVE_DAYS} days)`,
            description: `${inactive.length} Global Admin account(s) haven't signed in for over ${INACTIVE_DAYS} days.`,
            evidence: { accounts: inactive.map((u) => u.userPrincipalName), count: inactive.length },
            evidenceHash: createHash("sha256").update(inactive.map((u) => u.id).sort().join(",")).digest("hex"),
            pointsLost: this.weight,
            cisControl: this.cisControl,
            nistFunction: this.nistFunction,
            remediationMd:
              `1. Go to **Entra admin center → Identity → Users → All users**.\n` +
              `2. Filter by **Global Administrator** and sort by **Last sign-in**.\n` +
              `3. Disable or delete stale admin accounts.\n` +
              `4. Consider using **PIM** for just-in-time admin access instead of permanent roles.`,
            remediationUrl: "https://entra.microsoft.com/#view/Microsoft_AAD_IAM/UsersManagementMenuBlade/~/AllUsers",
          },
        ],
      };
    }

    return { pointsEarned: 0, findings: [] };
  },
};
