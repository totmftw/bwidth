import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Activity,
  Search,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: number;
  who: number;
  action: string;
  entityType: string;
  entityId: number;
  context: any;
  createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function ActionBadge({ action }: { action: string }) {
  const isCreate = action.includes("creat") || action.includes("add");
  const isDelete = action.includes("delet") || action.includes("remov");
  const isUpdate = action.includes("updat") || action.includes("edit") || action.includes("change");
  const isAuth = action.includes("login") || action.includes("logout") || action.includes("auth");

  if (isCreate)
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 font-mono text-[10px]">
        {action}
      </Badge>
    );
  if (isDelete)
    return (
      <Badge className="bg-red-500/15 text-red-400 border border-red-500/25 font-mono text-[10px]">
        {action}
      </Badge>
    );
  if (isUpdate)
    return (
      <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/25 font-mono text-[10px]">
        {action}
      </Badge>
    );
  if (isAuth)
    return (
      <Badge className="bg-purple-500/15 text-purple-400 border border-purple-500/25 font-mono text-[10px]">
        {action}
      </Badge>
    );
  return (
    <Badge className="bg-muted/50 text-muted-foreground border border-white/10 font-mono text-[10px]">
      {action}
    </Badge>
  );
}

// ─── Context Dialog ───────────────────────────────────────────────────────────

function ContextDialog({ log, open, onClose }: { log: AuditLog; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-white/10 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Audit Log #{log.id}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Timestamp</p>
              <p className="font-medium mt-0.5">{formatDate(log.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Actor</p>
              <p className="font-mono font-medium mt-0.5">User #{log.who}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Action</p>
              <p className="font-mono mt-0.5">{log.action}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Entity</p>
              <p className="font-medium mt-0.5">
                {log.entityType} #{log.entityId}
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Context</p>
            <pre className="text-xs font-mono bg-black/30 rounded-lg p-3 overflow-auto max-h-64 text-muted-foreground whitespace-pre-wrap">
              {log.context
                ? JSON.stringify(log.context, null, 2)
                : "No context available"}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminAuditLog() {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const { data: logs, isLoading, isError } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit", offset],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/audit?limit=${PAGE_SIZE}&offset=${offset}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch audit log");
      return res.json();
    },
  });

  const filtered = (logs ?? []).filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return log.action.toLowerCase().includes(q);
  });

  const hasPrev = offset > 0;
  const hasNext = (logs?.length ?? 0) === PAGE_SIZE;

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
          <Activity className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading…"
              : `Showing ${offset + 1}–${offset + (logs?.length ?? 0)} entries`}
          </p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-3"
      >
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Filter by action…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/40 border-white/10 focus:border-primary/40"
          />
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl overflow-hidden">
          {isLoading ? (
            <CardContent className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </CardContent>
          ) : isError ? (
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-muted-foreground">Failed to load audit log.</p>
            </CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <Activity className="w-8 h-8 text-muted-foreground" />
              <p className="text-muted-foreground">No audit entries found.</p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    {["Timestamp", "Actor", "Action", "Entity Type", "Entity ID", "Actions"].map(
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
                  {filtered.map((log, idx) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.015 }}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{log.who}
                      </td>
                      <td className="px-4 py-3">
                        <ActionBadge action={log.action} />
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                        {log.entityType?.replace(/_/g, " ") ?? "—"}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {log.entityId ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedLog(log)}
                          className="gap-1 text-primary hover:text-primary hover:bg-primary/10"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Details
                        </Button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Pagination */}
      {!isLoading && !isError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="flex items-center justify-between"
        >
          <p className="text-sm text-muted-foreground">
            Page {Math.floor(offset / PAGE_SIZE) + 1}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              disabled={!hasPrev}
              className="border-white/10 gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOffset(offset + PAGE_SIZE)}
              disabled={!hasNext}
              className="border-white/10 gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}

      {/* Context Dialog */}
      {selectedLog && (
        <ContextDialog
          log={selectedLog}
          open={!!selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
