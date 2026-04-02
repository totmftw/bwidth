import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Users,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
  UserX,
  UserCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: number;
  username: string;
  email: string;
  displayName: string;
  status: string;
  role: string;
  metadata: { role?: string };
  createdAt: string;
}

type StatusFilter = "all" | "active" | "pending" | "suspended";

const PAGE_SIZE = 20;

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    active: "bg-green-500/10 text-green-400 border border-green-500/20",
    suspended: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
    pending_verification: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    deleted: "bg-red-500/10 text-red-400 border border-red-500/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        classes[status] ?? "bg-muted/30 text-muted-foreground border border-white/10"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Role badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const classes: Record<string, string> = {
    admin: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    platform_admin: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    artist: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    organizer: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    promoter: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    venue_manager: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        classes[role] ?? "bg-muted/30 text-muted-foreground border border-white/10"
      }`}
    >
      {role.replace(/_/g, " ")}
    </span>
  );
}

// ─── Create User Dialog ───────────────────────────────────────────────────────

function CreateUserDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    username: "",
    email: "",
    password: "",
    role: "artist",
  });
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).message ?? "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "User created successfully" });
      setOpen(false);
      setForm({ displayName: "", username: "", email: "", password: "", role: "artist" });
      onSuccess();
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-primary gap-2">
          <Plus className="w-4 h-4" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-white/10 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="cu-displayName">Display Name</Label>
            <Input
              id="cu-displayName"
              placeholder="Jane Doe"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              required
              className="bg-background/60 border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-username">Username</Label>
            <Input
              id="cu-username"
              placeholder="janedoe"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="bg-background/60 border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-email">Email</Label>
            <Input
              id="cu-email"
              type="email"
              placeholder="jane@example.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              className="bg-background/60 border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-password">Password</Label>
            <Input
              id="cu-password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
              className="bg-background/60 border-white/10"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cu-role">Role</Label>
            <Select
              value={form.role}
              onValueChange={(val) => setForm((f) => ({ ...f, role: val }))}
            >
              <SelectTrigger id="cu-role" className="bg-background/60 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="artist">Artist</SelectItem>
                <SelectItem value="organizer">Organizer</SelectItem>
                <SelectItem value="venue_manager">Venue Manager</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="bg-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Creating..." : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── AdminUsers ───────────────────────────────────────────────────────────────

export default function AdminUsers() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(0);

  const { data: users, isLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: `User ${vars.status === "active" ? "activated" : "suspended"}`,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not update status", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User deleted" });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not delete user", variant: "destructive" });
    },
  });

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        (u.displayName ?? "").toLowerCase().includes(q) ||
        (u.username ?? "").toLowerCase().includes(q) ||
        (u.email ?? "").toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && u.status === "active") ||
        (statusFilter === "pending" && u.status === "pending_verification") ||
        (statusFilter === "suspended" && u.status === "suspended");

      const userRole = u.role ?? u.metadata?.role ?? "";
      const matchesRole = roleFilter === "all" || userRole === roleFilter;

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [users, search, statusFilter, roleFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(0);
  };
  const handleStatusFilter = (val: StatusFilter) => {
    setStatusFilter(val);
    setPage(0);
  };
  const handleRoleFilter = (val: string) => {
    setRoleFilter(val);
    setPage(0);
  };

  const STATUS_TABS: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Pending", value: "pending" },
    { label: "Suspended", value: "suspended" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            Users
          </h1>
          <p className="text-muted-foreground mt-1">
            {users ? `${users.length} total users registered` : "Loading..."}
          </p>
        </div>
        <CreateUserDialog
          onSuccess={() =>
            queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] })
          }
        />
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 space-y-4">
            {/* Status tabs */}
            <div className="flex gap-1 flex-wrap">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => handleStatusFilter(tab.value)}
                  className={[
                    "px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    statusFilter === tab.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search + Role filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, username, or email..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 bg-background/60 border-white/10"
                />
              </div>
              <Select value={roleFilter} onValueChange={handleRoleFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-background/60 border-white/10">
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="artist">Artist</SelectItem>
                  <SelectItem value="organizer">Organizer</SelectItem>
                  <SelectItem value="venue_manager">Venue Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <Card className="glass-card border-white/5">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : paginated.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  No users match your filters
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-muted-foreground w-12">#</TableHead>
                    <TableHead className="text-muted-foreground">Display Name</TableHead>
                    <TableHead className="text-muted-foreground">Username</TableHead>
                    <TableHead className="text-muted-foreground hidden md:table-cell">
                      Email
                    </TableHead>
                    <TableHead className="text-muted-foreground">Role</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground hidden lg:table-cell">
                      Created
                    </TableHead>
                    <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map((user, idx) => {
                    const userRole = user.role ?? user.metadata?.role ?? "unknown";
                    const isActive = user.status === "active";
                    return (
                      <TableRow
                        key={user.id}
                        className="border-white/5 hover:bg-white/[0.02] transition-colors"
                      >
                        <TableCell className="text-muted-foreground text-xs tabular-nums">
                          {page * PAGE_SIZE + idx + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {user.displayName || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {user.username || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <RoleBadge role={userRole} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={user.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs hidden lg:table-cell">
                          {user.createdAt
                            ? format(new Date(user.createdAt), "dd MMM yyyy")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {/* View */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="w-8 h-8 hover:text-primary hover:bg-primary/10"
                              onClick={() => navigate(`/admin/users/${user.id}`)}
                              title="View user"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            {/* Suspend / Activate */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`w-8 h-8 ${
                                isActive
                                  ? "hover:text-yellow-400 hover:bg-yellow-500/10"
                                  : "hover:text-green-400 hover:bg-green-500/10"
                              }`}
                              disabled={statusMutation.isPending}
                              onClick={() =>
                                statusMutation.mutate({
                                  id: user.id,
                                  status: isActive ? "suspended" : "active",
                                })
                              }
                              title={isActive ? "Suspend user" : "Activate user"}
                            >
                              {isActive ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </Button>

                            {/* Delete */}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-8 h-8 hover:text-destructive hover:bg-destructive/10"
                                  title="Delete user"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="glass-card border-white/10">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will soft-delete{" "}
                                    <span className="font-semibold text-foreground">
                                      {user.displayName || user.username || user.email}
                                    </span>
                                    . They will lose access immediately. An admin can reverse
                                    this by restoring the account status.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="border-white/10">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => deleteMutation.mutate(user.id)}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="border-white/10 gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="border-white/10 gap-1"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
