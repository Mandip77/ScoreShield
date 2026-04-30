import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "data-exposure.shared-drive-external-members",
  category: "data_exposure",
  weight: 2,
  cisControl: "CIS 3.3",
  nistFunction: "PR.DS",
  appliesTo: ["google", "microsoft"],
  evaluate(snapshot): RuleResult {
    const exposedFiles =
      snapshot.provider === "google"
        ? snapshot.google?.exposedFiles ?? []
        : snapshot.microsoft?.exposedItems ?? [];

    // Count distinct external recipients across all exposed items
    const externalRecipients = new Set<string>();
    for (const f of exposedFiles) {
      if (f.exposureType === "external_user" || f.exposureType === "external_domain") {
        for (const r of f.externalRecipients ?? []) {
          externalRecipients.add(r);
        }
      }
    }

    const count = externalRecipients.size;
    if (count === 0) return { pointsEarned: this.weight, findings: [] };

    const threshold = 10;
    const pointsEarned = count <= threshold ? this.weight : 0;

    return {
      pointsEarned,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: count > threshold ? "medium" : "low",
          title: "External members with shared drive access",
          description: `${count} distinct external users or domains have access to shared drives or folders.`,
          evidence: {
            count,
            sample: Array.from(externalRecipients).slice(0, 10),
          },
          evidenceHash: createHash("sha256")
            .update(Array.from(externalRecipients).sort().join(","))
            .digest("hex"),
          pointsLost: this.weight - pointsEarned,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            "1. Audit shared drives and team drives for external membership.\n" +
            "2. Remove external members who no longer need access.\n" +
            "3. For Google: **Admin Console → Apps → Google Workspace → Drive → Shared drives** → review membership.\n" +
            "4. For Microsoft: **SharePoint → Manage access** on each site → remove external guests.\n" +
            "5. Set expiration dates on external sharing links to limit ongoing access.",
          remediationUrl:
            snapshot.provider === "google"
              ? "https://admin.google.com/ac/apps/gmail/driveandeditors"
              : "https://admin.microsoft.com/sharepoint#/policies/sharing",
        },
      ],
    };
  },
};
