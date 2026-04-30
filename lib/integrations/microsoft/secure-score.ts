import type { Client } from "@microsoft/microsoft-graph-client";

export interface SecureScoreResult {
  current: number;
  max: number;
  percentage: number;
  comparativeScores: Array<{ basis: string; averageScore: number }>;
}

export async function getSecureScore(client: Client): Promise<SecureScoreResult | null> {
  try {
    const res = await client
      .api("/security/secureScores?$top=1")
      .get();

    const score = res.value?.[0];
    if (!score) return null;

    return {
      current: score.currentScore ?? 0,
      max: score.maxScore ?? 100,
      percentage: score.maxScore > 0 ? Math.round((score.currentScore / score.maxScore) * 100) : 0,
      comparativeScores: score.averageComparativeScores ?? [],
    };
  } catch {
    return null;
  }
}
