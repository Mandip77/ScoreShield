import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  primaryKey,
  uniqueIndex,
  index,
  char,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const planEnum = pgEnum("plan", [
  "free",
  "starter",
  "pro",
  "agency",
  "enterprise",
]);

export const providerEnum = pgEnum("provider", ["google", "microsoft"]);

export const tenantStatusEnum = pgEnum("tenant_status", [
  "active",
  "error",
  "disconnected",
]);

export const scanStatusEnum = pgEnum("scan_status", [
  "queued",
  "running",
  "success",
  "error",
]);

export const severityEnum = pgEnum("severity", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const findingStatusEnum = pgEnum("finding_status", [
  "open",
  "acknowledged",
  "resolved",
  "suppressed",
]);

export const exposureTypeEnum = pgEnum("exposure_type", [
  "public",
  "anyone_with_link",
  "external_user",
  "external_domain",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "slack",
]);

export const workspaceMemberRoleEnum = pgEnum("workspace_member_role", [
  "owner",
  "admin",
  "viewer",
]);

// ─── Auth.js tables ───────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// ─── Workspaces ───────────────────────────────────────────────────────────────

export const workspaces = pgTable("workspaces", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  name: text("name").notNull(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  plan: planEnum("plan").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: workspaceMemberRoleEnum("role").notNull().default("viewer"),
  },
  (wm) => [primaryKey({ columns: [wm.workspaceId, wm.userId] })],
);

// ─── Tenants ──────────────────────────────────────────────────────────────────

export const tenants = pgTable(
  "tenants",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    provider: providerEnum("provider").notNull(),
    externalTenantId: text("external_tenant_id"),
    primaryDomain: text("primary_domain"),
    displayName: text("display_name"),
    refreshTokenEncrypted: text("refresh_token_encrypted"),
    accessTokenEncrypted: text("access_token_encrypted"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      mode: "date",
    }),
    scopes: text("scopes").array(),
    connectedAt: timestamp("connected_at", { mode: "date" }).defaultNow(),
    lastScanAt: timestamp("last_scan_at", { mode: "date" }),
    status: tenantStatusEnum("status").notNull().default("active"),
  },
  (t) => [index("tenants_workspace_id_idx").on(t.workspaceId)],
);

// ─── Scans ────────────────────────────────────────────────────────────────────

export const scans = pgTable(
  "scans",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { mode: "date" }).defaultNow().notNull(),
    finishedAt: timestamp("finished_at", { mode: "date" }),
    status: scanStatusEnum("status").notNull().default("queued"),
    errorMessage: text("error_message"),
    rawSummary: jsonb("raw_summary"),
  },
  (s) => [index("scans_tenant_started_idx").on(s.tenantId, s.startedAt)],
);

// ─── Scores ───────────────────────────────────────────────────────────────────

export const scores = pgTable("scores", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  scanId: text("scan_id")
    .notNull()
    .unique()
    .references(() => scans.id, { onDelete: "cascade" }),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  total: integer("total").notNull(),
  grade: char("grade", { length: 1 }).notNull(),
  identity: integer("identity").notNull(),
  dataExposure: integer("data_exposure").notNull(),
  oauthRisk: integer("oauth_risk").notNull(),
  detection: integer("detection").notNull(),
  configHygiene: integer("config_hygiene").notNull(),
  computedAt: timestamp("computed_at", { mode: "date" }).defaultNow().notNull(),
});

// ─── Findings ─────────────────────────────────────────────────────────────────

export const findings = pgTable(
  "findings",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    latestScanId: text("latest_scan_id").references(() => scans.id, {
      onDelete: "set null",
    }),
    ruleId: text("rule_id").notNull(),
    category: text("category").notNull(),
    severity: severityEnum("severity").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    evidence: jsonb("evidence").notNull(),
    evidenceHash: text("evidence_hash").notNull(),
    pointsLost: integer("points_lost").notNull(),
    remediationMd: text("remediation_md"),
    remediationUrl: text("remediation_url"),
    status: findingStatusEnum("status").notNull().default("open"),
    firstSeenAt: timestamp("first_seen_at", { mode: "date" })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { mode: "date" })
      .defaultNow()
      .notNull(),
    acknowledgedByUserId: text("acknowledged_by_user_id").references(
      () => users.id,
    ),
    acknowledgedAt: timestamp("acknowledged_at", { mode: "date" }),
    resolvedAt: timestamp("resolved_at", { mode: "date" }),
  },
  (f) => [
    uniqueIndex("findings_tenant_rule_evidence_uidx").on(
      f.tenantId,
      f.ruleId,
      f.evidenceHash,
    ),
    index("findings_tenant_status_severity_idx").on(
      f.tenantId,
      f.status,
      f.severity,
    ),
  ],
);

// ─── OAuth Apps ───────────────────────────────────────────────────────────────

export const oauthApps = pgTable("oauth_apps", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  provider: providerEnum("provider").notNull(),
  externalAppId: text("external_app_id").notNull(),
  appName: text("app_name"),
  publisher: text("publisher"),
  scopes: jsonb("scopes"),
  riskScore: integer("risk_score"),
  userCount: integer("user_count"),
  firstSeenAt: timestamp("first_seen_at", { mode: "date" })
    .defaultNow()
    .notNull(),
  lastSeenAt: timestamp("last_seen_at", { mode: "date" })
    .defaultNow()
    .notNull(),
});

// ─── Exposed Files ────────────────────────────────────────────────────────────

export const exposedFiles = pgTable(
  "exposed_files",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    scanId: text("scan_id").references(() => scans.id, { onDelete: "set null" }),
    externalFileId: text("external_file_id").notNull(),
    name: text("name"),
    webLink: text("web_link"),
    exposureType: exposureTypeEnum("exposure_type").notNull(),
    externalRecipients: text("external_recipients").array(),
    ownerEmail: text("owner_email"),
    modifiedAt: timestamp("modified_at", { mode: "date" }),
  },
  (ef) => [
    index("exposed_files_tenant_exposure_idx").on(ef.tenantId, ef.exposureType),
  ],
);

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable("notifications", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  channel: notificationChannelEnum("channel").notNull(),
  config: jsonb("config").notNull().default({}),
  enabled: boolean("enabled").notNull().default(true),
});

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditLog = pgTable("audit_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => createId()),
  workspaceId: text("workspace_id").references(() => workspaces.id, {
    onDelete: "set null",
  }),
  actorUserId: text("actor_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  metadata: jsonb("metadata"),
  occurredAt: timestamp("occurred_at", { mode: "date" }).defaultNow().notNull(),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerUserId], references: [users.id] }),
  members: many(workspaceMembers),
  tenants: many(tenants),
  notifications: many(notifications),
}));

export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [tenants.workspaceId],
    references: [workspaces.id],
  }),
  scans: many(scans),
  findings: many(findings),
  oauthApps: many(oauthApps),
  exposedFiles: many(exposedFiles),
}));

export const scansRelations = relations(scans, ({ one }) => ({
  tenant: one(tenants, { fields: [scans.tenantId], references: [tenants.id] }),
  score: one(scores, { fields: [scans.id], references: [scores.scanId] }),
}));
