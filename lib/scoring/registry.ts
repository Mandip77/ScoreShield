import type { Rule } from "./types";
// Identity & Access
import { rule as adminsWithoutMfa } from "./rules/identity/admins-without-mfa";
import { rule as usersWithoutMfa } from "./rules/identity/users-without-mfa";
import { rule as tooManyAdmins } from "./rules/identity/too-many-admins";
import { rule as inactiveAdminAccounts } from "./rules/identity/inactive-admin-accounts";
import { rule as noConditionalAccessMfa } from "./rules/identity/no-conditional-access-mfa";
import { rule as weakPasswordPolicy } from "./rules/identity/weak-password-policy";
// Data Exposure
import { rule as publicFiles } from "./rules/data-exposure/public-files";
import { rule as anyoneLinkFiles } from "./rules/data-exposure/anyone-link-files";
import { rule as mailboxForwarding } from "./rules/data-exposure/mailbox-forwarding";
import { rule as externalSharesVolume } from "./rules/data-exposure/external-shares-volume";
import { rule as sharedDriveExternalMembers } from "./rules/data-exposure/shared-drive-external-members";
// OAuth Risk
import { rule as dangerousScopes } from "./rules/oauth-risk/dangerous-scopes";
import { rule as unverifiedPublisher } from "./rules/oauth-risk/unverified-publisher";
import { rule as dormantOAuthGrants } from "./rules/oauth-risk/dormant-oauth-grants";
import { rule as domainWideDelegation } from "./rules/oauth-risk/domain-wide-delegation";
// Detection
import { rule as auditLogEnabled } from "./rules/detection/audit-log-enabled";
import { rule as unresolvedAlerts } from "./rules/detection/unresolved-alerts";
import { rule as loggingExportConfigured } from "./rules/detection/logging-export-configured";
// Config Hygiene
import { rule as externalSharingDefault } from "./rules/config-hygiene/external-sharing-default";
import { rule as legacyAuth } from "./rules/config-hygiene/legacy-auth";
import { rule as secureScoreBenchmark } from "./rules/config-hygiene/secure-score-benchmark";

export const RULES: Rule[] = [
  // Identity & Access — 25 pts max
  adminsWithoutMfa,             // 8 pts  (both)
  usersWithoutMfa,              // 6 pts  (both)
  tooManyAdmins,                // 3 pts  (both)
  inactiveAdminAccounts,        // 4 pts  (both)
  noConditionalAccessMfa,       // 4 pts  (microsoft only)
  weakPasswordPolicy,           // 4 pts  (google only)
  // Data Exposure — 25 pts max
  publicFiles,                  // 8 pts  (both)
  anyoneLinkFiles,              // 6 pts  (both)
  mailboxForwarding,            // 4 pts  (microsoft only)
  externalSharesVolume,         // 5 pts  (both)
  sharedDriveExternalMembers,   // 2 pts  (both)
  // OAuth Risk — 20 pts max
  dangerousScopes,              // 8 pts  (both)
  unverifiedPublisher,          // 4 pts  (microsoft only)
  dormantOAuthGrants,           // 4 pts  (both)
  domainWideDelegation,         // 4 pts  (google only)
  // Detection — 15 pts max
  auditLogEnabled,              // 4 pts  (both)
  unresolvedAlerts,             // 4 pts  (both)
  loggingExportConfigured,      // 3 pts  (both)
  // Config Hygiene — 15 pts max
  externalSharingDefault,       // 5 pts  (both)
  legacyAuth,                   // 4 pts  (microsoft only)
  secureScoreBenchmark,         // 3 pts  (microsoft only)
];

export const CATEGORY_MAX: Record<string, number> = {
  identity: 25,
  data_exposure: 25,
  oauth_risk: 20,
  detection: 15,
  config_hygiene: 15,
};
