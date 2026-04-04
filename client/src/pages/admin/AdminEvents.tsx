import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  Calendar,
  Search,
  AlertCircle,
  ChevronRight,
  Trash2,
  Pencil,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminEvent {
  id: number;
  title: string;
  slug: string;
  status: string;
  startTime: string;
  endTime: string;
  organizerId: number;
  venueId: number;
  description: string;
  metadata: any;
  organizer?: { name: string };
  venue?: { name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_FILTERS = [
  { label: "All", value: "" },
  { label: "Upcoming", value: "upcoming" },
  { label: "Past", value: "past" },
  { label: "Cancelled", value: "cancelled" },
];

function EventStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "upcoming":
    case "published":
      return (
        <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/25">
          Upcoming
        </Badge>
      );
    case "past":
    case "completed":
      return (
        <Badge className="bg-zinc-500/15 text-zinc-400 border border-zinc-500/25">
          Past
        </Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-red-500/15 text-red-400 border border-red-500/25">
          Cancelled
        </Badge>
      );
    case "draft":
      return (
        <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/25">
          Draft
        </Badge>
      );
    default:
      return (
        <Badge className="bg-muted/50 text-muted-foreground border border-white/10">
          {status}
        </Badge>
      );
  }
}

function formatDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Delete Dialog ────────────────────────────────────────────────────────────

function DeleteEventDialog({
  event,
  onDeleted,
}: {
  event: AdminEvent;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/events/${event.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw Object.assign(new Error(body.message ?? "Delete failed"), {
          status: res.status,
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Event deleted" });
      setOpen(false);
      onDeleted();
    },
    onError: (err: any) => {
      if (err.status === 409) {
        toast({
          variant: "destructive",
          title: "Cannot delete event",
          description: "Cannot delete event with active bookings.",
        });
      } else {
        toast({ variant: "destructive", title: err.message ?? "Delete failed" });
      }
      setOpen(false);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-white/10">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Event</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">{event.title}</span>? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {mutation.isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminEvents() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const queryClient = useQueryClient();

  const { data: events, isLoading, isError } = useQuery<AdminEvent[]>({
    queryKey: ["/api/admin/events", statusFilter],
    queryFn: async () => {
      const url = statusFilter
        ? `/api/admin/events?status=${statusFilter}`
        : "/api/admin/events";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  const filtered = (events ?? []).filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      (e.organizer?.name ?? "").toLowerCase().includes(q)
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
          <Calendar className="w-5 h-5 text-primary" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold">Events</h1>
            {events && (
              <Badge className="bg-primary/15 text-primary border-primary/25">
                {events.length}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading…" : `${events?.length ?? 0} total events`}
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
            placeholder="Search by title or organizer…"
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
              <p className="text-muted-foreground">Failed to load events. Try refreshing.</p>
            </CardContent>
          ) : filtered.length === 0 ? (
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <Calendar className="w-8 h-8 text-muted-foreground" />
              <p className="text-muted-foreground">
                {search || statusFilter ? "No events match your filters." : "No events found."}
              </p>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    {["Title", "Organizer", "Venue", "Start Date", "Status", "Actions"].map(
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
                  {filtered.map((event, idx) => (
                    <motion.tr
                      key={event.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.025 }}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-foreground">{event.title}</p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[220px]">
                            {event.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {event.organizer?.name ?? (event.organizerId ? <span className="text-xs text-yellow-500/70">ID #{event.organizerId}</span> : "—")}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {event.venue?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {formatDate(event.startTime)}
                      </td>
                      <td className="px-4 py-3.5">
                        <EventStatusBadge status={event.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/events/${event.id}`}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1 text-primary hover:text-primary hover:bg-primary/10"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit
                            </Button>
                          </Link>
                          <DeleteEventDialog
                            event={event}
                            onDeleted={() =>
                              queryClient.invalidateQueries({
                                queryKey: ["/api/admin/events", statusFilter],
                              })
                            }
                          />
                        </div>
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
