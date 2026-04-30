import { RULES, CATEGORY_MAX } from "./registry";
import type { TenantSnapshot, ScoreResult, FindingResult } from "./types";

function computeGrade(total: number): "A" | "B" | "C" | "D" | "F" {
  if (total >= 90) return "A";
  if (total >= 80) return "B";
  if (total >= 70) return "C";
  if (total >= 60) return "D";
  return "F";
}

export function runScoringEngine(snapshot: TenantSnapshot): ScoreResult {
  const provider = snapshot.provider;

  const categoryEarned: Record<string, number> = {
    identity: 0,
    data_exposure: 0,
    oauth_risk: 0,
    detection: 0,
    config_hygiene: 0,
  };

  const allFindings: FindingResult[] = [];

  for (const rule of RULES) {
    if (!rule.appliesTo.includes(provider)) continue;

    const result = rule.evaluate(snapshot);
    categoryEarned[rule.category] = (categoryEarned[rule.category] ?? 0) + result.pointsEarned;
    allFindings.push(...result.findings);
  }

  // Cap each category at its max
  const identity = Math.min(categoryEarned.identity ?? 0, CATEGORY_MAX.identity);
  const dataExposure = Math.min(categoryEarned.data_exposure ?? 0, CATEGORY_MAX.data_exposure);
  const oauthRisk = Math.min(categoryEarned.oauth_risk ?? 0, CATEGORY_MAX.oauth_risk);
  const detection = Math.min(categoryEarned.detection ?? 0, CATEGORY_MAX.detection);
  const configHygiene = Math.min(categoryEarned.config_hygiene ?? 0, CATEGORY_MAX.config_hygiene);

  // Scale each category to its max contribution to total 100
  const total = Math.min(
    100,
    Math.max(0, Math.round(identity + dataExposure + oauthRisk + detection + configHygiene)),
  );

  return {
    total,
    grade: computeGrade(total),
    categories: {
      identity,
      dataExposure,
      oauthRisk,
      detection,
      configHygiene,
    },
    findings: allFindings.sort((a, b) => b.pointsLost - a.pointsLost),
  };
}
