import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "data-exposure.external-shares-volume",
  category: "data_exposure",
  weight: 5,
  cisControl: "CIS 3.3",
  nistFunction: "PR.DS",
  appliesTo: ["google", "microsoft"],
  evaluate(snapshot): RuleResult {
    const exposedFiles =
      snapshot.provider === "google"
        ? snapshot.google?.exposedFiles ?? []
        : snapshot.microsoft?.exposedItems ?? [];

    const externalItems = exposedFiles.filter(
      (f) => f.exposureType === "external_user" || f.exposureType === "external_domain",
    );

    const count = externalItems.length;
    if (count === 0) return { pointsEarned: this.weight, findings: [] };

    // Graduated penalty: 1–5 = minor, 6–20 = medium, 20+ = severe
    const threshold = 20;
    const pointsEarned = Math.round(this.weight * Math.max(0, 1 - count / threshold));

    return {
      pointsEarned,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: count >= 20 ? "high" : count >= 5 ? "medium" : "low",
          title: "High volume of externally shared files",
          description: `${count} file(s) are shared with external users or domains outside your organisation.`,
          evidence: {
            count,
            sample: externalItems.slice(0, 5).map((f) =>
              "webLink" in f
                ? { name: (f as any).name, link: (f as any).webLink }
                : { name: (f as any).name, link: (f as any).webUrl },
            ),
          },
          evidenceHash: createHash("sha256")
            .update(`external-shares-${count}`)
            .digest("hex"),
          pointsLost: this.weight - pointsEarned,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            "1. Export a sharing report from your admin console.\n" +
            "2. Identify files shared with personal (non-corporate) accounts or unknown domains.\n" +
            "3. Restrict sharing to your verified domains only.\n" +
            "4. For Google: **Admin Console → Apps → Google Workspace → Drive → Sharing settings**.\n" +
            "5. For Microsoft: **SharePoint Admin Center → Policies → Sharing** → set external sharing to *Existing guests only* or *Only people in your organisation*.",
          remediationUrl:
            snapshot.provider === "google"
              ? "https://admin.google.com/ac/apps/gmail/driveandeditors"
              : "https://admin.microsoft.com/sharepoint#/policies/sharing",
        },
      ],
    };
  },
};
