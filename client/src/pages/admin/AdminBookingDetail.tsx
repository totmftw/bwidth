import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ClipboardList,
  AlertCircle,
  Loader2,
  FileText,
  MessageSquare,
  DollarSign,
  Calendar,
  User,
  Building2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BookingDetail {
  id: number;
  status: string;
  artistFee: string;
  grossBookingValue: string;
  platformRevenue: string;
  depositPercent: string;
  organizerFee: string;
  createdAt: string;
  updatedAt: string;
  event?: { title: string; startTime: string; endTime: string };
  artist?: { name: string };
  organizer?: { name: string };
  venue?: { name: string };
  meta?: any;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ALL_STATUSES = [
  "inquiry",
  "offered",
  "negotiating",
  "contracting",
  "confirmed",
  "paid_deposit",
  "scheduled",
  "completed",
  "cancelled",
  "refunded",
  "disputed",
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

function formatCurrency(val: string | undefined) {
  const n = Number(val ?? 0);
  if (!n) return "—";
  return `₹${n.toLocaleString("en-IN")}`;
}

function formatDate(iso: string | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminBookingDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [forceStatus, setForceStatus] = useState("");
  const [forceReason, setForceReason] = useState("");

  const { data: booking, isLoading, isError } = useQuery<BookingDetail>({
    queryKey: ["/api/admin/bookings", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/bookings/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch booking");
      return res.json();
    },
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: async () => {
      if (!forceReason.trim()) throw new Error("A reason is required");
      const res = await fetch(`/api/admin/bookings/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: forceStatus, reason: forceReason }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Status update failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Booking status updated" });
      setForceStatus("");
      setForceReason("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings", id] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: err.message ?? "Failed" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground">Failed to load booking.</p>
        <Link href="/admin/bookings">
          <Button variant="outline" className="border-white/10">
            Back to Bookings
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 flex-wrap"
      >
        <Link href="/admin/bookings">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-5 bg-white/10" />
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <ClipboardList className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold">Booking #{booking.id}</h1>
            <BookingStatusBadge status={booking.status} />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT column */}
        <div className="space-y-4">
          {/* Booking Info */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  Booking Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow label="Event" value={booking.event?.title ?? "—"} />
                <Separator className="bg-white/5" />
                <InfoRow label="Event Date" value={formatDate(booking.event?.startTime)} />
                <Separator className="bg-white/5" />
                <InfoRow
                  label="Artist"
                  value={
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      {booking.artist?.name ?? "—"}
                    </span>
                  }
                />
                <Separator className="bg-white/5" />
                <InfoRow
                  label="Organizer"
                  value={
                    <span className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                      {booking.organizer?.name ?? "—"}
                    </span>
                  }
                />
                {booking.venue && (
                  <>
                    <Separator className="bg-white/5" />
                    <InfoRow label="Venue" value={booking.venue.name} />
                  </>
                )}
                <Separator className="bg-white/5" />
                <InfoRow label="Created" value={formatDate(booking.createdAt)} />
              </CardContent>
            </Card>
          </motion.div>

          {/* Financial */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Financials
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow label="Artist Fee" value={formatCurrency(booking.artistFee)} />
                <Separator className="bg-white/5" />
                <InfoRow label="Gross Booking Value" value={formatCurrency(booking.grossBookingValue)} />
                <Separator className="bg-white/5" />
                <InfoRow label="Platform Revenue" value={formatCurrency(booking.platformRevenue)} />
                <Separator className="bg-white/5" />
                <InfoRow
                  label="Deposit %"
                  value={booking.depositPercent ? `${booking.depositPercent}%` : "—"}
                />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* RIGHT column */}
        <div className="space-y-4">
          {/* Status Management */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
            <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base">Status Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">
                    Current Status
                  </p>
                  <BookingStatusBadge status={booking.status} />
                </div>
                <Separator className="bg-white/5" />
                <div className="space-y-3">
                  <p className="text-sm font-medium">Force Status Change</p>
                  <div className="space-y-1.5">
                    <Label>New Status</Label>
                    <Select value={forceStatus} onValueChange={setForceStatus}>
                      <SelectTrigger className="bg-card/40 border-white/10">
                        <SelectValue placeholder="Select status…" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-white/10">
                        {ALL_STATUSES.filter((s) => s !== booking.status).map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reason (required)</Label>
                    <Textarea
                      rows={3}
                      placeholder="Explain why the status is being changed…"
                      value={forceReason}
                      onChange={(e) => setForceReason(e.target.value)}
                      className="bg-card/40 border-white/10 focus:border-primary/40 resize-none"
                    />
                  </div>
                  <Button
                    onClick={() => statusMutation.mutate()}
                    disabled={!forceStatus || !forceReason.trim() || statusMutation.isPending}
                    className="w-full bg-primary hover:bg-primary/90 gap-2"
                  >
                    {statusMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Apply Status Change
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick Links */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
            <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl">
              <CardHeader>
                <CardTitle className="text-base">Quick Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/admin/contracts?bookingId=${booking.id}`}>
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 border-white/10 hover:border-primary/30 hover:bg-primary/5"
                  >
                    <FileText className="w-4 h-4 text-primary" />
                    View Contract
                  </Button>
                </Link>
                <Link href="/admin/chats">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2 border-white/10 hover:border-primary/30 hover:bg-primary/5"
                  >
                    <MessageSquare className="w-4 h-4 text-primary" />
                    View Negotiation
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
