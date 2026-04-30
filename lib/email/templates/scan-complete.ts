const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://scoreshield.app";

export function scanCompleteEmail({
  orgName,
  tenantId,
  score,
  grade,
  newFindings,
  resolvedFindings,
}: {
  orgName: string;
  tenantId: string;
  score: number;
  grade: string;
  newFindings: number;
  resolvedFindings: number;
}): { subject: string; html: string; text: string } {
  const gradeColors: Record<string, string> = {
    A: "#22c55e",
    B: "#84cc16",
    C: "#eab308",
    D: "#f97316",
    F: "#ef4444",
  };
  const color = gradeColors[grade] ?? "#6b7280";
  const dashboardUrl = `${APP_URL}/dashboard/${tenantId}`;

  const subject = `ScoreShield: ${orgName} scored ${score}/100 (Grade ${grade})`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:Arial,sans-serif;background:#0a0a0a;color:#ededed;margin:0;padding:0;">
  <div style="max-width:600px;margin:40px auto;background:#111827;border-radius:12px;overflow:hidden;border:1px solid #1f2937;">
    <div style="background:#1d4ed8;padding:24px 32px;">
      <h1 style="margin:0;font-size:20px;color:#fff;">🛡️ ScoreShield Security Report</h1>
      <p style="margin:4px 0 0;color:#bfdbfe;font-size:14px;">${orgName}</p>
    </div>
    <div style="padding:32px;text-align:center;">
      <div style="display:inline-block;background:#1f2937;border-radius:50%;width:120px;height:120px;line-height:120px;font-size:48px;font-weight:bold;color:${color};margin-bottom:8px;">
        ${score}
      </div>
      <p style="margin:0;font-size:24px;font-weight:bold;color:${color};">Grade ${grade}</p>
      <p style="color:#9ca3af;font-size:14px;margin-top:4px;">Security score out of 100</p>
    </div>
    <div style="padding:0 32px 32px;">
      ${newFindings > 0 ? `<p style="color:#fca5a5;font-size:14px;">⚠️ <strong>${newFindings}</strong> new finding${newFindings !== 1 ? "s" : ""} detected</p>` : ""}
      ${resolvedFindings > 0 ? `<p style="color:#86efac;font-size:14px;">✅ <strong>${resolvedFindings}</strong> finding${resolvedFindings !== 1 ? "s" : ""} resolved</p>` : ""}
      ${newFindings === 0 && resolvedFindings === 0 ? `<p style="color:#9ca3af;font-size:14px;">No changes since your last scan.</p>` : ""}
      <div style="margin-top:24px;text-align:center;">
        <a href="${dashboardUrl}" style="background:#1d4ed8;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">
          View full report →
        </a>
      </div>
    </div>
    <div style="background:#0f172a;padding:16px 32px;text-align:center;">
      <p style="color:#4b5563;font-size:12px;margin:0;">ScoreShield reads metadata only — never file contents. <a href="${APP_URL}/security" style="color:#6b7280;">Security policy</a></p>
    </div>
  </div>
</body>
</html>`;

  const text = `${orgName} Security Score: ${score}/100 (Grade ${grade})\n\n${newFindings > 0 ? `${newFindings} new finding(s) detected.\n` : ""}${resolvedFindings > 0 ? `${resolvedFindings} finding(s) resolved.\n` : ""}View full report: ${dashboardUrl}`;

  return { subject, html, text };
}
