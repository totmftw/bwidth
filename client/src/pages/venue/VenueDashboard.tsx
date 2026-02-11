import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Calendar, DollarSign, Users, TrendingUp, Music2,
    CalendarDays, Clock, MapPin, Star, ArrowUpRight,
    Sparkles, Target, ChevronRight, Bell, CheckCircle2
} from "lucide-react";
import { Link } from "wouter";
import { format, addDays, isAfter, isBefore } from "date-fns";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

// ============================================================================
// TYPES
// ============================================================================

interface VenueData {
    venue?: {
        id: number;
        name: string;
        description?: string;
        address?: any;
        capacity?: number;
        amenities?: string[];
        metadata?: any;
    };
}

interface DashboardStats {
    totalShowsHosted?: number;
    upcomingShows?: number;
    artistsBooked?: number;
    budgetUtilization?: number;
    trustScore?: number;
    pendingRequests?: number;
}

export default function VenueDashboard() {
    const { user } = useAuth();

    // Fetch venue data
    const { data: venueData, isLoading: venueLoading } = useQuery<VenueData>({
        queryKey: ["/api/venues/profile"],
        enabled: !!user,
    });

    // Fetch dashboard stats
    const { data: dashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
        queryKey: ["/api/venues/dashboard"],
        enabled: !!user,
    });

    if (!user) return null;

    const venue = venueData?.venue;
    const stats: DashboardStats = dashboardStats || {
        totalShowsHosted: 0,
        upcomingShows: 0,
        artistsBooked: 0,
        budgetUtilization: 0,
        trustScore: 50,
        pendingRequests: 0,
    };

    // Fetch upcoming events
    const { data: upcomingEvents = [], isLoading: eventsLoading } = useQuery<any[]>({
        queryKey: ["/api/venues/events/upcoming"],
        enabled: !!user,
    });

    const isLoading = venueLoading || statsLoading || eventsLoading;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-display font-bold">Venue Dashboard</h1>
                    <p className="text-muted-foreground">
                        Welcome back, {venue?.name || user.displayName || "Venue Manager"}
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link href="/explore">
                        <Button variant="outline" className="border-white/10">
                            <Music2 className="mr-2 w-4 h-4" /> Find Artists
                        </Button>
                    </Link>
                    <Link href="/venue/events/create">
                        <Button className="bg-gradient-to-r from-primary to-purple-600">
                            <CalendarDays className="mr-2 w-4 h-4" /> Create Event
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Shows Hosted"
                    value={stats.totalShowsHosted?.toString() || "0"}
                    icon={Calendar}
                    trend="+3 this month"
                    gradient="from-blue-500/20 to-cyan-500/20"
                />
                <StatCard
                    title="Artists Booked"
                    value={stats.artistsBooked?.toString() || "0"}
                    icon={Users}
                    trend="+5 new connections"
                    gradient="from-purple-500/20 to-pink-500/20"
                />
                <StatCard
                    title="Budget Used"
                    value={`₹${(stats.budgetUtilization || 0).toLocaleString()}`}
                    icon={DollarSign}
                    description="This month"
                    gradient="from-green-500/20 to-emerald-500/20"
                />
                <StatCard
                    title="Trust Score"
                    value={stats.trustScore?.toString() || "50"}
                    icon={TrendingUp}
                    highlight={(stats.trustScore ?? 0) > 80}
                    progress={stats.trustScore ?? 0}
                    gradient="from-yellow-500/20 to-orange-500/20"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upcoming Events */}
                <Card className="lg:col-span-2 glass-card border-white/5">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Upcoming Events</CardTitle>
                            <CardDescription>Your scheduled performances</CardDescription>
                        </div>
                        <Link href="/venue/calendar">
                            <Button variant="ghost" size="sm">
                                View Calendar <ChevronRight className="ml-1 w-4 h-4" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {upcomingEvents.map((event, idx) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.1 }}
                                        className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-white/5 hover:border-primary/20 transition-colors"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex flex-col items-center justify-center">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {format(new Date(event.date), "MMM")}
                                                </span>
                                                <span className="text-lg font-bold">
                                                    {format(new Date(event.date), "dd")}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-medium">{event.title}</p>
                                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <Music2 className="w-3 h-3" /> {event.artist}
                                                    <span className="mx-1">•</span>
                                                    <Clock className="w-3 h-3" /> {event.slot}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge
                                            variant={event.status === "confirmed" ? "default" : "secondary"}
                                            className={event.status === "confirmed" ? "bg-green-500/20 text-green-400" : ""}
                                        >
                                            {event.status === "confirmed" && <CheckCircle2 className="mr-1 w-3 h-3" />}
                                            {event.status}
                                        </Badge>
                                    </motion.div>
                                ))}

                                {upcomingEvents.length === 0 && (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                        <p>No upcoming events</p>
                                        <Link href="/explore">
                                            <Button variant="ghost" className="mt-2 text-primary">
                                                Find Artists to Book
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Booking Mode */}
                    <Card className="glass-card border-white/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="w-4 h-4" /> Booking Mode
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="single" className="w-full">
                                <TabsList className="w-full bg-background/50">
                                    <TabsTrigger value="single" className="flex-1">Single</TabsTrigger>
                                    <TabsTrigger value="programming" className="flex-1">Programming</TabsTrigger>
                                </TabsList>
                                <TabsContent value="single" className="mt-4">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Book artists for individual events as needed.
                                    </p>
                                    <Link href="/explore">
                                        <Button className="w-full" variant="outline">
                                            Browse Artists
                                        </Button>
                                    </Link>
                                </TabsContent>
                                <TabsContent value="programming" className="mt-4">
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Plan your 3-6 month calendar with our curators.
                                    </p>
                                    <Button className="w-full" variant="outline">
                                        Start Programming
                                    </Button>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>

                    {/* Pending Requests */}
                    <Card className="glass-card border-white/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Bell className="w-4 h-4" /> Pending Requests
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(stats.pendingRequests ?? 0) > 0 ? (
                                <div className="space-y-3">
                                    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                                        <p className="text-sm font-medium">
                                            {stats.pendingRequests} artist application{(stats.pendingRequests ?? 0) > 1 ? "s" : ""} waiting
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Respond within 48 hours
                                        </p>
                                    </div>
                                    <Link href="/bookings">
                                        <Button className="w-full" size="sm">
                                            Review Requests
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No pending requests
                                </p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="glass-card border-white/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4" /> Quick Actions
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Link href="/venue/profile">
                                <Button variant="ghost" className="w-full justify-start">
                                    Edit Venue Profile
                                </Button>
                            </Link>
                            <Button variant="ghost" className="w-full justify-start">
                                Update Availability
                            </Button>
                            <Button variant="ghost" className="w-full justify-start">
                                View Past Performances
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Profile Completion Banner (if incomplete) */}
            {!venue?.name && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="border-primary/20 bg-gradient-to-r from-primary/10 to-purple-500/10">
                        <CardContent className="flex items-center justify-between p-6">
                            <div>
                                <h3 className="font-semibold text-lg mb-1">Complete Your Profile</h3>
                                <p className="text-muted-foreground">
                                    A complete profile helps artists find and connect with you.
                                </p>
                            </div>
                            <Link href="/venue/setup">
                                <Button className="bg-primary">
                                    Complete Setup <ArrowUpRight className="ml-2 w-4 h-4" />
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </div>
    );
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

function StatCard({
    title,
    value,
    icon: Icon,
    trend,
    description,
    highlight,
    progress,
    gradient = "from-primary/20 to-purple-500/20",
}: {
    title: string;
    value: string;
    icon: any;
    trend?: string;
    description?: string;
    highlight?: boolean;
    progress?: number;
    gradient?: string;
}) {
    return (
        <Card className={`glass-card border-white/5 overflow-hidden ${highlight ? 'border-primary/50' : ''}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />
            <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <div className="w-10 h-10 rounded-xl bg-background/50 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                    </div>
                </div>
                <div className="space-y-2">
                    <span className="text-3xl font-bold font-display">{value}</span>
                    {progress !== undefined && (
                        <Progress value={progress} className="h-1.5 mt-2" />
                    )}
                    {trend && (
                        <p className="text-xs text-green-500 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> {trend}
                        </p>
                    )}
                    {description && (
                        <p className="text-xs text-muted-foreground">{description}</p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
