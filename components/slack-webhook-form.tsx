"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface SlackWebhookFormProps {
  workspaceId: string;
  currentWebhookUrl: string;
  notificationId?: string;
}

export function SlackWebhookForm({
  workspaceId,
  currentWebhookUrl,
  notificationId,
}: SlackWebhookFormProps) {
  const [url, setUrl] = useState(currentWebhookUrl);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/notifications/slack", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, webhookUrl: url, notificationId }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="slack-webhook">Slack Incoming Webhook URL</Label>
        <input
          id="slack-webhook"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://hooks.slack.com/services/..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground">
          Create an Incoming Webhook in your Slack workspace and paste the URL here.
        </p>
      </div>
      <Button size="sm" onClick={handleSave} disabled={saving || !url}>
        {saving ? "Saving…" : saved ? "Saved ✓" : "Save webhook"}
      </Button>
    </div>
  );
}
