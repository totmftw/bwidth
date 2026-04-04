import { Badge } from "@/components/ui/badge";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-blue-100 text-blue-800 border-blue-200" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800 border-green-200" },
  failed: { label: "Failed", className: "bg-red-100 text-red-800 border-red-200" },
  cancelled: { label: "Cancelled", className: "bg-gray-100 text-gray-600 border-gray-200" },
  paused: { label: "Paused", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  inactive: { label: "Inactive", className: "bg-gray-100 text-gray-500 border-gray-200" },
};

export function AgentStatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status] ?? STATUS_MAP.inactive;
  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  );
}
