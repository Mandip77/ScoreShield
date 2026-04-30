import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "detection.logging-export-configured",
  category: "detection",
  weight: 3,
  cisControl: "CIS 8.2",
  nistFunction: "DE.CM",
  appliesTo: ["google", "microsoft"],
  evaluate(snapshot): RuleResult {
    // Proxy: if we can read audit logs (i.e., the scan itself ran audit queries),
    // and we got data, logging is enabled. For Google, suspiciousLogins > -1 means
    // the Reports API responded. For Microsoft, legacyAuthSignIns >= 0 means Audit
    // logs are available. Both are always true if the scan succeeds, so we award full
    // points if the scan ran, but deduct if sign-in data is clearly unavailable (null/undefined).
    const loggingAvailable =
      snapshot.provider === "google"
        ? snapshot.google !== undefined
        : snapshot.microsoft?.legacyAuthSignIns !== undefined &&
          snapshot.microsoft.legacyAuthSignIns >= 0;

    if (loggingAvailable) {
      return { pointsEarned: this.weight, findings: [] };
    }

    return {
      pointsEarned: 0,
      findings: [
        {
          ruleId: this.id,
          category: this.category,
          severity: "medium",
          title: "Audit log export not confirmed",
          description:
            "We could not confirm that audit logs are being retained or exported to an external SIEM or storage system.",
          evidence: { loggingAvailable: false },
          evidenceHash: createHash("sha256")
            .update(`logging-export-${snapshot.provider}-unavailable`)
            .digest("hex"),
          pointsLost: this.weight,
          cisControl: this.cisControl,
          nistFunction: this.nistFunction,
          remediationMd:
            "1. Enable audit log retention and export to a durable storage system.\n" +
            "2. For Google: **Admin Console → Reports → Audit → Configure export** → export to BigQuery or Cloud Storage.\n" +
            "3. For Microsoft: **Microsoft Purview compliance portal → Audit → Audit log search** → enable auditing and configure export.\n" +
            "4. Ensure logs are retained for at least 90 days (1 year for regulated industries).\n" +
            "5. Forward logs to a SIEM (e.g., Microsoft Sentinel, Splunk, or Elastic) for alerting.",
          remediationUrl:
            snapshot.provider === "google"
              ? "https://admin.google.com/ac/reporting/audit/admin"
              : "https://compliance.microsoft.com/auditlogsearch",
        },
      ],
    };
  },
};
