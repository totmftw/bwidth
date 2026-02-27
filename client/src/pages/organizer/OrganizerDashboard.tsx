import { useAuth } from "@/hooks/use-auth";
import { useOrganizerDashboardStats, useOrganizerActivity } from "@/hooks/use-organizer-stats";
import { useOrganizerProfileStatus } from "@/hooks/use-organizer";
import { useOrganizerEvents } from "@/hooks/use-organizer-events";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  DollarSign,
  TrendingUp,
  Star,
  Clock,
  MapPin,
  Bell,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Sparkles,
  IndianRupee,
  Users,
  FileText,
  MessageSquare,
  AlertTriangle,
} from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useOrganizerDashboardStats();
  const { data: profileStatus } = useOrganizerProfileStatus();
  const { data: events, isLoading: eventsLoading } = useOrganizerEvents();
  const { data: activity, isLoading: activityLoading } = useOrganizerActivity(10);

  if (!user) return null;

  // Filter upcoming events (published or confirmed, future dates)
  const upcomingEvents = events
    ?.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        (event.status === "published" || event.status === "confirmed") &&
        eventDate > new Date()
      );
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 5) || [];

  // Mock pending actions - in real implementation, these would come from API
  const pendingActions: Array<{
    title: string;
    description: string;
    type: string;
  }> = [
    // These would be derived from bookings, contracts, etc.
  ];

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
            Welcome back, {user.name?.split(" ")[0]}
            <span className="inline-block ml-2">👋</span>
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening with your events and bookings
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/organizer/discover">
            <Button variant="outline" className="gap-2">
              <Users className="w-4 h-4" />
              Discover Artists
            </Button>
          </Link>
          <Link href="/organizer/events/create">
            <Button className="bg-primary gap-2">
              <Calendar className="w-4 h-4" />
              Create Event
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Profile Completion Banner */}
      {profileStatus && !profileStatus.isComplete && (
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
                    A complete profile helps artists trust your events
                  </p>
                </div>
              </div>
              <Link href="/organizer/setup">
                <Button size="sm" className="bg-primary">
                  Complete Now
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statsLoading ? (
          <>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Total Events"
              value={stats?.totalEvents.toString() || "0"}
              icon={Calendar}
              description={`${stats?.upcomingEvents || 0} upcoming`}
              gradient="from-blue-500/20 to-cyan-500/20"
              iconColor="text-blue-500"
            />
            <StatCard
              title="Active Bookings"
              value={stats?.activeBookings.toString() || "0"}
              icon={Users}
              gradient="from-green-500/20 to-emerald-500/20"
              iconColor="text-green-500"
            />
            <StatCard
              title="Pending Negotiations"
              value={stats?.pendingNegotiations.toString() || "0"}
              icon={MessageSquare}
              highlight={stats && stats.pendingNegotiations > 0}
              gradient="from-yellow-500/20 to-orange-500/20"
              iconColor="text-yellow-500"
            />
            <StatCard
              title="Total Spent"
              value={`₹${(stats?.totalSpent || 0).toLocaleString("en-IN")}`}
              icon={IndianRupee}
              gradient="from-purple-500/20 to-pink-500/20"
              iconColor="text-purple-500"
            />
            <StatCard
              title="Trust Score"
              value={stats?.trustScore.toString() || "50"}
              icon={Star}
              progress={stats?.trustScore || 50}
              gradient="from-violet-500/20 to-purple-500/20"
              iconColor="text-violet-500"
            />
            <StatCard
              title="Upcoming Events"
              value={stats?.upcomingEvents.toString() || "0"}
              icon={Clock}
              gradient="from-indigo-500/20 to-blue-500/20"
              iconColor="text-indigo-500"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upcoming Events */}
        <Card className="lg:col-span-2 glass-card border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Upcoming Events
              </CardTitle>
              <CardDescription>Your scheduled events</CardDescription>
            </div>
            <Link href="/organizer/events">
              <Button variant="ghost" size="sm" className="text-primary">
                View All
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div className="space-y-4">
                {upcomingEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-white/5 hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-violet-500/20 flex flex-col items-center justify-center text-center border border-white/10">
                        <span className="text-xs font-medium text-muted-foreground">
                          {format(new Date(event.startTime), "MMM")}
                        </span>
                        <span className="text-lg font-bold">
                          {format(new Date(event.startTime), "dd")}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold group-hover:text-primary transition-colors">
                          {event.title}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(event.startTime), "h:mm a")}
                          </span>
                          {event.venueId && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Venue #{event.venueId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                      >
                        {event.status}
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
                <p className="text-muted-foreground mb-4">
                  No upcoming events scheduled
                </p>
                <Link href="/organizer/events/create">
                  <Button className="bg-primary gap-2">
                    <Calendar className="w-4 h-4" />
                    Create Your First Event
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pending Actions */}
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="w-5 h-5 text-yellow-500" />
                Pending Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingActions.length > 0 ? (
                <div className="space-y-3">
                  {pendingActions.slice(0, 5).map((action: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20 cursor-pointer hover:bg-yellow-500/10 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{action.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All caught up!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="glass-card border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="w-5 h-5 text-primary" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : activity && activity.length > 0 ? (
                <div className="space-y-3">
                  {activity.map((entry, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 text-sm pb-3 border-b border-white/5 last:border-0 last:pb-0"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                      <div className="flex-1">
                        <p className="text-muted-foreground">
                          {entry.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          {entry.occurredAt
                            ? formatDistanceToNow(new Date(entry.occurredAt), {
                                addSuffix: true,
                              })
                            : "Recently"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
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
  description,
  highlight,
  progress,
  gradient,
  iconColor = "text-primary",
}: {
  title: string;
  value: string;
  icon: any;
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
      <Card
        className={`
        glass-card border-white/5 overflow-hidden relative
        ${highlight ? "border-yellow-500/30 ring-1 ring-yellow-500/20" : ""}
      `}
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${
            gradient || "from-primary/10 to-transparent"
          } opacity-50`}
        />

        <CardContent className="p-6 relative">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div
              className={`w-10 h-10 rounded-xl bg-background/60 flex items-center justify-center ${iconColor}`}
            >
              <Icon className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-2">
            <span className="text-3xl font-bold font-display">{value}</span>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {progress !== undefined && (
              <div className="w-full bg-background/40 rounded-full h-1.5 mt-2">
                <div
                  className="bg-primary h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
