import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Ban, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export default function AdminUsers() {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [statusFilter, setStatusFilter] = useState("all");

    const { data: users, isLoading } = useQuery({
        queryKey: ["/admin/users"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/admin/users");
            if (!res.ok) throw new Error("Failed to fetch users");
            return await res.json();
        }
    });

    const { mutate: updateStatus, isPending: isUpdating } = useMutation({
        mutationFn: async ({ id, status }: { id: number; status: string }) => {
            const res = await apiRequest("PATCH", `/admin/users/${id}/status`, { status });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Update failed");
            }
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/admin/users"] });
            toast({ title: "User status updated" });
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const [roleEditUser, setRoleEditUser] = useState<any>(null);
    const [selectedRole, setSelectedRole] = useState<string>("");

    const { mutate: updateRole, isPending: isUpdatingRole } = useMutation({
        mutationFn: async ({ id, role }: { id: number; role: string }) => {
            const res = await apiRequest("PATCH", `/admin/users/${id}/role`, { role });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Update role failed");
            }
            return await res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/admin/users"] });
            toast({ title: "User role updated" });
            setRoleEditUser(null);
        },
        onError: (err: any) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const filteredUsers = users?.filter((u: any) => {
        if (statusFilter === "all") return true;
        return u.status === statusFilter;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground">Manage user accounts and permissions.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filter by status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="pending_verification">Pending</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["/admin/users"] })}>
                        <RefreshCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">ID</TableHead>
                            <TableHead>User</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : filteredUsers?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user: any) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-mono text-xs">{user.id}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{user.displayName || user.username}</span>
                                            <span className="text-xs text-muted-foreground">{user.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="capitalize cursor-pointer hover:bg-accent" onClick={() => { setRoleEditUser(user); setSelectedRole(user.role); }}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={user.status} />
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : '-'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {user.status === 'pending_verification' && (
                                                <>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:text-green-500"
                                                        onClick={() => updateStatus({ id: user.id, status: 'active' })}
                                                        disabled={isUpdating}>
                                                        <CheckCircle className="h-4 w-4" />
                                                        <span className="sr-only">Approve</span>
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:text-red-500"
                                                        onClick={() => updateStatus({ id: user.id, status: 'rejected' })}
                                                        disabled={isUpdating}>
                                                        <XCircle className="h-4 w-4" />
                                                        <span className="sr-only">Reject</span>
                                                    </Button>
                                                </>
                                            )}
                                            {user.status === 'active' && user.role !== 'admin' && (
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:text-amber-500"
                                                    onClick={() => updateStatus({ id: user.id, status: 'suspended' })}
                                                    disabled={isUpdating}>
                                                    <Ban className="h-4 w-4" />
                                                    <span className="sr-only">Suspend</span>
                                                </Button>
                                            )}
                                            {user.status === 'suspended' && (
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:text-green-500"
                                                    onClick={() => updateStatus({ id: user.id, status: 'active' })}
                                                    disabled={isUpdating}>
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span className="sr-only">Reactivate</span>
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Role Edit Dialog */}
            <Dialog open={!!roleEditUser} onOpenChange={(open) => !open && setRoleEditUser(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User Role</DialogTitle>
                        <DialogDescription>
                            Change role for {roleEditUser?.displayName || roleEditUser?.username}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="artist">Artist</SelectItem>
                                <SelectItem value="promoter">Promoter</SelectItem>
                                <SelectItem value="organizer">Organizer</SelectItem>
                                <SelectItem value="venue_manager">Venue Manager</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="platform_admin">Platform Admin</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRoleEditUser(null)}>Cancel</Button>
                        <Button
                            onClick={() => roleEditUser && updateRole({ id: roleEditUser.id, role: selectedRole })}
                            disabled={isUpdatingRole || selectedRole === roleEditUser?.role}
                        >
                            {isUpdatingRole && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Update Role
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'active') return <Badge className="bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20">Active</Badge>;
    if (status === 'pending_verification') return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/20">Pending</Badge>;
    if (status === 'suspended') return <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20">Suspended</Badge>;
    if (status === 'rejected') return <Badge variant="outline" className="text-muted-foreground border-muted-foreground/30">Rejected</Badge>;
    return <Badge variant="secondary">{status}</Badge>;
}
