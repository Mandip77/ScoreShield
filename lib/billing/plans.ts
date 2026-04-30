export const PLANS = {
  free: { name: "Free", maxTenants: 1, continuousMonitoring: false, pdfReports: false },
  starter: { name: "Starter", maxTenants: 1, continuousMonitoring: true, pdfReports: false },
  pro: { name: "Pro", maxTenants: 2, continuousMonitoring: true, pdfReports: true },
  agency: { name: "Agency", maxTenants: 5, continuousMonitoring: true, pdfReports: true },
  enterprise: { name: "Enterprise", maxTenants: 999, continuousMonitoring: true, pdfReports: true },
} as const;

export type Plan = keyof typeof PLANS;

const PLAN_ORDER: Plan[] = ["free", "starter", "pro", "agency", "enterprise"];

export function planAtLeast(userPlan: Plan, required: Plan): boolean {
  return PLAN_ORDER.indexOf(userPlan) >= PLAN_ORDER.indexOf(required);
}

export function requirePlan(userPlan: Plan, required: Plan): void {
  if (!planAtLeast(userPlan, required)) {
    throw new Error(`This feature requires the ${required} plan or higher.`);
  }
}
