import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2, LayoutDashboard, Users, FileText, Calendar, LogOut, Shield, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AdminLayout({ children }: { children: React.ReactNode }) {
    const { user, isLoading, logoutMutation } = useAuth();
    const [location] = useLocation();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-primary">
                <Loader2 className="w-10 h-10 animate-spin" />
            </div>
        );
    }

    if (!user || (user.role !== "admin" && user.role !== "platform_admin")) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background p-4">
                <Shield className="w-16 h-16 text-muted-foreground/30" />
                <h1 className="text-2xl font-bold">Access Denied</h1>
                <p className="text-muted-foreground text-center max-w-md">
                    You do not have permission to view this area.
                </p>
                <Link href="/dashboard">
                    <Button>Return to Dashboard</Button>
                </Link>
            </div>
        );
    }

    const navItems = [
        { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/admin/users", icon: Users, label: "User Management" },
        { href: "/admin/contracts", icon: FileText, label: "Contract Review" },
        { href: "/admin/bookings", icon: Calendar, label: "All Bookings" },
        { href: "/admin/chat", icon: MessageSquare, label: "Chat Oversight" },
    ];

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Admin Sidebar */}
            <aside className="w-64 border-r border-border bg-card/50 hidden md:flex flex-col">
                <div className="p-6 border-b border-border/50">
                    <div className="flex items-center gap-2 font-bold text-lg text-primary">
                        <Shield className="w-5 h-5" />
                        <span>Admin Portal</span>
                    </div>
                </div>

                <div className="flex-1 py-6 px-3 space-y-1">
                    {navItems.map((item) => (
                        <Link key={item.href} href={item.href}>
                            <div className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                                location === item.href
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}>
                                <item.icon className="w-4 h-4" />
                                {item.label}
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="p-4 border-t border-border/50">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                            {(user.username || "U").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium truncate">{user.displayName || user.username}</p>
                            <p className="text-xs text-muted-foreground truncate capitalize">{user.role}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        className="w-full mt-2 justify-start text-muted-foreground hover:text-destructive"
                        onClick={() => logoutMutation.mutate()}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </aside>

            {/* Mobile Header (Simplified) */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 border-b border-border bg-background z-50 flex items-center px-4 justify-between">
                <span className="font-bold flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" /> Admin Portal
                </span>
                {/* Mobile menu could go here */}
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col md:ml-0 pt-16 md:pt-0 h-screen overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 md:p-10">
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}
