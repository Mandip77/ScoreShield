import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "config-hygiene.external-sharing-default-public",
  category: "config_hygiene",
  weight: 5,
  cisControl: "CIS 3.2",
  nistFunction: "PR.IP",
  appliesTo: ["google", "microsoft"],
  evaluate(snapshot): RuleResult {
    // Derive from exposed file volume as a proxy for "sharing defaults are too open"
    const exposed =
      snapshot.provider === "google"
        ? snapshot.google?.exposedFiles ?? []
        : snapshot.microsoft?.exposedItems ?? [];

    const publicOrLink = exposed.filter(
      (f) => f.exposureType === "public" || f.exposureType === "anyone_with_link",
    ).length;

    // If there are 0 broadly-exposed files, assume good defaults
    if (publicOrLink === 0) return { pointsEarned: this.weight, findings: [] };

    // >20 broadly-exposed files is a strong signal that defaults are open
    const likelyOpenDefaults = publicOrLink > 20;
    const pointsEarned = likelyOpenDefaults ? 0 : Math.round(this.weight * 0.5);

    return {
      pointsEarned,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: likelyOpenDefaults ? "high" : "medium",
          title: "Sharing defaults may be too permissive",
          description: `${publicOrLink} file(s) are broadly exposed, suggesting organizational sharing defaults allow "Anyone with the link" or public access by default.`,
          evidence: { broadlyExposedFiles: publicOrLink },
          evidenceHash: createHash("sha256").update(`sharing-default-${publicOrLink}`).digest("hex"),
          pointsLost: this.weight - pointsEarned,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            snapshot.provider === "google"
              ? "1. Go to **Admin Console → Apps → Google Workspace → Drive and Docs → Sharing settings**.\n" +
                "2. Set **Sharing outside of [domain]** to **Not allowed** or **Allowed with warning**.\n" +
                "3. Set the default link sharing to **Restricted** for new files.\n" +
                "4. Review and update Shared Drives settings to disable external sharing."
              : "1. Go to **SharePoint admin center → Policies → Sharing**.\n" +
                "2. Set **External sharing** to **Only people in your organization** or **Existing guests**.\n" +
                "3. Change the default link type from **Anyone** to **Specific people**.\n" +
                "4. Set **Link expiration** for Anyone links.",
          remediationUrl:
            snapshot.provider === "google"
              ? "https://admin.google.com/ac/apps/sites/sharing"
              : "https://admin.microsoft.com/sharepoint#/sharing",
        },
      ],
    };
  },
};
