import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  ClipboardList,
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

interface AdminBooking {
  id: number;
  status: string;
  artistFee: string;
  grossBookingValue: string;
  createdAt: string;
  event?: { title: string; startTime: string };
  artist?: { name: string };
  organizer?: { name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Negotiating", value: "negotiating" },
  { label: "Contracting", value: "contracting" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Completed", value: "completed" },
  { label: "Disputed", value: "disputed" },
  { label: "Cancelled", value: "cancelled" },
];

function BookingStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    inquiry: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
    offered: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
    negotiating: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
    contracting: "bg-blue-500/15 text-blue-400 border-blue-500/25",
    confirmed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    paid_deposit: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    scheduled: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    completed: "bg-teal-500/15 text-teal-400 border-teal-500/25",
    cancelled: "bg-red-500/15 text-red-400 border-red-500/25",
    refunded: "bg-red-500/15 text-red-400 border-red-500/25",
    disputed: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  };
  return (
    <Badge
      className={`border ${cfg[status] ?? "bg-muted/50 text-muted-foreground border-white/10"}`}
    >
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function formatCurrency(val: string) {
  const n = Number(val);
  if (!n) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminBookings() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data: bookings, isLoading, isError } = useQuery<AdminBooking[]>({
    queryKey: ["/api/admin/bookings", statusFilter],
    queryFn: async () => {
      const url = statusFilter
        ? `/api/admin/bookings?status=${statusFilter}`
        : "/api/admin/bookings";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch bookings");
      return res.json();
    },
  });

  const filtered = (bookings ?? []).filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (b.event?.title ?? "").toLowerCase().includes(q) ||
      (b.artist?.name ?? "").toLowerCase().includes(q)
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
          <ClipboardList className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold">Bookings</h1>
            {bookings && (
              <Badge className="bg-primary/15 text-primary border-primary/25">
                {bookings.length}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${bookings?.length ?? 0} total bookings`}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col gap-3"
      >
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by event title or artist…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/40 border-white/10 focus:border-primary/40"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={statusFilter === f.value ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(f.value)}
              className={
                statusFilter === f.value
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
              <p className="text-muted-foreground">Failed to load bookings. Try refreshing.</p>
            </CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <ClipboardList className="w-8 h-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                {search || statusFilter ? "No bookings match your filters." : "No bookings found."}
              </p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    {["ID", "Event", "Artist", "Organizer", "Status", "Fee", "Created", "Actions"].map(
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
                  {filtered.map((booking, idx) => (
                    <motion.tr
                      key={booking.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.025 }}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                        #{booking.id}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-foreground">
                          {booking.event?.title ?? "—"}
                        </p>
                        {booking.event?.startTime && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(booking.event.startTime)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {booking.artist?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {booking.organizer?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <BookingStatusBadge status={booking.status} />
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">
                        {formatCurrency(booking.artistFee)}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {formatDate(booking.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/admin/bookings/${booking.id}`}>
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
