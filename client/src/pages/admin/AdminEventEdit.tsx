import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  Save,
  Loader2,
  AlertCircle,
  Building2,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface AdminEvent {
  id: number;
  title: string;
  slug: string;
  status: string;
  visibility: string;
  startTime: string;
  endTime: string;
  description: string;
  organizerId: number;
  venueId: number;
  metadata: any;
  organizer?: { name: string };
  venue?: { name: string };
  _bookingCount?: number;
}

interface FormState {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  status: string;
  visibility: string;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function toDatetimeLocal(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminEventEdit() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<FormState>({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    status: "draft",
    visibility: "public",
  });

  const { data: event, isLoading, isError } = useQuery<AdminEvent>({
    queryKey: ["/api/admin/events", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/events/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch event");
      return res.json();
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (event) {
      setForm({
        title: event.title ?? "",
        description: event.description ?? "",
        startTime: toDatetimeLocal(event.startTime),
        endTime: toDatetimeLocal(event.endTime),
        status: event.status ?? "draft",
        visibility: event.visibility ?? "public",
      });
    }
  }, [event]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/admin/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          startTime: form.startTime ? new Date(form.startTime).toISOString() : undefined,
          endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Save failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
    },
    onError: (err: any) => {
      toast({ variant: "destructive", title: err.message ?? "Save failed" });
    },
  });

  const set = (key: keyof FormState) => (val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="flex flex-col items-center gap-4 pt-16 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground">Failed to load event.</p>
        <Link href="/admin/events">
          <Button variant="outline" className="border-white/10">
            Back to Events
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
        className="flex items-center gap-3"
      >
        <Link href="/admin/events">
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
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">{event.title}</h1>
            <p className="text-sm text-muted-foreground font-mono">{event.slug}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-2 space-y-4"
        >
          <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl">
            <CardHeader>
              <CardTitle className="text-base">Event Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => set("title")(e.target.value)}
                  className="bg-card/40 border-white/10 focus:border-primary/40"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => set("description")(e.target.value)}
                  className="bg-card/40 border-white/10 focus:border-primary/40 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => set("startTime")(e.target.value)}
                    className="bg-card/40 border-white/10 focus:border-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => set("endTime")(e.target.value)}
                    className="bg-card/40 border-white/10 focus:border-primary/40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={set("status")}>
                    <SelectTrigger className="bg-card/40 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10">
                      {["draft", "published", "cancelled", "completed"].map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Visibility</Label>
                  <Select value={form.visibility} onValueChange={set("visibility")}>
                    <SelectTrigger className="bg-card/40 border-white/10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-white/10">
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="bg-primary hover:bg-primary/90 gap-2"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right: Info Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <Card className="bg-card/60 backdrop-blur-xl border border-white/5 shadow-xl">
            <CardHeader>
              <CardTitle className="text-base">Event Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Users className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                    Organizer
                  </p>
                  <p className="font-medium">{event.organizer?.name ?? "—"}</p>
                </div>
              </div>
              <Separator className="bg-white/5" />
              <div className="flex items-start gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                    Venue
                  </p>
                  <p className="font-medium">{event.venue?.name ?? "—"}</p>
                </div>
              </div>
              {event._bookingCount !== undefined && (
                <>
                  <Separator className="bg-white/5" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Bookings
                    </p>
                    <Badge className="bg-primary/15 text-primary border-primary/25">
                      {event._bookingCount} booking{event._bookingCount !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </>
              )}
              {event.metadata && Object.keys(event.metadata).length > 0 && (
                <>
                  <Separator className="bg-white/5" />
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                      Metadata
                    </p>
                    <pre className="text-xs text-muted-foreground font-mono bg-black/20 rounded-lg p-3 overflow-x-auto max-h-40">
                      {JSON.stringify(event.metadata, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
