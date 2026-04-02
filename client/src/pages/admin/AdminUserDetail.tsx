import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Shield,
  Banknote,
  Activity,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: number;
  username: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
  role: string;
  metadata: Record<string, any>;
  createdAt: string;
  // Profile data depending on role
  artistProfile?: Record<string, any>;
  organizerProfile?: Record<string, any>;
  venueProfile?: Record<string, any>;
  // Financial
  bankAccountNumber?: string;
  bankIfsc?: string;
  panNumber?: string;
  gstin?: string;
}

interface AuditLog {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  context: Record<string, any>;
  occurredAt: string;
}

// ─── Masked field ─────────────────────────────────────────────────────────────

function MaskedField({ label, value }: { label: string; value?: string }) {
  const [revealed, setRevealed] = useState(false);

  if (!value) {
    return (
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs">{label}</Label>
        <p className="text-sm text-muted-foreground/50 italic">Not provided</p>
      </div>
    );
  }

  const masked =
    value.length > 4
      ? "•".repeat(value.length - 4) + value.slice(-4)
      : "•".repeat(value.length);

  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <span className="text-sm font-mono">{revealed ? value : masked}</span>
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title={revealed ? "Hide" : "Reveal"}
        >
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ─── Account Tab ─────────────────────────────────────────────────────────────

function AccountTab({
  user,
  userId,
}: {
  user: UserProfile;
  userId: number;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    displayName: user.displayName ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    status: user.status ?? "active",
    role: user.role ?? user.metadata?.role ?? "artist",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message ?? "Failed to update user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-1.5">
          <Label htmlFor="acc-displayName">Display Name</Label>
          <Input
            id="acc-displayName"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            className="bg-background/60 border-white/10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="acc-email">Email</Label>
          <Input
            id="acc-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="bg-background/60 border-white/10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="acc-phone">Phone</Label>
          <Input
            id="acc-phone"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="+91 98765 43210"
            className="bg-background/60 border-white/10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="acc-status">Status</Label>
          <Select
            value={form.status}
            onValueChange={(val) => setForm((f) => ({ ...f, status: val }))}
          >
            <SelectTrigger id="acc-status" className="bg-background/60 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="pending_verification">Pending Verification</SelectItem>
              <SelectItem value="deleted">Deleted</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="acc-role">Role</Label>
          <Select
            value={form.role}
            onValueChange={(val) => setForm((f) => ({ ...f, role: val }))}
          >
            <SelectTrigger id="acc-role" className="bg-background/60 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="artist">Artist</SelectItem>
              <SelectItem value="organizer">Organizer</SelectItem>
              <SelectItem value="venue_manager">Venue Manager</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="platform_admin">Platform Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" className="bg-primary gap-2" disabled={mutation.isPending}>
          <Save className="w-4 h-4" />
          {mutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ user, userId }: { user: UserProfile; userId: number }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const role = user.role ?? user.metadata?.role ?? "";
  const profileData =
    user.artistProfile ?? user.organizerProfile ?? user.venueProfile ?? null;

  // Artist-specific editable form
  const [artistForm, setArtistForm] = useState({
    bio: user.artistProfile?.bio ?? "",
    priceFrom: user.artistProfile?.priceFrom ?? "",
    priceTo: user.artistProfile?.priceTo ?? "",
    primaryGenre: user.artistProfile?.metadata?.primaryGenre ?? "",
  });

  const artistMutation = useMutation({
    mutationFn: async (data: typeof artistForm) => {
      const res = await fetch(`/api/admin/artists/${userId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update artist profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users", userId] });
      toast({ title: "Artist profile updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (role === "artist" && user.artistProfile) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          artistMutation.mutate(artistForm);
        }}
        className="space-y-5"
      >
        <div className="space-y-1.5">
          <Label htmlFor="artist-bio">Bio</Label>
          <textarea
            id="artist-bio"
            rows={4}
            value={artistForm.bio}
            onChange={(e) => setArtistForm((f) => ({ ...f, bio: e.target.value }))}
            className="w-full rounded-md border border-white/10 bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            placeholder="Artist bio..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="artist-priceFrom">Price From (INR)</Label>
            <Input
              id="artist-priceFrom"
              type="number"
              value={artistForm.priceFrom}
              onChange={(e) => setArtistForm((f) => ({ ...f, priceFrom: e.target.value }))}
              className="bg-background/60 border-white/10"
              placeholder="5000"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="artist-priceTo">Price To (INR)</Label>
            <Input
              id="artist-priceTo"
              type="number"
              value={artistForm.priceTo}
              onChange={(e) => setArtistForm((f) => ({ ...f, priceTo: e.target.value }))}
              className="bg-background/60 border-white/10"
              placeholder="25000"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="artist-genre">Primary Genre</Label>
          <Input
            id="artist-genre"
            value={artistForm.primaryGenre}
            onChange={(e) => setArtistForm((f) => ({ ...f, primaryGenre: e.target.value }))}
            className="bg-background/60 border-white/10"
            placeholder="e.g. Indie, Electronic, Jazz"
          />
        </div>
        <div className="pt-2">
          <Button
            type="submit"
            className="bg-primary gap-2"
            disabled={artistMutation.isPending}
          >
            <Save className="w-4 h-4" />
            {artistMutation.isPending ? "Saving..." : "Save Profile"}
          </Button>
        </div>
      </form>
    );
  }

  // Fallback: JSON viewer for organizer/venue
  if (profileData) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Role-specific profile data for{" "}
          <span className="font-semibold text-foreground capitalize">{role}</span>.
          Direct editing via this panel is limited — use dedicated endpoints for advanced edits.
        </p>
        <pre className="bg-background/60 border border-white/10 rounded-lg p-4 text-xs text-muted-foreground overflow-x-auto max-h-96 font-mono leading-relaxed">
          {JSON.stringify(profileData, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground text-sm">No profile data found for this user.</p>
    </div>
  );
}

// ─── Financial Tab ────────────────────────────────────────────────────────────

function FinancialTab({ user }: { user: UserProfile }) {
  const financial =
    user.artistProfile ?? user.organizerProfile ?? user.venueProfile ?? {};

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Financial data is read-only from this panel. Sensitive fields are masked by default.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <MaskedField label="Bank Account Number" value={financial.bankAccountNumber} />
        <MaskedField label="Bank IFSC Code" value={financial.bankIfsc} />
        <MaskedField label="PAN Number" value={financial.panNumber} />
        <MaskedField label="GSTIN" value={financial.gstin} />
      </div>
    </div>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────────

function ActivityTab({ userId }: { userId: number }) {
  const { data: logs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ["/api/admin/audit", userId],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/audit?userId=${userId}&limit=20`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm">No activity recorded for this user.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="border-white/5 hover:bg-transparent">
          <TableHead className="text-muted-foreground">Timestamp</TableHead>
          <TableHead className="text-muted-foreground">Action</TableHead>
          <TableHead className="text-muted-foreground">Entity</TableHead>
          <TableHead className="text-muted-foreground">Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id} className="border-white/5 hover:bg-white/[0.02]">
            <TableCell className="text-muted-foreground text-xs tabular-nums whitespace-nowrap">
              {log.occurredAt
                ? format(new Date(log.occurredAt), "dd MMM yy, HH:mm")
                : "—"}
            </TableCell>
            <TableCell className="text-sm font-mono text-primary/80">
              {log.action}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground capitalize">
              {log.entityType}
              {log.entityId ? ` #${log.entityId}` : ""}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
              {log.context ? JSON.stringify(log.context) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── AdminUserDetail ──────────────────────────────────────────────────────────

export default function AdminUserDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const userId = parseInt(params.id ?? "0", 10);

  const { data: user, isLoading, isError } = useQuery<UserProfile>({
    queryKey: ["/api/admin/users", userId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("User not found");
      return res.json();
    },
    enabled: !isNaN(userId) && userId > 0,
  });

  return (
    <div className="space-y-6">
      {/* Back button + header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/users")}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : isError || !user ? (
        <Card className="glass-card border-white/5">
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">User not found or could not be loaded.</p>
            <Button
              variant="ghost"
              className="mt-4 text-primary"
              onClick={() => navigate("/admin/users")}
            >
              Go back to Users
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* User summary card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
          >
            <Card className="glass-card border-white/5">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        {user.displayName || user.username || "Unknown"}
                      </CardTitle>
                      <CardDescription className="mt-0.5">
                        {user.email} &mdash; @{user.username ?? "no username"}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p>User ID: #{user.id}</p>
                    <p className="mt-1">
                      Joined{" "}
                      {user.createdAt
                        ? format(new Date(user.createdAt), "dd MMM yyyy")
                        : "—"}
                    </p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Tabs defaultValue="account">
              <TabsList className="bg-card/60 border border-white/5 mb-6">
                <TabsTrigger value="account" className="gap-2">
                  <User className="w-3.5 h-3.5" />
                  Account
                </TabsTrigger>
                <TabsTrigger value="profile" className="gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="financial" className="gap-2">
                  <Banknote className="w-3.5 h-3.5" />
                  Financial
                </TabsTrigger>
                <TabsTrigger value="activity" className="gap-2">
                  <Activity className="w-3.5 h-3.5" />
                  Activity
                </TabsTrigger>
              </TabsList>

              <TabsContent value="account">
                <Card className="glass-card border-white/5">
                  <CardHeader>
                    <CardTitle className="text-base">Account Settings</CardTitle>
                    <CardDescription>
                      Edit the user's core account information, status, and role.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AccountTab user={user} userId={userId} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="profile">
                <Card className="glass-card border-white/5">
                  <CardHeader>
                    <CardTitle className="text-base">
                      {(user.role ?? user.metadata?.role ?? "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Profile
                    </CardTitle>
                    <CardDescription>
                      Role-specific profile information for this user.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ProfileTab user={user} userId={userId} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="financial">
                <Card className="glass-card border-white/5">
                  <CardHeader>
                    <CardTitle className="text-base">Financial Details</CardTitle>
                    <CardDescription>
                      Sensitive financial information. Read-only — fields are masked by default.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FinancialTab user={user} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity">
                <Card className="glass-card border-white/5">
                  <CardHeader>
                    <CardTitle className="text-base">Activity Log</CardTitle>
                    <CardDescription>
                      Last 20 audit log entries involving this user.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 pb-4">
                    <ActivityTab userId={userId} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </>
      )}
    </div>
  );
}
