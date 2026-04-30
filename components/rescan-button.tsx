"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function RescanButton({
  tenantId,
  isScanning,
}: {
  tenantId: string;
  isScanning: boolean;
}) {
  const [loading, setLoading] = useState(isScanning);

  async function handleRescan() {
    setLoading(true);
    await fetch("/api/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    // Reload after a short delay to show updated status
    setTimeout(() => window.location.reload(), 2000);
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleRescan}
      disabled={loading}
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Scanning…" : "Rescan"}
    </Button>
  );
}
