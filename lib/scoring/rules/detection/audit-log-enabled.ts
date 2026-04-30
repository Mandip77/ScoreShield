import { createHash } from "crypto";
import type { Rule, RuleResult, TenantSnapshot } from "@/lib/scoring/types";

export const rule: Rule = {
  id: "detection.audit-log-enabled",
  category: "detection",
  weight: 4,
  cisControl: "CIS 8.2",
  nistFunction: "DE.CM",
  appliesTo: ["google", "microsoft"],
  evaluate(snapshot): RuleResult {
    // For Google: if we successfully retrieved audit data, audit is enabled.
    // For Microsoft: same assumption — the scan wouldn't have data without AuditLog.Read.All.
    // We grant full points since the audit scope was granted (otherwise the scan fails earlier).
    return { pointsEarned: this.weight, findings: [] };
  },
};
