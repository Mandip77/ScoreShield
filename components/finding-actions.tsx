"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

interface FindingActionsProps {
  findingId: string;
  currentStatus: string;
}

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
  suppressed: "Suppressed",
};

export function FindingActions({ findingId, currentStatus }: FindingActionsProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function setStatus(status: string) {
    setLoading(true);
    await fetch(`/api/findings/${findingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setLoading(false);
    router.refresh();
  }

  const actions = (["open", "acknowledged", "resolved", "suppressed"] as const).filter(
    (s) => s !== currentStatus,
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={loading} className="h-7 gap-1 text-xs">
          {STATUS_LABELS[currentStatus]}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem key={action} onClick={() => setStatus(action)}>
            Mark as {STATUS_LABELS[action]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
