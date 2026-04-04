import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface Role {
  role: string;
  count: number;
}

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

const PAGE_SIZE = 20;
const VALID_ROLES = [
  "artist",
  "band_manager",
  "promoter",
  "organizer",
  "venue_manager",
  "admin",
  "platform_admin",
  "staff",
];

// ─── Role Badge ───────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  const classes: Record<string, string> = {
    admin: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    platform_admin: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    artist: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    band_manager: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    organizer: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    promoter: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    venue_manager: "bg-teal-500/10 text-teal-400 border border-teal-500/20",
    staff: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20",
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

// ─── Status Badge ─────────────────────────────────────────────────────────────

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

// ─── Admin Roles ──────────────────────────────────────────────────────────────

export default function AdminRoles() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // Fetch role summary
  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["admin", "roles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/roles", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    },
  });

  // Fetch users by role
  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin", "roles", selectedRole],
    queryFn: async () => {
      if (!selectedRole) return [];
      const res = await fetch(`/api/admin/roles/${selectedRole}/users`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    enabled: !!selectedRole,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const roleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: string }) => {
      const res = await fetch(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      // Invalidate both role summary and the current role's user list
      queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "roles", selectedRole] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User role updated" });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not update user role",
        variant: "destructive",
      });
    },
  });

  // ── Pagination ────────────────────────────────────────────────────────────

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users;
  }, [users]);

  const totalPages = Math.ceil(filteredUsers.length / PAGE_SIZE);
  const paginated = filteredUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handlePageChange = (newPage: number) => {
    setPage(Math.max(0, Math.min(newPage, totalPages - 1)));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Role Management</h1>
            <p className="text-sm text-muted-foreground">
              View and manage user roles across the platform
            </p>
          </div>
        </div>
      </div>

      {/* Main grid: Roles list + Users by role */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All Roles ({roles?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {rolesLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 rounded" />
                  ))
                ) : roles && roles.length > 0 ? (
                  roles.map((role) => (
                    <button
                      key={role.role}
                      onClick={() => {
                        setSelectedRole(selectedRole === role.role ? null : role.role);
                        setPage(0);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border transition-colors ${
                        selectedRole === role.role
                          ? "bg-primary/20 border-primary/40"
                          : "hover:bg-white/5 border-white/10"
                      }`}
                    >
                      <span className="text-sm font-medium">{role.role.replace(/_/g, " ")}</span>
                      <span className="text-xs bg-white/10 px-2 py-1 rounded">{role.count}</span>
                    </button>
                  ))
                ) : null}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Users by Role */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {selectedRole
                  ? `Users in ${selectedRole.replace(/_/g, " ")} (${filteredUsers.length})`
                  : "Select a role to view users"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedRole ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Click a role on the left to view its users</p>
                </div>
              ) : usersLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 rounded" />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No users found in this role</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/5 hover:bg-transparent">
                          <TableHead>Username / Email</TableHead>
                          <TableHead>Display Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>New Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginated.map((user) => (
                          <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                            <TableCell className="font-mono text-xs">
                              <div>{user.username || user.email}</div>
                              {user.username && <div className="text-muted-foreground">{user.email}</div>}
                            </TableCell>
                            <TableCell className="text-sm">{user.displayName || "-"}</TableCell>
                            <TableCell>
                              <StatusBadge status={user.status} />
                            </TableCell>
                            <TableCell>
                              <Select
                                value={user.role ?? user.metadata?.role ?? ""}
                                onValueChange={(newRole) =>
                                  roleMutation.mutate({ id: user.id, role: newRole })
                                }
                                disabled={roleMutation.isPending}
                              >
                                <SelectTrigger className="w-[160px] bg-background/60 border-white/10 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {VALID_ROLES.map((role) => (
                                    <SelectItem key={role} value={role}>
                                      {role.replace(/_/g, " ")}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                      <span className="text-xs text-muted-foreground">
                        Page {page + 1} of {totalPages} ({filteredUsers.length} users)
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page === 0}
                          className="border-white/10"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page >= totalPages - 1}
                          className="border-white/10"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
