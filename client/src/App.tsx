import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Sidebar, MobileHeader } from "@/components/Navigation";
import { Loader2 } from "lucide-react";

// Pages
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/Auth";
import Explore from "@/pages/Explore";
import NotFound from "@/pages/NotFound";

// Artist Pages
import ArtistDashboard from "@/pages/artist/ArtistDashboard";
import ArtistBookings from "@/pages/artist/ArtistBookings";
import ArtistProfile from "@/pages/artist/ArtistProfile";
import FindGigs from "@/pages/artist/FindGigs";

import ArtistProfileSetup from "@/pages/artist/ProfileSetup";
import VenueOnboarding from "@/pages/VenueOnboarding";

// Venue Pages
import VenueProfileSetup from "@/pages/venue/VenueProfileSetup";
import VenueDashboard from "@/pages/venue/VenueDashboard";
import VenueProfile from "@/pages/venue/VenueProfile";
import CreateEvent from "@/pages/venue/CreateEvent";

// Legacy pages as fallback
import Dashboard from "@/pages/Dashboard";
import Bookings from "@/pages/Bookings";
import Profile from "@/pages/Profile";

// Admin Pages
import { AdminLayout } from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminContracts from "@/pages/admin/AdminContracts";
import AdminBookings from "@/pages/admin/AdminBookings";
import AdminConversations from "@/pages/admin/AdminConversations";

// Hook to check profile completion status
function useProfileStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["/api/artists/profile/status"],
    queryFn: async () => {
      const res = await fetch("/api/artists/profile/status", { credentials: "include" });
      if (!res.ok) return { isComplete: true };
      return await res.json();
    },
    enabled: !!user && user.role === "artist",
    staleTime: 60000, // Cache for 1 minute
  });
}

function useVenueStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["/api/venues/profile/status"],
    queryFn: async () => {
      const res = await fetch("/api/venues/profile/status", { credentials: "include" });
      if (!res.ok) return { isComplete: true };
      return await res.json();
    },
    enabled: !!user && (user.role === "venue_manager" || user.role === "venue"),
    staleTime: 60000,
  });
}

// Helper to get user role from metadata or default
function getUserRole(user: any): string {
  // Check metadata for role
  if (user.metadata?.role) return user.metadata.role;
  // Check userRoles if available
  if (user.roles && user.roles.length > 0) return user.roles[0].name;
  // Default to artist if has artist profile
  if (user.artist) return "artist";
  return "artist"; // Default
}

// Private Route Wrapper with profile completion check
function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const { data: artistStatus, isLoading: isArtistLoading } = useProfileStatus();
  const { data: venueStatus, isLoading: isVenueLoading } = useVenueStatus();
  const [location, setLocation] = useLocation();

  if (isLoading || isArtistLoading || isVenueLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Redirect logic for incomplete profiles
  const hasSkipped = sessionStorage.getItem("skippedOnboarding") === "true";

  if (!hasSkipped) {
    if (user.role === "artist" && artistStatus && !artistStatus.isComplete && !location.startsWith("/profile/setup")) {
      return <Redirect to="/profile/setup" />;
    }

    if ((user.role === "venue_manager" || user.role === "venue") && venueStatus && !venueStatus.isComplete && !location.startsWith("/venue/setup") && !location.startsWith("/venue-onboarding")) {
      return <Redirect to="/venue/setup" />;
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-64">
        <MobileHeader />
        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto">
          <div className="max-w-7xl mx-auto w-full">
            <Component />
          </div>
        </main>
      </div>
    </div>
  );
}

// Artist Profile Setup Route (no sidebar)
function ProfileSetupRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <ArtistProfileSetup />;
}

// Role-based Dashboard component
function RoleBasedDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const role = getUserRole(user);

  switch (role) {
    case "artist":
      return <ArtistDashboard />;
    case "organizer":
    case "promoter":
      return <Dashboard />; // Use existing dashboard for organizers for now
    case "venue":
    case "venue_manager":
      return <VenueDashboard />;
    default:
      return <Dashboard />;
  }
}

// Role-based Bookings component
import VenueBookings from "@/pages/venue/VenueBookings";

function RoleBasedBookings() {
  const { user } = useAuth();
  if (!user) return null;

  const role = getUserRole(user);

  switch (role) {
    case "artist":
      return <ArtistBookings />;
    case "venue":
    case "venue_manager":
      return <VenueBookings />;
    default:
      return <Bookings />;
  }
}

// Role-based Profile component
function RoleBasedProfile() {
  const { user } = useAuth();
  if (!user) return null;

  const role = getUserRole(user);

  switch (role) {
    case "artist":
      return <ArtistProfile />;
    case "venue":
    case "venue_manager":
      return <VenueProfile />;
    default:
      return <Profile />;
  }
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={AuthPage} />

      {/* Profile Setup (no sidebar) */}
      <Route path="/profile/setup">
        <ProfileSetupRoute />
      </Route>

      <Route path="/venue-onboarding">
        <VenueOnboarding />
      </Route>

      {/* Venue-specific Routes */}
      <Route path="/venue/setup">
        <VenueProfileSetup />
      </Route>
      <Route path="/venue/dashboard">
        <PrivateRoute component={VenueDashboard} />
      </Route>
      <Route path="/venue/profile">
        <PrivateRoute component={VenueProfile} />
      </Route>
      <Route path="/venue/events/create">
        <PrivateRoute component={CreateEvent} />
      </Route>

      {/* Protected Routes */}
      <Route path="/dashboard">
        <PrivateRoute component={RoleBasedDashboard} />
      </Route>
      <Route path="/explore">
        <PrivateRoute component={Explore} />
      </Route>
      <Route path="/bookings">
        <PrivateRoute component={RoleBasedBookings} />
      </Route>
      <Route path="/find-gigs">
        <PrivateRoute component={FindGigs} />
      </Route>
      <Route path="/profile">
        <PrivateRoute component={RoleBasedProfile} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <AdminLayout>
          <AdminDashboard />
        </AdminLayout>
      </Route>
      <Route path="/admin/users">
        <AdminLayout>
          <AdminUsers />
        </AdminLayout>
      </Route>
      <Route path="/admin/contracts">
        <AdminLayout>
          <AdminContracts />
        </AdminLayout>
      </Route>
      <Route path="/admin/bookings">
        <AdminLayout>
          <AdminBookings />
        </AdminLayout>
      </Route>
      <Route path="/admin/chat">
        <AdminLayout>
          <AdminConversations />
        </AdminLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;

