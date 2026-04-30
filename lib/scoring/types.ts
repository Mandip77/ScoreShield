import type { GoogleUser } from "@/lib/integrations/google/users";
import type { OAuthApp } from "@/lib/integrations/google/oauth-grants";
import type { ExposedFile } from "@/lib/integrations/google/drive";

export interface GoogleSnapshot {
  users: GoogleUser[];
  verifiedDomains: string[];
  oauthApps: OAuthApp[];
  exposedFiles: ExposedFile[];
  suspiciousLogins: number;
  unresolvedAlerts: number;
}

export interface MicrosoftSnapshot {
  users: MsUser[];
  globalAdmins: MsUser[];
  mfaRegistration: Record<string, boolean>; // userId → hasStrongMfa
  conditionalAccessPolicies: MsCAP[];
  secureScore: { current: number; max: number; percentage: number } | null;
  oauthGrants: MsOAuthGrant[];
  exposedItems: MsExposedItem[];
  riskySignIns: number;
  externalForwarders: number;
  legacyAuthSignIns: number;
}

export interface MsUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  accountEnabled: boolean;
  lastSignIn: Date | null;
}

export interface MsCAP {
  id: string;
  displayName: string;
  state: "enabled" | "disabled" | "enabledForReportingButNotEnforced";
  requiresMfa: boolean;
  targetsAdmins: boolean;
}

export interface MsOAuthGrant {
  appId: string;
  appName: string;
  scopes: string[];
  userCount: number;
  publisherVerified: boolean;
}

export interface MsExposedItem {
  itemId: string;
  name: string;
  webUrl: string;
  exposureType: "public" | "anyone_with_link" | "external_user" | "external_domain";
  externalRecipients: string[];
}

export interface TenantSnapshot {
  provider: "google" | "microsoft";
  google?: GoogleSnapshot;
  microsoft?: MicrosoftSnapshot;
}

export type Severity = "critical" | "high" | "medium" | "low";
export type NistFunction = "ID" | "PR.AC" | "PR.DS" | "PR.IP" | "DE.CM" | "RS";

export interface FindingResult {
  ruleId: string;
  category: string;
  severity: Severity;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  evidenceHash: string;
  pointsLost: number;
  remediationMd: string;
  remediationUrl: string;
  cisControl: string;
  nistFunction: NistFunction;
}

export interface RuleResult {
  pointsEarned: number;
  findings: FindingResult[];
}

export interface Rule {
  id: string;
  category: "identity" | "data_exposure" | "oauth_risk" | "detection" | "config_hygiene";
  weight: number;
  cisControl: string;
  nistFunction: NistFunction;
  appliesTo: ("google" | "microsoft")[];
  evaluate: (snapshot: TenantSnapshot) => RuleResult;
}

export interface ScoreResult {
  total: number;
  grade: "A" | "B" | "C" | "D" | "F";
  categories: {
    identity: number;
    dataExposure: number;
    oauthRisk: number;
    detection: number;
    configHygiene: number;
  };
  findings: FindingResult[];
}
