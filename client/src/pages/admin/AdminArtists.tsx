import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Music2,
  Search,
  Star,
  ChevronRight,
  Users,
  AlertCircle,
  Info,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AdminArtist {
  id: number;
  userId: number;
  name: string;
  bio: string;
  priceFrom: string;
  priceTo: string;
  currency: string;
  ratingAvg: string;
  ratingCount: number;
  artistCategory: string;
  metadata: {
    primaryGenre?: string;
    trustScore?: number;
    profileComplete?: boolean;
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

const CATEGORY_FILTERS = [
  { label: "All", value: "" },
  { label: "Budding", value: "budding" },
  { label: "Mid Scale", value: "mid_scale" },
  { label: "International", value: "international" },
  { label: "Custom", value: "custom" },
];

function CategoryBadge({ category }: { category: string }) {
  switch (category) {
    case "budding":
      return (
        <Badge className="bg-green-500/15 text-green-400 border border-green-500/25 hover:bg-green-500/20">
          Budding
        </Badge>
      );
    case "mid_scale":
      return (
        <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/25 hover:bg-blue-500/20">
          Mid Scale
        </Badge>
      );
    case "international":
      return (
        <Badge className="bg-purple-500/15 text-purple-400 border border-purple-500/25 hover:bg-purple-500/20">
          International
        </Badge>
      );
    default:
      return (
        <Badge className="bg-muted/50 text-muted-foreground border border-white/10">
          {category || "Custom"}
        </Badge>
      );
  }
}

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

function formatPriceRange(from: string, to: string, currency: string) {
  const symbol = currency === "USD" ? "$" : "₹";
  const fmt = (v: string) => {
    const n = Number(v);
    if (!n) return null;
    return n >= 1000 ? `${symbol}${(n / 1000).toFixed(0)}k` : `${symbol}${n.toLocaleString("en-IN")}`;
  };
  const f = fmt(from);
  const t = fmt(to);
  if (!f && !t) return "—";
  if (!t) return f ?? "—";
  if (!f) return t;
  return `${f} – ${t}`;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AdminArtists() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const { data: artists, isLoading, isError } = useQuery<AdminArtist[]>({
    queryKey: ["/api/admin/artists"],
    queryFn: async () => {
      const res = await fetch("/api/admin/artists", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch artists");
      return res.json();
    },
  });

  const filtered = (artists ?? []).filter((a) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      a.name.toLowerCase().includes(q) ||
      a.user.email.toLowerCase().includes(q) ||
      (a.metadata.primaryGenre ?? "").toLowerCase().includes(q);
    const matchesCategory = !categoryFilter || a.artistCategory === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Music2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold">Artists</h1>
              {artists && (
                <Badge className="bg-primary/15 text-primary border-primary/25">
                  {artists.length}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {isLoading ? "Loading…" : `${artists?.length ?? 0} registered artists`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-card/60 border border-white/5 rounded-lg px-3 py-2 self-start">
          <Info className="w-3.5 h-3.5 shrink-0 text-primary" />
          <span>Add artists via</span>
          <Link href="/admin/users">
            <span className="text-primary hover:underline underline-offset-2 cursor-pointer font-medium">
              User Management
            </span>
          </Link>
          <span>(select artist role)</span>
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
            placeholder="Search by name, genre, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/40 border-white/10 focus:border-primary/40"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORY_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={categoryFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryFilter(f.value)}
              className={
                categoryFilter === f.value
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
        <Card className="glass-card overflow-hidden border-white/5">
          {isLoading ? (
            <CardContent className="p-6 space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </CardContent>
          ) : isError ? (
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <p className="text-muted-foreground">Failed to load artists. Try refreshing.</p>
            </CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <Users className="w-8 h-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                {search || categoryFilter ? "No artists match your filters." : "No artists registered yet."}
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
                      Genre
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">
                      Category
                    </th>
                    <th className="text-left px-4 py-3 text-xs text-muted-foreground font-semibold tracking-wider uppercase">
                      Price Range
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
                  {filtered.map((artist, idx) => (
                    <motion.tr
                      key={artist.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-medium text-foreground">{artist.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {artist.user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {artist.metadata.primaryGenre ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <CategoryBadge category={artist.artistCategory} />
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">
                        {formatPriceRange(artist.priceFrom, artist.priceTo, artist.currency)}
                      </td>
                      <td className="px-4 py-3.5">
                        {artist.ratingCount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="text-foreground font-medium">
                              {Number(artist.ratingAvg).toFixed(1)}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              ({artist.ratingCount})
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">No reviews</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={artist.user.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/admin/artists/${artist.id}`}>
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
