import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  MapPin,
  Search,
  ChevronRight,
  AlertCircle,
  Star,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdminVenue {
  id: number;
  userId: number;
  name: string;
  description: string;
  address: { street?: string; city?: string; state?: string };
  capacity: number;
  cityId: number;
  ratingAvg: string;
  metadata: { trustScore?: number };
  user: {
    id: number;
    username: string;
    displayName: string;
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

function formatCapacity(capacity: number) {
  if (!capacity) return "—";
  return capacity >= 1000
    ? `${(capacity / 1000).toFixed(1)}k`
    : capacity.toLocaleString("en-IN");
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AdminVenues() {
  const [search, setSearch] = useState("");

  const { data: venues, isLoading, isError } = useQuery<AdminVenue[]>({
    queryKey: ["/api/admin/venues"],
    queryFn: async () => {
      const res = await fetch("/api/admin/venues", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch venues");
      return res.json();
    },
  });

  const filtered = (venues ?? []).filter((v) => {
    const q = search.toLowerCase();
    return (
      !q ||
      v.name.toLowerCase().includes(q) ||
      (v.address.city ?? "").toLowerCase().includes(q) ||
      (v.address.state ?? "").toLowerCase().includes(q)
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
        <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <MapPin className="w-5 h-5 text-orange-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold">Venues</h1>
            {venues && (
              <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/25">
                {venues.length}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${venues?.length ?? 0} registered venues`}
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
            placeholder="Search by name or city…"
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
              <p className="text-muted-foreground">Failed to load venues. Try refreshing.</p>
            </CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <MapPin className="w-8 h-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                {search ? "No venues match your search." : "No venues registered yet."}
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
                      City
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">
                      Capacity
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">
                      Rating
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
                  {filtered.map((venue, idx) => (
                    <motion.tr
                      key={venue.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-foreground">{venue.name}</p>
                        {venue.address.street && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {venue.address.street}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {[venue.address.city, venue.address.state]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-foreground font-medium">
                            {formatCapacity(venue.capacity)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        {Number(venue.ratingAvg) > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="text-foreground font-medium">
                              {Number(venue.ratingAvg).toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">No reviews</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={venue.user.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/admin/venues/${venue.id}`}>
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
