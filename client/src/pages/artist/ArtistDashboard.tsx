import { useAuth } from "@/hooks/use-auth";
import { useBookings } from "@/hooks/use-bookings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ArrowUpRight,
    Calendar,
    DollarSign,
    TrendingUp,
    Users,
    Star,
    Clock,
    MapPin,
    Music,
    Bell,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Sparkles,
    IndianRupee,
    Eye,
    ThumbsUp
} from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow, isAfter, addDays } from "date-fns";
import { motion } from "framer-motion";

export default function ArtistDashboard() {
    const { user } = useAuth();
    const { data: bookings, isLoading } = useBookings();

    if (!user) return null;

    const artist = user.artist;

    // Calculate statistics
    const totalBookings = bookings?.length || 0;
    const confirmedBookings = bookings?.filter(b =>
        ['confirmed', 'paid_deposit', 'scheduled', 'completed'].includes(b.status || '')
    ).length || 0;
    const pendingRequests = bookings?.filter(b =>
        ['inquiry', 'offered', 'negotiating'].includes(b.status || '')
    ).length || 0;

    const completedBookings = bookings?.filter(b => b.status === 'completed') || [];
    const totalEarnings = completedBookings.reduce((acc, b) =>
        acc + (Number(b.offerAmount) || 0), 0
    );

    // Upcoming gigs (next 30 days)
    const upcomingGigs = bookings?.filter(b => {
        if (!['confirmed', 'paid_deposit', 'scheduled'].includes(b.status || '')) return false;
        const eventDate = new Date(b.eventDate);
        return isAfter(eventDate, new Date()) && isAfter(addDays(new Date(), 30), eventDate);
    }).sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime()) || [];

    // Trust score (from artist profile or default)
    const trustScore = (artist as any)?.trustScore || 50;

    // Profile completion calculation
    const metadata = artist?.metadata as any || {};
    const profileFields = [
        artist?.bio,
        metadata?.primaryGenre || metadata?.genre,
        artist?.priceFrom,
        artist?.priceTo,
        metadata?.instagram || metadata?.soundcloud,
    ];
    const filledFields = profileFields.filter(f => f).length;
    const profileCompletion = Math.round((filledFields / profileFields.length) * 100);

    return (
        <div className="space-y-8">
            {/* Welcome Header */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl font-display font-bold">
                        Welcome back, {user.name?.split(' ')[0]}
                        <span className="inline-block ml-2">👋</span>
                    </h1>
                    <p className="text-muted-foreground">
                        Here's what's happening with your bookings
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link href="/find-gigs">
                        <Button variant="outline" className="gap-2">
                            <Eye className="w-4 h-4" />
                            Find Gigs
                        </Button>
                    </Link>
                    <Link href="/profile">
                        <Button className="bg-primary gap-2">
                            <TrendingUp className="w-4 h-4" />
                            Boost Profile
                        </Button>
                    </Link>
                </div>
            </motion.div>

            {/* Profile Completion Alert */}
            {profileCompletion < 100 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <Card className="border-primary/30 bg-gradient-to-r from-primary/10 to-violet-500/10">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                    <AlertCircle className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold">Complete Your Profile</p>
                                    <p className="text-sm text-muted-foreground">
                                        A complete profile gets 3x more booking requests
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                    <p className="text-2xl font-bold text-primary">{profileCompletion}%</p>
                                    <p className="text-xs text-muted-foreground">Complete</p>
                                </div>
                                <Link href="/profile">
                                    <Button size="sm" className="bg-primary">
                                        Complete Now
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Earnings"
                    value={`₹${totalEarnings.toLocaleString('en-IN')}`}
                    icon={IndianRupee}
                    trend={totalEarnings > 0 ? "+12% from last month" : undefined}
                    gradient="from-green-500/20 to-emerald-500/20"
                    iconColor="text-green-500"
                />
                <StatCard
                    title="Confirmed Gigs"
                    value={confirmedBookings.toString()}
                    icon={Calendar}
                    description={upcomingGigs.length > 0 ? `${upcomingGigs.length} upcoming` : undefined}
                    gradient="from-blue-500/20 to-cyan-500/20"
                    iconColor="text-blue-500"
                />
                <StatCard
                    title="Pending Requests"
                    value={pendingRequests.toString()}
                    icon={Clock}
                    highlight={pendingRequests > 0}
                    gradient="from-yellow-500/20 to-orange-500/20"
                    iconColor="text-yellow-500"
                />
                <StatCard
                    title="Trust Score"
                    value={trustScore.toString()}
                    icon={Star}
                    progress={trustScore}
                    gradient="from-violet-500/20 to-purple-500/20"
                    iconColor="text-violet-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upcoming Gigs */}
                <Card className="lg:col-span-2 glass-card border-white/5">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                Upcoming Gigs
                            </CardTitle>
                            <CardDescription>Your scheduled performances</CardDescription>
                        </div>
                        <Link href="/bookings">
                            <Button variant="ghost" size="sm" className="text-primary">
                                View All
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
                            </div>
                        ) : upcomingGigs.length > 0 ? (
                            <div className="space-y-4">
                                {upcomingGigs.slice(0, 4).map((booking, index) => (
                                    <motion.div
                                        key={booking.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-white/5 hover:border-primary/30 transition-all group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex flex-col items-center justify-center text-center border border-white/10">
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {format(new Date(booking.eventDate), "MMM")}
                                                </span>
                                                <span className="text-lg font-bold">
                                                    {format(new Date(booking.eventDate), "dd")}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="font-semibold group-hover:text-primary transition-colors">
                                                    {booking.organizer?.organizationName || booking.organizer?.user?.displayName || booking.organizer?.user?.username || "Event"}
                                                </p>
                                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                                    {booking.venue && (
                                                        <span className="flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" />
                                                            {booking.venue.name}
                                                        </span>
                                                    )}
                                                    {booking.slotTime && (
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {booking.slotTime}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg">₹{Number(booking.offerAmount).toLocaleString('en-IN')}</p>
                                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                {(booking.status || 'inquiry').replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                                    <Calendar className="w-8 h-8 text-primary" />
                                </div>
                                <p className="text-muted-foreground mb-4">No upcoming gigs scheduled</p>
                                <Link href="/explore">
                                    <Button className="bg-primary gap-2">
                                        <Music className="w-4 h-4" />
                                        Find Opportunities
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Pending Requests */}
                    <Card className="glass-card border-white/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Bell className="w-5 h-5 text-yellow-500" />
                                Pending Requests
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {pendingRequests > 0 ? (
                                <div className="space-y-3">
                                    {bookings?.filter(b => ['inquiry', 'offered', 'negotiating'].includes(b.status || ''))
                                        .slice(0, 3)
                                        .map(booking => (
                                            <div key={booking.id} className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="font-medium text-sm">
                                                        {booking.organizer?.organizationName || "New Request"}
                                                    </p>
                                                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 text-xs">
                                                        {booking.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-2">
                                                    {format(new Date(booking.eventDate), "MMM d, yyyy")} • ₹{Number(booking.offerAmount).toLocaleString('en-IN')}
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" className="h-7 text-xs flex-1">
                                                        Decline
                                                    </Button>
                                                    <Button size="sm" className="h-7 text-xs flex-1 bg-green-600 hover:bg-green-500">
                                                        Accept
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    <Link href="/bookings">
                                        <Button variant="ghost" size="sm" className="w-full text-primary">
                                            View All Requests
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-muted-foreground">
                                    <ThumbsUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">All caught up!</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick Stats */}
                    <Card className="glass-card border-white/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Sparkles className="w-5 h-5 text-primary" />
                                Performance Stats
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Profile Views (30d)</span>
                                <span className="font-semibold">127</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Response Rate</span>
                                <span className="font-semibold text-green-500">98%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Avg. Rating</span>
                                <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="font-semibold">4.8</span>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-muted-foreground">Completion Rate</span>
                                <span className="font-semibold text-green-500">100%</span>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Tips */}
                    <Card className="bg-gradient-to-br from-primary/10 to-violet-500/10 border-primary/20">
                        <CardContent className="p-4">
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm mb-1">Pro Tip</p>
                                    <p className="text-xs text-muted-foreground">
                                        Respond to booking requests within 24 hours to improve your trust score and visibility.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function StatCard({
    title,
    value,
    icon: Icon,
    trend,
    description,
    highlight,
    progress,
    gradient,
    iconColor = "text-primary"
}: {
    title: string;
    value: string;
    icon: any;
    trend?: string;
    description?: string;
    highlight?: boolean;
    progress?: number;
    gradient?: string;
    iconColor?: string;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <Card className={`
        glass-card border-white/5 overflow-hidden relative
        ${highlight ? 'border-yellow-500/30 ring-1 ring-yellow-500/20' : ''}
      `}>
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient || 'from-primary/10 to-transparent'} opacity-50`} />

                <CardContent className="p-6 relative">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <div className={`w-10 h-10 rounded-xl bg-background/60 flex items-center justify-center ${iconColor}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <span className="text-3xl font-bold font-display">{value}</span>
                        {trend && (
                            <p className="text-xs text-green-500 flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {trend}
                            </p>
                        )}
                        {description && (
                            <p className="text-xs text-muted-foreground">{description}</p>
                        )}
                        {progress !== undefined && (
                            <Progress value={progress} className="h-1.5 mt-2" />
                        )}
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
