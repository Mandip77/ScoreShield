import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PdfReportData {
  tenantName: string;
  provider: "google" | "microsoft";
  generatedAt: Date;
  score: number;
  grade: string;
  categories: {
    identity: number;
    dataExposure: number;
    oauthRisk: number;
    detection: number;
    configHygiene: number;
  };
  findings: {
    id: string;
    title: string;
    severity: string;
    category: string;
    description: string;
    pointsLost: number;
    remediationMd: string;
    cisControl: string;
    nistFunction: string;
    status: string;
  }[];
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GRADE_COLOR: Record<string, string> = {
  A: "#22c55e",
  B: "#34d399",
  C: "#facc15",
  D: "#fb923c",
  F: "#ef4444",
};

const SEVERITY_COLOR: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#6b7280",
};

const CATEGORY_LABEL: Record<string, string> = {
  identity: "Identity & Access",
  data_exposure: "Data Exposure",
  oauth_risk: "OAuth / Third-party Risk",
  detection: "Detection & Logging",
  config_hygiene: "Configuration Hygiene",
};

const CATEGORY_MAX: Record<string, number> = {
  identity: 25,
  data_exposure: 25,
  oauth_risk: 20,
  detection: 15,
  config_hygiene: 15,
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#0f172a",
    color: "#f1f5f9",
    fontFamily: "Helvetica",
    padding: 40,
    fontSize: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
    paddingBottom: 20,
    borderBottom: "1px solid #1e293b",
  },
  headerLeft: {},
  logo: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#818cf8", marginBottom: 4 },
  reportTitle: { fontSize: 12, color: "#94a3b8" },
  tenantName: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#f1f5f9", marginTop: 4 },
  headerRight: { alignItems: "flex-end" },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    border: "3px solid #818cf8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  scoreNumber: { fontSize: 28, fontFamily: "Helvetica-Bold", color: "#f1f5f9" },
  gradeText: { fontSize: 11, color: "#94a3b8" },
  generatedAt: { fontSize: 8, color: "#475569", marginTop: 4 },

  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#818cf8",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryLabel: { width: 160, color: "#94a3b8", fontSize: 10 },
  categoryBar: { flex: 1, height: 6, backgroundColor: "#1e293b", borderRadius: 3, marginHorizontal: 8 },
  categoryFill: { height: 6, backgroundColor: "#818cf8", borderRadius: 3 },
  categoryScore: { width: 40, textAlign: "right", color: "#f1f5f9" },

  findingCard: {
    backgroundColor: "#1e293b",
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  findingHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    marginRight: 8,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#ffffff",
  },
  findingTitle: { flex: 1, fontFamily: "Helvetica-Bold", fontSize: 10, color: "#f1f5f9" },
  pointsLost: { color: "#ef4444", fontSize: 10, fontFamily: "Helvetica-Bold" },
  findingDesc: { color: "#94a3b8", fontSize: 9, marginBottom: 4 },
  findingMeta: { flexDirection: "row", gap: 12 },
  metaChip: { color: "#475569", fontSize: 8 },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#334155",
    fontSize: 8,
    borderTop: "1px solid #1e293b",
    paddingTop: 8,
  },
});

// ─── Components ───────────────────────────────────────────────────────────────

function CategoryBreakdown({ categories }: { categories: PdfReportData["categories"] }) {
  const rows = [
    { key: "identity", value: categories.identity },
    { key: "dataExposure", value: categories.dataExposure },
    { key: "oauthRisk", value: categories.oauthRisk },
    { key: "detection", value: categories.detection },
    { key: "configHygiene", value: categories.configHygiene },
  ];

  const keyMap: Record<string, string> = {
    identity: "identity",
    dataExposure: "data_exposure",
    oauthRisk: "oauth_risk",
    detection: "detection",
    configHygiene: "config_hygiene",
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Category Breakdown</Text>
      {rows.map(({ key, value }) => {
        const dbKey = keyMap[key];
        const max = CATEGORY_MAX[dbKey] ?? 1;
        const pct = Math.min(value / max, 1);
        return (
          <View key={key} style={styles.categoryRow}>
            <Text style={styles.categoryLabel}>{CATEGORY_LABEL[dbKey] ?? key}</Text>
            <View style={styles.categoryBar}>
              <View style={[styles.categoryFill, { width: `${pct * 100}%` as any }]} />
            </View>
            <Text style={styles.categoryScore}>
              {value}/{max}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function FindingsList({ findings }: { findings: PdfReportData["findings"] }) {
  const open = findings.filter((f) => f.status === "open" || f.status === "acknowledged");
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Open Findings ({open.length})</Text>
      {open.map((f) => (
        <View key={f.id} style={styles.findingCard}>
          <View style={styles.findingHeader}>
            <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLOR[f.severity] ?? "#6b7280" }]}>
              <Text>{f.severity.toUpperCase()}</Text>
            </View>
            <Text style={styles.findingTitle}>{f.title}</Text>
            <Text style={styles.pointsLost}>-{f.pointsLost} pts</Text>
          </View>
          <Text style={styles.findingDesc}>{f.description}</Text>
          <View style={styles.findingMeta}>
            <Text style={styles.metaChip}>{CATEGORY_LABEL[f.category] ?? f.category}</Text>
            <Text style={styles.metaChip}>{f.cisControl}</Text>
            <Text style={styles.metaChip}>NIST {f.nistFunction}</Text>
          </View>
        </View>
      ))}
      {open.length === 0 && (
        <Text style={{ color: "#22c55e", fontSize: 10 }}>
          No open findings — excellent security posture!
        </Text>
      )}
    </View>
  );
}

function ReportDocument({ data }: { data: PdfReportData }) {
  const gradeColor = GRADE_COLOR[data.grade] ?? "#6b7280";
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.logo}>ScoreShield</Text>
            <Text style={styles.reportTitle}>Security Score Report</Text>
            <Text style={styles.tenantName}>{data.tenantName}</Text>
            <Text style={{ color: "#475569", fontSize: 9, marginTop: 2 }}>
              {data.provider === "google" ? "Google Workspace" : "Microsoft 365"}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.scoreCircle, { borderColor: gradeColor }]}>
              <Text style={[styles.scoreNumber, { color: gradeColor }]}>{data.score}</Text>
            </View>
            <Text style={[styles.gradeText, { color: gradeColor }]}>Grade {data.grade}</Text>
            <Text style={styles.generatedAt}>
              Generated {data.generatedAt.toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Category breakdown */}
        <CategoryBreakdown categories={data.categories} />

        {/* Findings */}
        <FindingsList findings={data.findings} />

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>ScoreShield — Confidential</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generatePdfReport(data: PdfReportData): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} />);
}
