import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  User,
  Save,
  Loader2,
  AlertCircle,
  Music2,
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

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
  artistCategoryLocked: boolean;
  categoryNotes: string;
  baseLocation: string;
  artistCommissionPct: string;
  organizerCommissionPct: string;
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

interface FormState {
  name: string;
  bio: string;
  primaryGenre: string;
  baseLocation: string;
  priceFrom: string;
  priceTo: string;
  currency: string;
  artistCategory: string;
  artistCategoryLocked: boolean;
  categoryNotes: string;
  artistCommissionPct: string;
  organizerCommissionPct: string;
}

// ─── Helper ────────────────────────────────────────────────────────────────────

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

function TrustScoreBadge({ score }: { score?: number }) {
  if (score == null) return <span className="text-muted-foreground text-sm">Not set</span>;
  const color =
    score >= 80
      ? "text-emerald-400"
      : score >= 60
      ? "text-yellow-400"
      : "text-red-400";
  return (
    <span className={`font-bold text-lg ${color}`}>
      {score}
      <span className="text-muted-foreground text-sm font-normal"> / 100</span>
    </span>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AdminArtistEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const artistId = Number(id);

  const { data: artist, isLoading, isError } = useQuery<AdminArtist>({
    queryKey: ["/api/admin/artists", artistId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/artists/${artistId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch artist");
      return res.json();
    },
    enabled: !isNaN(artistId),
  });

  const [form, setForm] = useState<FormState>({
    name: "",
    bio: "",
    primaryGenre: "",
    baseLocation: "",
    priceFrom: "",
    priceTo: "",
    currency: "INR",
    artistCategory: "budding",
    artistCategoryLocked: false,
    categoryNotes: "",
    artistCommissionPct: "",
    organizerCommissionPct: "",
  });

  useEffect(() => {
    if (artist) {
      setForm({
        name: artist.name ?? "",
        bio: artist.bio ?? "",
        primaryGenre: artist.metadata.primaryGenre ?? "",
        baseLocation: artist.baseLocation ?? "",
        priceFrom: artist.priceFrom ?? "",
        priceTo: artist.priceTo ?? "",
        currency: artist.currency ?? "INR",
        artistCategory: artist.artistCategory ?? "budding",
        artistCategoryLocked: artist.artistCategoryLocked ?? false,
        categoryNotes: artist.categoryNotes ?? "",
        artistCommissionPct: artist.artistCommissionPct ?? "",
        organizerCommissionPct: artist.organizerCommissionPct ?? "",
      });
    }
  }, [artist]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<FormState>) => {
      const payload = {
        ...data,
        metadata: {
          ...(artist?.metadata ?? {}),
          primaryGenre: data.primaryGenre,
        },
      };
      const res = await fetch(`/api/admin/artists/${artistId}`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/artists", artistId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/artists"] });
      toast({ title: "Artist updated", description: "Changes saved successfully." });
    },
    onError: (err: Error) => {
      toast({
        title: "Save failed",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[500px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !artist) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground">Artist not found or failed to load.</p>
        <Link href="/admin/artists">
          <Button variant="outline">Back to Artists</Button>
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
        <Link href="/admin/artists">
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Music2 className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">{artist.name}</h1>
            <p className="text-xs text-muted-foreground">Artist #{artist.id}</p>
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
          {/* Basic Info */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Basic Info</CardTitle>
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
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setField("bio", e.target.value)}
                  className="bg-card/40 border-white/10 focus:border-primary/40 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="genre">Primary Genre</Label>
                  <Input
                    id="genre"
                    value={form.primaryGenre}
                    onChange={(e) => setField("primaryGenre", e.target.value)}
                    placeholder="e.g. Indie Rock"
                    className="bg-card/40 border-white/10 focus:border-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Base Location</Label>
                  <Input
                    id="location"
                    value={form.baseLocation}
                    onChange={(e) => setField("baseLocation", e.target.value)}
                    placeholder="e.g. Bangalore"
                    className="bg-card/40 border-white/10 focus:border-primary/40"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="priceFrom">Price From (INR)</Label>
                  <Input
                    id="priceFrom"
                    type="number"
                    min={0}
                    value={form.priceFrom}
                    onChange={(e) => setField("priceFrom", e.target.value)}
                    className="bg-card/40 border-white/10 focus:border-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="priceTo">Price To (INR)</Label>
                  <Input
                    id="priceTo"
                    type="number"
                    min={0}
                    value={form.priceTo}
                    onChange={(e) => setField("priceTo", e.target.value)}
                    className="bg-card/40 border-white/10 focus:border-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={form.currency}
                    onValueChange={(v) => setField("currency", v)}
                  >
                    <SelectTrigger
                      id="currency"
                      className="bg-card/40 border-white/10 focus:border-primary/40"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="artistCategory">Artist Category</Label>
                  <Select
                    value={form.artistCategory}
                    onValueChange={(v) => setField("artistCategory", v)}
                  >
                    <SelectTrigger
                      id="artistCategory"
                      className="bg-card/40 border-white/10 focus:border-primary/40"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="budding">Budding</SelectItem>
                      <SelectItem value="mid_scale">Mid Scale</SelectItem>
                      <SelectItem value="international">International</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Category Locked</Label>
                  <div className="flex items-center gap-3 h-10">
                    <Switch
                      checked={form.artistCategoryLocked}
                      onCheckedChange={(v) => setField("artistCategoryLocked", v)}
                    />
                    <span className="text-sm text-muted-foreground">
                      {form.artistCategoryLocked ? "Locked — artist cannot change" : "Unlocked"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="categoryNotes">Category Notes</Label>
                <Textarea
                  id="categoryNotes"
                  rows={2}
                  value={form.categoryNotes}
                  onChange={(e) => setField("categoryNotes", e.target.value)}
                  placeholder="Internal notes about this artist's category assignment…"
                  className="bg-card/40 border-white/10 focus:border-primary/40 resize-none"
                />
              </div>
            </CardContent>
          </Card>

          {/* Commission Overrides */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Commission Overrides</CardTitle>
              <CardDescription>
                Leave blank to use platform defaults (2–5%).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="artistCommission">Artist Commission %</Label>
                  <Input
                    id="artistCommission"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.artistCommissionPct}
                    onChange={(e) => setField("artistCommissionPct", e.target.value)}
                    placeholder="e.g. 3"
                    className="bg-card/40 border-white/10 focus:border-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="orgCommission">Organizer Commission %</Label>
                  <Input
                    id="orgCommission"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={form.organizerCommissionPct}
                    onChange={(e) => setField("organizerCommissionPct", e.target.value)}
                    placeholder="e.g. 2"
                    className="bg-card/40 border-white/10 focus:border-primary/40"
                  />
                </div>
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
                <StatusBadge status={artist.user.status} />
              </div>
              <Separator className="bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Username</span>
                <span className="font-mono text-xs text-foreground">
                  @{artist.user.username}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Email</span>
                <span className="text-foreground text-right break-all text-xs">
                  {artist.user.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Display Name</span>
                <span className="text-foreground">{artist.user.displayName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs text-muted-foreground">
                  #{artist.user.id}
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
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.round(Number(artist.ratingAvg))
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
                <span className="ml-1 text-lg font-bold text-foreground">
                  {Number(artist.ratingAvg).toFixed(1)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {artist.ratingCount > 0
                  ? `Based on ${artist.ratingCount} review${artist.ratingCount === 1 ? "" : "s"}`
                  : "No reviews yet"}
              </p>
            </CardContent>
          </Card>

          {/* Trust Score */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                Trust Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrustScoreBadge score={artist.metadata.trustScore} />
              <p className="text-xs text-muted-foreground mt-2">
                Affects contract terms and advance payment requirements.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
