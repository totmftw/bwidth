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
  Building2,
  Phone,
  Mail,
  Globe,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

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

interface FormState {
  name: string;
  description: string;
  website: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  trustScore: number | "";
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

export default function AdminOrgEdit() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const orgId = Number(id);

  const { data: organizer, isLoading, isError } = useQuery<AdminOrganizer>({
    queryKey: ["/api/admin/organizers", orgId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/organizers/${orgId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch organizer");
      return res.json();
    },
    enabled: !isNaN(orgId),
  });

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    website: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    trustScore: "",
  });

  useEffect(() => {
    if (organizer) {
      setForm({
        name: organizer.name ?? "",
        description: organizer.description ?? "",
        website: organizer.metadata.website ?? "",
        contactName: organizer.contactPerson.name ?? "",
        contactEmail: organizer.contactPerson.email ?? "",
        contactPhone: organizer.contactPerson.phone ?? "",
        trustScore: organizer.metadata.trustScore ?? "",
      });
    }
  }, [organizer]);

  const saveMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const { trustScore, ...rest } = data;
      const payload = {
        name: rest.name,
        description: rest.description,
        contactPerson: {
          name: rest.contactName,
          email: rest.contactEmail,
          phone: rest.contactPhone,
        },
        metadata: {
          ...(organizer?.metadata ?? {}),
          website: rest.website,
          trustScore: trustScore !== "" ? Number(trustScore) : undefined,
        },
      };
      const res = await fetch(`/api/admin/organizers/${orgId}`, {
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizers", orgId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/organizers"] });
      toast({ title: "Organizer updated", description: "Changes saved successfully." });
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
          <Skeleton className="lg:col-span-2 h-[420px] rounded-xl" />
          <Skeleton className="h-[260px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !organizer) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-muted-foreground">Organizer not found or failed to load.</p>
        <Link href="/admin/organizers">
          <Button variant="outline">Back to Organizers</Button>
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
        <Link href="/admin/organizers">
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-white/5">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Building2 className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold">{organizer.name}</h1>
            <p className="text-xs text-muted-foreground">Organizer #{organizer.id}</p>
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
          {/* Organization Info */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Organization Info</CardTitle>
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
                  placeholder="About this organizer…"
                  className="bg-card/40 border-white/10 focus:border-primary/40 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="website">
                  <Globe className="w-3.5 h-3.5 inline mr-1.5" />
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={form.website}
                  onChange={(e) => setField("website", e.target.value)}
                  placeholder="https://example.com"
                  className="bg-card/40 border-white/10 focus:border-primary/40"
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Person */}
          <Card className="glass-card border-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Contact Person</CardTitle>
              <CardDescription>
                Primary point of contact for this organization.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="contactName">
                  <User className="w-3.5 h-3.5 inline mr-1.5" />
                  Contact Name
                </Label>
                <Input
                  id="contactName"
                  value={form.contactName}
                  onChange={(e) => setField("contactName", e.target.value)}
                  placeholder="Full name"
                  className="bg-card/40 border-white/10 focus:border-primary/40"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="contactEmail">
                    <Mail className="w-3.5 h-3.5 inline mr-1.5" />
                    Contact Email
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => setField("contactEmail", e.target.value)}
                    placeholder="contact@example.com"
                    className="bg-card/40 border-white/10 focus:border-primary/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contactPhone">
                    <Phone className="w-3.5 h-3.5 inline mr-1.5" />
                    Contact Phone
                  </Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={form.contactPhone}
                    onChange={(e) => setField("contactPhone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className="bg-card/40 border-white/10 focus:border-primary/40"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust Score */}
          <Card className="border-white/5 bg-white/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="w-4 h-4" />
                Trust Score
              </CardTitle>
              <CardDescription className="text-xs">
                Platform score (0-100): organizer reliability & compliance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="trustScore">Score (0-100)</Label>
                <Input
                  id="trustScore"
                  type="number"
                  min="0"
                  max="100"
                  value={form.trustScore}
                  onChange={(e) =>
                    setField("trustScore", e.target.value ? Number(e.target.value) : "")
                  }
                  placeholder="e.g. 75"
                  className="bg-card/40 border-white/10 focus:border-primary/40"
                />
              </div>
              {form.trustScore !== "" && (
                <div className="text-sm p-2 bg-white/5 rounded border border-white/5 flex items-center gap-2">
                  <span className="text-muted-foreground">Current:</span>
                  <TrustScoreBadge score={Number(form.trustScore)} />
                </div>
              )}
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
        >
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
                <StatusBadge status={organizer.user.status} />
              </div>
              <Separator className="bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Username</span>
                <span className="font-mono text-xs text-foreground">
                  @{organizer.user.username}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground shrink-0">Email</span>
                <span className="text-foreground text-right break-all text-xs">
                  {organizer.user.email}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Display Name</span>
                <span className="text-foreground">{organizer.user.displayName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs text-muted-foreground">
                  #{organizer.user.id}
                </span>
              </div>
              {organizer.metadata.trustScore != null && (
                <>
                  <Separator className="bg-white/5" />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trust Score</span>
                    <span
                      className={`font-bold ${
                        organizer.metadata.trustScore >= 80
                          ? "text-emerald-400"
                          : organizer.metadata.trustScore >= 60
                          ? "text-yellow-400"
                          : "text-red-400"
                      }`}
                    >
                      {organizer.metadata.trustScore}
                      <span className="text-muted-foreground font-normal text-xs"> / 100</span>
                    </span>
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
