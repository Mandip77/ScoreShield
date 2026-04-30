import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "data-exposure.public-on-web-files",
  category: "data_exposure",
  weight: 8,
  cisControl: "CIS 3.3",
  nistFunction: "PR.DS",
  appliesTo: ["google", "microsoft"],
  evaluate(snapshot): RuleResult {
    const files =
      snapshot.provider === "google"
        ? (snapshot.google?.exposedFiles ?? []).filter((f) => f.exposureType === "public")
        : (snapshot.microsoft?.exposedItems ?? []).filter((f) => f.exposureType === "public");

    const count = files.length;
    const totalFiles =
      snapshot.provider === "google"
        ? (snapshot.google?.exposedFiles ?? []).length + 1000
        : 1000;

    const threshold = Math.max(50, totalFiles * 0.005);
    const pointsEarned = Math.round(this.weight * Math.max(0, 1 - count / threshold));

    if (count === 0) return { pointsEarned: this.weight, findings: [] };

    return {
      pointsEarned,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: count > 10 ? "critical" : "high",
          title: "Files publicly accessible on the web",
          description: `${count} file(s) are shared with "Anyone on the internet" (searchable/discoverable).`,
          evidence: {
            files: files.slice(0, 10).map((f) => ({
              name: f.name,
              link: "webLink" in f ? (f as { webLink: string }).webLink : (f as { webUrl: string }).webUrl,
            })),
            count,
          },
          evidenceHash: createHash("sha256").update(`public-files-${count}`).digest("hex"),
          pointsLost: this.weight - pointsEarned,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            "1. Review each file listed below and determine if public access is intentional.\n" +
            "2. For Google Drive: open the file → Share → change from **Anyone on the internet** to **Restricted**.\n" +
            "3. For OneDrive/SharePoint: go to **Sharing settings** and remove the **Anyone** link.\n" +
            "4. Run a periodic sharing audit quarterly using this dashboard.",
          remediationUrl:
            snapshot.provider === "google"
              ? "https://drive.google.com"
              : "https://admin.microsoft.com/sharepoint",
        },
      ],
    };
  },
};
