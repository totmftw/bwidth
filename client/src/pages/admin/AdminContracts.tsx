import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  FileText,
  AlertCircle,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminContract {
  id: number;
  status: string;
  bookingId: number;
  version: number;
  initiatedAt: string;
  finalizedAt: string;
  adminReviewNote: string;
  booking?: { id: number };
  artistName?: string;
  organizerName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONTRACT_STATUSES = [
  "draft",
  "sent",
  "signed_by_promoter",
  "signed_by_artist",
  "admin_review",
  "signed",
  "voided",
  "completed",
];

function ContractStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    draft: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
    sent: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    signed_by_promoter: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    signed_by_artist: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    admin_review: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    signed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    voided: "bg-red-500/15 text-red-400 border-red-500/25",
    completed: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  };
  return (
    <Badge
      className={`border ${cfg[status] ?? "bg-muted/50 text-muted-foreground border-white/10"}`}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Table ────────────────────────────────────────────────────────────────────

function ContractsTable({
  contracts,
  isLoading,
  isError,
  emptyMessage,
}: {
  contracts: AdminContract[] | undefined;
  isLoading: boolean;
  isError: boolean;
  emptyMessage: string;
}) {
  if (isLoading) {
    return (
      <CardContent className="p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </CardContent>
    );
  }

  if (isError) {
    return (
      <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="text-muted-foreground">Failed to load contracts.</p>
      </CardContent>
    );
  }

  if (!contracts || contracts.length === 0) {
    return (
      <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
        <FileText className="w-8 h-8 text-muted-foreground" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </CardContent>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02]">
            {["ID", "Booking", "Artist", "Organizer", "Status", "Submitted", "Actions"].map(
              (h) => (
                <th
                  key={h}
                  className={`px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase ${h === "Actions" ? "text-right" : "text-left"}`}
                >
                  {h}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {contracts.map((contract, idx) => (
            <motion.tr
              key={contract.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.025 }}
              className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
            >
              <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                #{contract.id}
              </td>
              <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                #{contract.bookingId}
              </td>
              <td className="px-4 py-3.5 text-muted-foreground">
                {contract.artistName ?? "—"}
              </td>
              <td className="px-4 py-3.5 text-muted-foreground">
                {contract.organizerName ?? "—"}
              </td>
              <td className="px-4 py-3.5">
                <ContractStatusBadge status={contract.status} />
              </td>
              <td className="px-4 py-3.5 text-muted-foreground">
                {formatDate(contract.initiatedAt)}
              </td>
              <td className="px-4 py-3.5 text-right">
                <Link href={`/admin/contracts/${contract.id}`}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-primary hover:text-primary hover:bg-primary/10"
                  >
                    Review
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type TabKey = "pending" | "all";

export default function AdminContracts() {
  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [statusFilter, setStatusFilter] = useState("");

  const pendingQuery = useQuery<AdminContract[]>({
    queryKey: ["/api/admin/contracts/pending"],
    queryFn: async () => {
      const res = await fetch("/api/admin/contracts/pending", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: activeTab === "pending",
  });

  const allQuery = useQuery<AdminContract[]>({
    queryKey: ["/api/admin/contracts", statusFilter],
    queryFn: async () => {
      const url = statusFilter
        ? `/api/admin/contracts?status=${statusFilter}`
        : "/api/admin/contracts";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: activeTab === "all",
  });

  const tabs: { key: TabKey; label: string; icon?: React.ReactNode }[] = [
    {
      key: "pending",
      label: "Pending Review",
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    { key: "all", label: "All Contracts" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
          <FileText className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Contracts</h1>
          <p className="text-sm text-muted-foreground">
            Manage and review platform contracts
          </p>
        </div>
        {pendingQuery.data && pendingQuery.data.length > 0 && (
          <Badge className="bg-orange-500/15 text-orange-400 border border-orange-500/25 ml-auto">
            {pendingQuery.data.length} pending
          </Badge>
        )}
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-2 flex-wrap"
      >
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            className={
              activeTab === tab.key
                ? "bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                : "border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 gap-1.5"
            }
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}

        {activeTab === "all" && (
          <div className="ml-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-card/40 border-white/10 w-44 h-8 text-sm">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-card border-white/10">
                <SelectItem value="">All statuses</SelectItem>
                {CONTRACT_STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl overflow-hidden">
          {activeTab === "pending" ? (
            <ContractsTable
              contracts={pendingQuery.data}
              isLoading={pendingQuery.isLoading}
              isError={pendingQuery.isError}
              emptyMessage="No contracts pending review."
            />
          ) : (
            <ContractsTable
              contracts={allQuery.data}
              isLoading={allQuery.isLoading}
              isError={allQuery.isError}
              emptyMessage="No contracts found."
            />
          )}
        </Card>
      </motion.div>
    </div>
  );
}
