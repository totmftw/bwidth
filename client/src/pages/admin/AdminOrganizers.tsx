import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Building2,
  Search,
  ChevronRight,
  AlertCircle,
  Globe,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdminOrganizer {
  id: number;
  userId: number;
  name: string;
  description: string;
  contactPerson: {
    name?: string;
    email?: string;
    phone?: string;
  };
  metadata: {
    trustScore?: number;
    website?: string;
  };
  user: {
    id: number;
    username: string;
    displayName: string;
    email: string;
    status: string;
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
          Active
        </Badge>
      );
    case "suspended":
      return (
        <Badge className="bg-red-500/15 text-red-400 border border-red-500/25">
          Suspended
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
          Pending
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function TrustScore({ score }: { score?: number }) {
  if (score == null) return <span className="text-muted-foreground text-xs">—</span>;
  const color =
    score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : "text-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <ShieldCheck className={`w-3.5 h-3.5 ${color}`} />
      <span className={`font-medium text-sm ${color}`}>{score}</span>
      <span className="text-muted-foreground text-xs">/ 100</span>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AdminOrganizers() {
  const [search, setSearch] = useState("");

  const { data: organizers, isLoading, isError } = useQuery<AdminOrganizer[]>({
    queryKey: ["/api/admin/organizers"],
    queryFn: async () => {
      const res = await fetch("/api/admin/organizers", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch organizers");
      return res.json();
    },
  });

  const filtered = (organizers ?? []).filter((o) => {
    const q = search.toLowerCase();
    return (
      !q ||
      o.name.toLowerCase().includes(q) ||
      o.user.email.toLowerCase().includes(q) ||
      (o.contactPerson.name ?? "").toLowerCase().includes(q)
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
        <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <Building2 className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold">Organizers</h1>
            {organizers && (
              <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/25">
                {organizers.length}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${organizers?.length ?? 0} registered organizers`}
          </p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, email, contact…"
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
        <Card className="glass-card overflow-hidden border-white/5">
          {isLoading ? (
            <CardContent className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </CardContent>
          ) : isError ? (
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-muted-foreground">Failed to load organizers. Try refreshing.</p>
            </CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <Building2 className="w-8 h-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                {search ? "No organizers match your search." : "No organizers registered yet."}
              </p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">
                      Name
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">
                      Contact
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">
                      Website
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">
                      Trust Score
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">
                      Status
                    </th>
                    <th className="text-right px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((org, idx) => (
                    <motion.tr
                      key={org.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-medium text-foreground">{org.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {org.user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {org.contactPerson.name ? (
                          <div>
                            <p className="text-foreground">{org.contactPerson.name}</p>
                            {org.contactPerson.phone && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {org.contactPerson.phone}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {org.metadata.website ? (
                          <a
                            href={org.metadata.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline underline-offset-2 text-xs"
                          >
                            <Globe className="w-3 h-3" />
                            {org.metadata.website.replace(/^https?:\/\//, "").split("/")[0]}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <TrustScore score={org.metadata.trustScore} />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={org.user.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/admin/organizers/${org.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-primary hover:text-primary hover:bg-primary/10"
                          >
                            Edit
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
