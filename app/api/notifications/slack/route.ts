import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { notifications, workspaceMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({
  workspaceId: z.string(),
  webhookUrl: z.string().url(),
  notificationId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { workspaceId, webhookUrl, notificationId } = body.data;

  const member = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.workspaceId, workspaceId),
      eq(workspaceMembers.userId, session.user!.id!),
    ),
  });
  if (!member || member.role === "viewer") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (notificationId) {
    await db
      .update(notifications)
      .set({ config: { webhookUrl }, enabled: true })
      .where(eq(notifications.id, notificationId));
  } else {
    await db.insert(notifications).values({
      workspaceId,
      channel: "slack",
      config: { webhookUrl },
      enabled: true,
    });
  }

  return NextResponse.json({ ok: true });
}
