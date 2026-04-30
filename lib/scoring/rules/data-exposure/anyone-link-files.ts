import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "data-exposure.anyone-with-link-files",
  category: "data_exposure",
  weight: 6,
  cisControl: "CIS 3.3",
  nistFunction: "PR.DS",
  appliesTo: ["google", "microsoft"],
  evaluate(snapshot): RuleResult {
    const files =
      snapshot.provider === "google"
        ? (snapshot.google?.exposedFiles ?? []).filter((f) => f.exposureType === "anyone_with_link")
        : (snapshot.microsoft?.exposedItems ?? []).filter((f) => f.exposureType === "anyone_with_link");

    const count = files.length;
    const threshold = 100;
    const pointsEarned = Math.round(this.weight * Math.max(0, 1 - count / threshold));

    if (count === 0) return { pointsEarned: this.weight, findings: [] };

    return {
      pointsEarned,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: count > 50 ? "high" : "medium",
          title: "Files shared with 'Anyone with the link'",
          description: `${count} file(s) can be accessed by anyone who has the link — no sign-in required.`,
          evidence: {
            files: files.slice(0, 10).map((f) => ({ name: f.name, link: "webLink" in f ? f.webLink : f.webUrl })),
            count,
          },
          evidenceHash: createHash("sha256").update(`anyone-link-${count}`).digest("hex"),
          pointsLost: this.weight - pointsEarned,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            "1. Review the files listed and check if the link-sharing is intentional.\n" +
            "2. For Drive: open each file → Share → change link access to **Restricted** or **Only people with access**.\n" +
            "3. Consider setting the organization-wide default to **Restricted** in Admin Console → Apps → Google Workspace → Drive → Sharing settings.\n" +
            "4. For SharePoint: update the default link type to **Specific people** in the SharePoint admin center.",
          remediationUrl:
            snapshot.provider === "google"
              ? "https://admin.google.com/ac/apps/sites/sharing"
              : "https://admin.microsoft.com/sharepoint",
        },
      ],
    };
  },
};
