import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Save,
  Loader2,
  AlertCircle,
  MapPin,
  Star,
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

interface FormState {
  name: string;
  description: string;
  capacity: string;
  street: string;
  city: string;
  state: string;
  status: string;
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
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AdminVenueEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const venueId = Number(id);

  const { data: venue, isLoading, isError } = useQuery<AdminVenue>({
    queryKey: ["/api/admin/venues", venueId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/venues/${venueId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch venue");
      return res.json();
    },
    enabled: !isNaN(venueId),
  });

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    capacity: "",
    street: "",
    city: "",
    state: "",
    status: "active",
  });

  useEffect(() => {
    if (venue) {
      setForm({
        name: venue.name ?? "",
        description: venue.description ?? "",
        capacity: String(venue.capacity ?? ""),
        street: (venue.address as any)?.street ?? "",
        city: (venue.address as any)?.city ?? "",
        state: (venue.address as any)?.state ?? "",
        status: venue.user?.status ?? "active",
      });
    }
  }, [venue]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const payload = {
        name: data.name,
        description: data.description,
        capacity: Number(data.capacity),
        address: {
          street: data.street,
          city: data.city,
          state: data.state,
        },
        // status change propagates to the user record via the server
        status: data.status,
      };
      const res = await fetch(`/api/admin/venues/${venueId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/venues", venueId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/venues"] });
      toast({ title: "Venue updated", description: "Changes saved successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-56 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[500px] rounded-xl" />
          <Skeleton className="h-[260px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !venue) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground">Venue not found or failed to load.</p>
        <Link href="/admin/venues">
          <Button variant="outline">Back to Venues</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link href="/admin/venues">
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20">
            <MapPin className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">{venue.name}</h1>
            <p className="text-xs text-muted-foreground">Venue #{venue.id}</p>
          </div>
        </div>
      </motion.div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Edit Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="lg:col-span-2 space-y-5"
        >
          {/* Venue Info */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Venue Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className="bg-card/40 border-white/10 focus:border-primary/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  rows={4}
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="About this venue…"
                  className="bg-card/40 border-white/10 focus:border-primary/40 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="capacity">Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={0}
                  value={form.capacity}
                  onChange={(e) => setField("capacity", e.target.value)}
                  placeholder="e.g. 500"
                  className="bg-card/40 border-white/10 focus:border-primary/40"
                />
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="street">Street</Label>
                <Input
                  id="street"
                  value={form.street}
                  onChange={(e) => setField("street", e.target.value)}
                  placeholder="Street address"
                  className="bg-card/40 border-white/10 focus:border-primary/40"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setField("city", e.target.value)}
                    placeholder="e.g. Bangalore"
                    className="bg-card/40 border-white/10 focus:border-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => setField("state", e.target.value)}
                    placeholder="e.g. Karnataka"
                    className="bg-card/40 border-white/10 focus:border-primary/40"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Settings</CardTitle>
              <CardDescription>
                Changing status here updates the associated user account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-w-xs">
                <Label htmlFor="status">Account Status</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger
                    id="status"
                    className="bg-card/40 border-white/10 focus:border-primary/40"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Save */}
          <div className="flex justify-end">
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
              className="bg-primary hover:bg-primary/90 gap-2 min-w-[120px]"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* RIGHT: Info Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* Account Info */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={venue.user?.status ?? "active"} />
              </div>
              <Separator className="bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Username</span>
                <span className="font-mono text-xs text-foreground">
                  @{venue.user.username}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Display Name</span>
                <span className="text-foreground">{venue.user.displayName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs text-muted-foreground">
                  #{venue.user.id}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Rating */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Number(venue.ratingAvg) > 0 ? (
                <div className="flex items-center gap-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`w-5 h-5 ${
                        i < Math.round(Number(venue.ratingAvg))
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-lg font-bold text-foreground">
                    {Number(venue.ratingAvg).toFixed(1)}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No reviews yet.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
