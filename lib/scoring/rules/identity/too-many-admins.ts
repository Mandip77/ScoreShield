import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

const MAX_ADMINS = 4;

export const rule: Rule = {
  id: "identity.too-many-global-admins",
  category: "identity",
  weight: 3,
  cisControl: "CIS 6.1",
  nistFunction: "PR.AC",
  appliesTo: ["google", "microsoft"],
  evaluate(snapshot): RuleResult {
    if (snapshot.provider === "google" && snapshot.google) {
      const admins = snapshot.google.users.filter(
        (u) => !u.suspended && u.isAdmin,
      );
      if (admins.length <= MAX_ADMINS) return { pointsEarned: this.weight, findings: [] };

      return {
        pointsEarned: 0,
        findings: [
          {
            ruleId: this.id,
            category: this.category,
            severity: "medium",
            title: "Too many super-admin accounts",
            description: `Your organization has ${admins.length} super-admin accounts. CIS recommends no more than ${MAX_ADMINS}.`,
            evidence: { admins: admins.map((u) => u.primaryEmail), count: admins.length },
            evidenceHash: createHash("sha256").update(`google-admins-${admins.length}`).digest("hex"),
            pointsLost: this.weight,
            cisControl: this.cisControl,
            nistFunction: this.nistFunction,
            remediationMd:
              `1. Go to **Admin Console → Account → Admin roles**.\n` +
              `2. Review each Super Admin account.\n` +
              `3. Remove the Super Admin role from accounts that don't need it.\n` +
              `4. Use delegated admin roles (User Management Admin, etc.) instead.`,
            remediationUrl: "https://admin.google.com/ac/roles",
          },
        ],
      };
    }

    if (snapshot.provider === "microsoft" && snapshot.microsoft) {
      const { globalAdmins } = snapshot.microsoft;
      if (globalAdmins.length <= MAX_ADMINS) return { pointsEarned: this.weight, findings: [] };

      return {
        pointsEarned: 0,
        findings: [
          {
            ruleId: this.id,
            category: this.category,
            severity: "medium",
            title: "Too many Global Admin accounts",
            description: `Your tenant has ${globalAdmins.length} Global Admin accounts. CIS recommends no more than ${MAX_ADMINS}.`,
            evidence: { admins: globalAdmins.map((u) => u.userPrincipalName), count: globalAdmins.length },
            evidenceHash: createHash("sha256").update(`ms-admins-${globalAdmins.length}`).digest("hex"),
            pointsLost: this.weight,
            cisControl: this.cisControl,
            nistFunction: this.nistFunction,
            remediationMd:
              `1. Go to **Entra admin center → Identity → Roles & admins → Global Administrator**.\n` +
              `2. Identify accounts that don't need Global Admin.\n` +
              `3. Reassign to least-privilege roles (e.g., User Administrator, Billing Administrator).\n` +
              `4. Use **Privileged Identity Management (PIM)** for just-in-time elevation if licensed.`,
            remediationUrl: "https://entra.microsoft.com/#view/Microsoft_AAD_IAM/RolesManagementMenuBlade",
          },
        ],
      };
    }

    return { pointsEarned: 0, findings: [] };
  },
};
