import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export type ExposureType = "public" | "anyone_with_link" | "external_user" | "external_domain";

export interface ExposedFile {
  fileId: string;
  name: string;
  webLink: string;
  ownerEmail: string;
  exposureType: ExposureType;
  externalRecipients: string[];
  modifiedAt: Date | null;
}

export async function listExposedFiles(
  auth: OAuth2Client,
  verifiedDomains: string[],
  maxFiles = 5000,
): Promise<ExposedFile[]> {
  const drive = google.drive({ version: "v3", auth });
  const exposed: ExposedFile[] = [];
  let pageToken: string | undefined;
  let scanned = 0;

  do {
    const res = await drive.files.list({
      corpora: "allDrives",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: 1000,
      pageToken,
      q: "trashed = false",
      fields:
        "files(id,name,mimeType,owners(emailAddress),permissions(type,role,emailAddress,domain,allowFileDiscovery),shared,webViewLink,modifiedTime),nextPageToken",
    });

    for (const file of res.data.files ?? []) {
      scanned++;
      const perms = file.permissions ?? [];
      const ownerEmail = file.owners?.[0]?.emailAddress ?? "";
      const externalRecipients: string[] = [];
      let exposureType: ExposureType | null = null;

      for (const perm of perms) {
        if (perm.type === "anyone") {
          exposureType =
            perm.allowFileDiscovery === true ? "public" : "anyone_with_link";
          break;
        }
        if (perm.type === "domain" && perm.domain) {
          const isInternal = verifiedDomains.includes(perm.domain);
          if (!isInternal) {
            exposureType = "external_domain";
            externalRecipients.push(perm.domain);
          }
          continue;
        }
        if ((perm.type === "user" || perm.type === "group") && perm.emailAddress) {
          const domain = perm.emailAddress.split("@")[1];
          if (domain && !verifiedDomains.includes(domain)) {
            if (!externalRecipients.includes(perm.emailAddress)) {
              externalRecipients.push(perm.emailAddress);
            }
            if (!exposureType) exposureType = "external_user";
          }
        }
      }

      if (exposureType) {
        exposed.push({
          fileId: file.id ?? "",
          name: file.name ?? "",
          webLink: file.webViewLink ?? "",
          ownerEmail,
          exposureType,
          externalRecipients,
          modifiedAt: file.modifiedTime ? new Date(file.modifiedTime) : null,
        });
      }
    }

    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken && scanned < maxFiles);

  return exposed;
}
