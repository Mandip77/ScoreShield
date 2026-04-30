"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function DisconnectTenantButton({ tenantId }: { tenantId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDisconnect() {
    if (!confirm("Disconnect this tenant? Stored credentials will be deleted immediately.")) return;
    setLoading(true);
    await fetch(`/api/tenants/${tenantId}`, { method: "DELETE" });
    router.push("/dashboard");
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDisconnect} disabled={loading}>
      {loading ? "Disconnecting…" : "Disconnect tenant"}
    </Button>
  );
}
