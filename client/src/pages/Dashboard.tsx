import { useAuth } from "@/hooks/use-auth";
import { useBookings } from "@/hooks/use-bookings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Calendar, DollarSign, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: bookings, isLoading } = useBookings();

  if (!user) return null;

  const role = user.role;
  const isArtist = role === "artist";
  const isOrganizer = role === "organizer";

  // Simple stats calculation
  const totalBookings = bookings?.length || 0;
  const confirmedBookings = bookings?.filter(b => b.status === 'accepted' || b.status === 'contracted').length || 0;
  const pendingRequests = bookings?.filter(b => b.status === 'pending').length || 0;
  
  // Calculate total earnings (for artist) or spend (for organizer)
  const totalValue = bookings
    ?.filter(b => b.status === 'accepted' || b.status === 'contracted')
    .reduce((acc, b) => acc + (b.offerAmount || 0), 0) || 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user.name}</p>
        </div>
        {isOrganizer && (
          <Link href="/explore">
            <Button className="bg-primary shadow-lg shadow-primary/20">Find Talent</Button>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title={isArtist ? "Total Earnings" : "Total Spend"} 
          value={`$${totalValue.toLocaleString()}`} 
          icon={DollarSign} 
          trend="+12% from last month"
        />
        <StatCard 
          title="Confirmed Gigs" 
          value={confirmedBookings.toString()} 
          icon={Calendar} 
        />
        <StatCard 
          title="Pending Requests" 
          value={pendingRequests.toString()} 
          icon={Users} 
          highlight={pendingRequests > 0}
        />
        <StatCard 
          title="Trust Score" 
          value="98" 
          icon={TrendingUp} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity / Bookings List */}
        <Card className="lg:col-span-2 glass-card border-white/5">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : bookings && bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.slice(0, 5).map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between p-4 rounded-xl bg-background/40 border border-white/5 hover:border-primary/20 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                        {isArtist ? booking.organizer.user.name[0] : booking.artist.user.name[0]}
                      </div>
                      <div>
                        <p className="font-medium">
                          {isArtist ? booking.organizer.organizationName || booking.organizer.user.name : booking.artist.user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(booking.eventDate), "PPP")} • {booking.slotTime || "TBD"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${booking.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 
                          booking.status === 'accepted' ? 'bg-green-500/10 text-green-500' : 
                          'bg-gray-500/10 text-gray-500'}
                      `}>
                        {booking.status}
                      </div>
                      <p className="text-sm font-semibold mt-1">${booking.offerAmount}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No activity yet.</p>
                {isOrganizer && (
                  <Link href="/explore">
                    <Button variant="link" className="mt-2 text-primary">Browse Artists</Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions / Notifications */}
        <Card className="glass-card border-white/5">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
              <h4 className="font-semibold text-primary mb-1">Welcome to Bandwidth</h4>
              <p className="text-sm text-muted-foreground">Complete your profile to increase visibility and trust score.</p>
            </div>
            {/* Placeholder for future notifications */}
            <div className="flex items-center gap-3 p-3 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>System maintenance scheduled for Sunday.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, highlight }: any) {
  return (
    <Card className={`glass-card border-white/5 ${highlight ? 'border-primary/50 bg-primary/5' : ''}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-bold font-display">{value}</span>
          {trend && <span className="text-xs text-green-500 mt-1">{trend}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
