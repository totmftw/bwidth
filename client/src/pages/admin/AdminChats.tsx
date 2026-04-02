import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Search,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminConversation {
  id: number;
  subject: string;
  type: string;
  lastMessageAt: string;
  participantNames: string;
  participants: any[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { label: "All", value: "" },
  { label: "Negotiation", value: "negotiation" },
  { label: "General", value: "general" },
  { label: "Support", value: "support" },
];

function TypeBadge({ type }: { type: string }) {
  switch (type) {
    case "negotiation":
      return (
        <Badge className="bg-purple-500/15 text-purple-400 border border-purple-500/25">
          Negotiation
        </Badge>
      );
    case "general":
      return (
        <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/25">
          General
        </Badge>
      );
    case "support":
      return (
        <Badge className="bg-orange-500/15 text-orange-400 border border-orange-500/25">
          Support
        </Badge>
      );
    default:
      return (
        <Badge className="bg-muted/50 text-muted-foreground border border-white/10">
          {type}
        </Badge>
      );
  }
}

function formatRelative(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminChats() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const { data: conversations, isLoading, isError } = useQuery<AdminConversation[]>({
    queryKey: ["/api/admin/conversations"],
    queryFn: async () => {
      const res = await fetch("/api/admin/conversations", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return res.json();
    },
  });

  const filtered = (conversations ?? []).filter((c) => {
    const matchesType = !typeFilter || c.type === typeFilter;
    if (!matchesType) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.subject ?? "").toLowerCase().includes(q) ||
      (c.participantNames ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold">Negotiations & Chats</h1>
            {conversations && (
              <Badge className="bg-primary/15 text-primary border-primary/25">
                {conversations.length}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${conversations?.length ?? 0} total conversations`}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by subject or participants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/40 border-white/10 focus:border-primary/40"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TYPE_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={typeFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter(f.value)}
              className={
                typeFilter === f.value
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20"
              }
            >
              {f.label}
            </Button>
          ))}
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
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </CardContent>
          ) : isError ? (
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-muted-foreground">
                Failed to load conversations. Try refreshing.
              </p>
            </CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                {search || typeFilter
                  ? "No conversations match your filters."
                  : "No conversations found."}
              </p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    {["Subject", "Type", "Participants", "Last Activity", "Actions"].map(
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
                  {filtered.map((conv, idx) => (
                    <motion.tr
                      key={conv.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.025 }}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-foreground">
                          {conv.subject || `Conversation #${conv.id}`}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <TypeBadge type={conv.type} />
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-xs max-w-[200px] truncate">
                        {conv.participantNames || "—"}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {formatRelative(conv.lastMessageAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/admin/chats/${conv.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-primary hover:text-primary hover:bg-primary/10"
                          >
                            View
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
