import type { Client } from "@microsoft/microsoft-graph-client";
import type { MsExposedItem } from "@/lib/scoring/types";

interface GraphPermission {
  link?: { scope?: string; type?: string };
  grantedToIdentitiesV2?: Array<{ user?: { id: string; displayName: string }; siteUser?: { loginName: string } }>;
  grantedToV2?: { user?: { id: string; displayName: string } };
}

interface GraphDriveItem {
  id: string;
  name: string;
  webUrl: string;
  permissions?: GraphPermission[];
}

interface GraphDrive {
  id: string;
  name: string;
  driveType: string;
}

/** Sample the top ITEMS_PER_DRIVE items from each drive's root, check permissions */
const DRIVES_TO_SCAN = 10;
const ITEMS_PER_DRIVE = 200;

export async function listExposedItems(
  client: Client,
  internalDomain: string,
): Promise<MsExposedItem[]> {
  const exposed: MsExposedItem[] = [];

  // List SharePoint sites (first page)
  let drives: GraphDrive[] = [];
  try {
    const sitesRes = await client
      .api(`/sites?search=*&$select=id,displayName&$top=20`)
      .get();

    for (const site of (sitesRes.value ?? []).slice(0, DRIVES_TO_SCAN)) {
      const drivesRes = await client
        .api(`/sites/${site.id}/drives?$select=id,name,driveType`)
        .get();
      drives.push(...(drivesRes.value ?? []));
    }
  } catch {
    // Fallback: list the root drives directly
    const drivesRes = await client.api("/drives?$top=20").get();
    drives = drivesRes.value ?? [];
  }

  for (const drive of drives.slice(0, DRIVES_TO_SCAN)) {
    try {
      const itemsRes = await client
        .api(`/drives/${drive.id}/root/children?$select=id,name,webUrl&$top=${ITEMS_PER_DRIVE}&$expand=permissions`)
        .get();

      for (const item of (itemsRes.value ?? []) as GraphDriveItem[]) {
        const perms = item.permissions ?? [];
        const externalRecipients: string[] = [];
        let exposureType: MsExposedItem["exposureType"] | null = null;

        for (const perm of perms) {
          if (perm.link) {
            if (perm.link.scope === "anonymous") {
              exposureType = perm.link.type === "view" ? "anyone_with_link" : "public";
              break;
            }
            if (perm.link.scope === "organization") continue;
          }
          // External user grants
          const identities = perm.grantedToIdentitiesV2 ?? [];
          for (const identity of identities) {
            const email = identity.siteUser?.loginName ?? "";
            if (email.includes("#ext#") || (email.includes("@") && !email.includes(internalDomain))) {
              externalRecipients.push(email);
              if (!exposureType) exposureType = "external_user";
            }
          }
        }

        if (exposureType) {
          exposed.push({
            itemId: item.id,
            name: item.name ?? "",
            webUrl: item.webUrl ?? "",
            exposureType,
            externalRecipients,
          });
        }
      }
    } catch {
      continue;
    }
  }

  return exposed;
}
