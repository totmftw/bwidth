import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Users, FileText, ArrowRight, Loader2, Calendar, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminDashboard() {
    // Fetch pending contracts
    const { data: pendingContracts, isLoading: isLoadingContracts } = useQuery({
        queryKey: ["/admin/contracts/pending"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/admin/contracts/pending");
            if (!res.ok) throw new Error("Failed to fetch pending contracts");
            return await res.json();
        }
    });

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground">
                    Overview of platform activity and pending tasks.
                </p>
            </div>

            {/* Quick Stats / Overview Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Contracts</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {isLoadingContracts ? <Loader2 className="h-4 w-4 animate-spin" /> : pendingContracts?.length || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Waiting for admin review
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <Link href="/admin/users">
                            <div className="text-2xl font-bold hover:underline cursor-pointer">View</div>
                        </Link>
                        <p className="text-xs text-muted-foreground">
                            Manage user accounts
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversations</CardTitle>
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <Link href="/admin/chat">
                            <div className="text-2xl font-bold hover:underline cursor-pointer">View</div>
                        </Link>
                        <p className="text-xs text-muted-foreground">
                            Monitor platform chats
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Action Required: Pending Contracts */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight">Action Required</h2>
                    <Link href="/admin/contracts">
                        <Button variant="ghost" size="sm" className="gap-1">
                            View All <ArrowRight className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {isLoadingContracts ? (
                        <div className="col-span-full flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : pendingContracts && pendingContracts.length > 0 ? (
                        pendingContracts.slice(0, 6).map((contract: any) => (
                            <Card key={contract.id} className="overflow-hidden border-l-4 border-l-amber-500">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                            Admin Review
                                        </Badge>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(contract.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <CardTitle className="text-base mt-2">
                                        Booking #{contract.bookingId}
                                    </CardTitle>
                                    <CardDescription className="line-clamp-1">
                                        Contract v{contract.version} ready for review
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Link href={`/admin/contracts`}>
                                            <Button size="sm" className="w-full bg-amber-600 hover:bg-amber-700">
                                                Review Now
                                            </Button>
                                        </Link>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="col-span-full flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/20">
                            <CheckCircleIcon className="h-10 w-10 text-muted-foreground/50 mb-2" />
                            <p className="text-muted-foreground font-medium">All caught up!</p>
                            <p className="text-sm text-muted-foreground/70">No contracts currently require admin review.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function CheckCircleIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    )
}
