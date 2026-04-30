import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "identity.admins-without-mfa",
  category: "identity",
  weight: 8,
  cisControl: "CIS 6.5",
  nistFunction: "PR.AC",
  appliesTo: ["google", "microsoft"],
  evaluate(snapshot): RuleResult {
    if (snapshot.provider === "google" && snapshot.google) {
      const { users } = snapshot.google;
      const admins = users.filter((u) => !u.suspended && (u.isAdmin || u.isDelegatedAdmin));
      const adminsWithoutMfa = admins.filter((u) => !u.isEnrolledIn2Sv);

      const pointsEarned =
        admins.length === 0
          ? this.weight
          : Math.round(this.weight * ((admins.length - adminsWithoutMfa.length) / admins.length));

      const findings =
        adminsWithoutMfa.length === 0
          ? []
          : [
              {
                ruleId: this.id,
                category: this.category,
                severity: "critical" as const,
                title: "Admins without multi-factor authentication",
                description: `${adminsWithoutMfa.length} of ${admins.length} admin accounts have no MFA enrolled.`,
                evidence: {
                  adminsWithoutMfa: adminsWithoutMfa.map((u) => u.primaryEmail),
                  total: admins.length,
                  affected: adminsWithoutMfa.length,
                },
                evidenceHash: createHash("sha256")
                  .update(adminsWithoutMfa.map((u) => u.id).sort().join(","))
                  .digest("hex"),
                pointsLost: this.weight - pointsEarned,
                cisControl: this.cisControl,
                nistFunction: this.nistFunction,
                remediationMd:
                  "1. Go to **Admin Console → Security → 2-Step Verification**.\n" +
                  "2. Set enforcement to *On* for all admin accounts.\n" +
                  "3. Require a security key or TOTP app (not SMS) for privileged accounts.\n" +
                  "4. Remove admin roles from accounts whose owners cannot enroll within 7 days.",
                remediationUrl:
                  "https://admin.google.com/ac/security/2sv",
              },
            ];

      return { pointsEarned, findings };
    }

    if (snapshot.provider === "microsoft" && snapshot.microsoft) {
      const { globalAdmins, mfaRegistration } = snapshot.microsoft;
      const adminsWithoutMfa = globalAdmins.filter((u) => !mfaRegistration[u.id]);

      const pointsEarned =
        globalAdmins.length === 0
          ? this.weight
          : Math.round(
              this.weight *
                ((globalAdmins.length - adminsWithoutMfa.length) / globalAdmins.length),
            );

      const findings =
        adminsWithoutMfa.length === 0
          ? []
          : [
              {
                ruleId: this.id,
                category: this.category,
                severity: "critical" as const,
                title: "Global Admins without multi-factor authentication",
                description: `${adminsWithoutMfa.length} of ${globalAdmins.length} Global Admin accounts have no MFA method registered.`,
                evidence: {
                  adminsWithoutMfa: adminsWithoutMfa.map((u) => u.userPrincipalName),
                  total: globalAdmins.length,
                  affected: adminsWithoutMfa.length,
                },
                evidenceHash: createHash("sha256")
                  .update(adminsWithoutMfa.map((u) => u.id).sort().join(","))
                  .digest("hex"),
                pointsLost: this.weight - pointsEarned,
                cisControl: this.cisControl,
                nistFunction: this.nistFunction,
                remediationMd:
                  "1. Go to **Entra admin center → Identity → Users → All users**.\n" +
                  "2. Filter by *Global Administrator* role.\n" +
                  "3. For each account, ensure MFA is registered via **Microsoft Authenticator** (not SMS).\n" +
                  "4. Create a **Conditional Access policy** requiring MFA for all admin roles.",
                remediationUrl:
                  "https://entra.microsoft.com/#view/Microsoft_AAD_IAM/AuthenticationMethodsMenuBlade",
              },
            ];

      return { pointsEarned, findings };
    }

    return { pointsEarned: 0, findings: [] };
  },
};
