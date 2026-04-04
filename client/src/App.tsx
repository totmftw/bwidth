import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Sidebar, MobileHeader, MobileBottomNav } from "@/components/Navigation";
import { Loader2, X } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// Pages
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/Auth";
import Explore from "@/pages/Explore";
import ContractSetup from "@/pages/ContractSetup";
import NotFound from "@/pages/NotFound";

// Artist Pages
import ArtistDashboard from "@/pages/artist/ArtistDashboard";
import ArtistBookings from "@/pages/artist/ArtistBookings";
import ArtistProfile from "@/pages/artist/ArtistProfile";
import FindGigs from "@/pages/artist/FindGigs";

import ArtistProfileSetup from "@/pages/artist/ProfileSetup";

// Venue Pages
import VenueProfileSetup from "@/pages/venue/VenueProfileSetup";
import VenueDashboard from "@/pages/venue/VenueDashboard";
import VenueProfile from "@/pages/venue/VenueProfile";
import CreateEvent from "@/pages/venue/CreateEvent";

// Organizer Pages
import OrganizerDiscover from "@/pages/organizer/OrganizerDiscover";
import OrganizerDashboard from "@/pages/organizer/OrganizerDashboard";
import OrganizerSetup from "@/pages/organizer/OrganizerSetup";
import OrganizerEvents from "@/pages/organizer/OrganizerEvents";
import OrganizerEventCreate from "@/pages/organizer/OrganizerEventCreate";
import OrganizerEventEdit from "@/pages/organizer/OrganizerEventEdit";
import OrganizerMessages from "@/pages/organizer/OrganizerMessages";
import OrganizerBookings from "@/pages/organizer/OrganizerBookings";
import OrganizerProfile from "@/pages/organizer/OrganizerProfile";

import VenueApplications from "@/pages/venue/VenueApplications";

// Legacy pages as fallback
import Dashboard from "@/pages/Dashboard";
import Bookings from "@/pages/Bookings";
import Profile from "@/pages/Profile";

// Admin Pages
import AdminLogin from "@/pages/admin/AdminLogin";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsers from "@/pages/admin/AdminUsers";
import AdminUserDetail from "@/pages/admin/AdminUserDetail";
import AdminRoles from "@/pages/admin/AdminRoles";
import AdminArtists from "@/pages/admin/AdminArtists";
import AdminArtistEdit from "@/pages/admin/AdminArtistEdit";
import AdminOrganizers from "@/pages/admin/AdminOrganizers";
import AdminOrgEdit from "@/pages/admin/AdminOrgEdit";
import AdminVenues from "@/pages/admin/AdminVenues";
import AdminVenueEdit from "@/pages/admin/AdminVenueEdit";
import AdminEvents from "@/pages/admin/AdminEvents";
import AdminEventEdit from "@/pages/admin/AdminEventEdit";
import AdminBookings from "@/pages/admin/AdminBookings";
import AdminBookingDetail from "@/pages/admin/AdminBookingDetail";
import AdminContracts from "@/pages/admin/AdminContracts";
import AdminContractEdit from "@/pages/admin/AdminContractEdit";
import AdminChats from "@/pages/admin/AdminChats";
import AdminChatView from "@/pages/admin/AdminChatView";
import AdminSettings from "@/pages/admin/AdminSettings";
import AdminAuditLog from "@/pages/admin/AdminAuditLog";
import AdminNotificationTypes from "@/pages/admin/AdminNotificationTypes";
import AdminNotificationChannels from "@/pages/admin/AdminNotificationChannels";
import AdminAgents from "@/pages/admin/AdminAgents";
import AdminAgentConfig from "@/pages/admin/AdminAgentConfig";
import AdminAgentRateLimits from "@/pages/admin/AdminAgentRateLimits";
import AdminAgentPrompts from "@/pages/admin/AdminAgentPrompts";
import AdminAgentUsage from "@/pages/admin/AdminAgentUsage";
import AdminNegotiationAnalytics from "@/pages/admin/AdminNegotiationAnalytics";
import AgentSettings from "@/pages/settings/AgentSettings";
import NotificationsPage from "@/pages/Notifications";

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

function useOrganizerStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["/api/organizer/profile/status"],
    queryFn: async () => {
      const res = await fetch("/api/organizer/profile/status", { credentials: "include" });
      if (!res.ok) return { isComplete: true };
      return await res.json();
    },
    enabled: !!user && (user.role === "organizer" || user.role === "promoter"),
    staleTime: 60000,
  });
}

/**
 * Resolves the canonical user role from the authenticated user object.
 *
 * Resolution order (first match wins):
 *   1. `user.metadata.role` — the role stored at registration time.
 *      Legacy records may store "venue" instead of "venue_manager",
 *      so we normalise that here to keep downstream switch-cases simple.
 *   2. Attached profile entities (`venue`, `organizer`, `artist`) —
 *      populated by the server during login / deserialisation and used
 *      as a fallback when metadata is missing or empty.
 *   3. Hard default: "artist" — safest assumption for the platform.
 *
 * This mirrors the server-side normalisation in `server/role-utils.ts`
 * (`normalizeRegistrationRole`) so both layers agree on role values.
 *
 * @param user - The authenticated user object (typed as `any` because the
 *               shape varies depending on whether profiles have been fetched).
 * @returns A canonical role string matching the `role_name` DB enum
 *          (e.g. "artist", "organizer", "venue_manager", "admin").
 */
function getUserRole(user: any): string {
  // 1. Prefer the role explicitly stored in user metadata
  if (user.metadata?.role) {
    const role = user.metadata.role;
    // Normalise legacy "venue" value → "venue_manager" (matches role_name enum)
    return role === 'venue' ? 'venue_manager' : role;
  }

  // 2. Infer role from attached profile entities
  if (user.venue) return 'venue_manager';
  if (user.organizer) return 'organizer';
  if (user.artist) return 'artist';

  // 3. Safe default — most users on the platform are artists
  return 'artist';
}


const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function ProfileReminderBanner({ user, isComplete }: { user: any; isComplete: boolean }) {
  const [show, setShow] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isComplete || !user?.id) return;
    const key = `profileReminder_${user.id}`;
    const lastShown = localStorage.getItem(key);
    const now = Date.now();
    if (!lastShown || now - Number(lastShown) >= TWO_DAYS_MS) {
      setShow(true);
      localStorage.setItem(key, String(now));
    }
  }, [isComplete, user?.id]);

  if (!show) return null;

  const setupPath =
    user?.role === "artist" ? "/profile/setup" :
    (user?.role === "organizer" || user?.role === "promoter") ? "/organizer/setup" :
    "/venue/setup";

  return (
    <div className="bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-between text-sm shrink-0">
      <span className="text-primary font-medium">
        Your profile is incomplete. Complete it to unlock all features including negotiations.
      </span>
      <div className="flex items-center gap-2 ml-4">
        <Button size="sm" variant="default" className="h-7 text-xs" onClick={() => setLocation(setupPath)}>
          Complete Profile
        </Button>
        <button onClick={() => setShow(false)} className="text-muted-foreground hover:text-foreground p-1">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// Private Route Wrapper with profile completion check
function PrivateRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const { data: artistStatus, isLoading: isArtistLoading } = useProfileStatus();
  const { data: venueStatus, isLoading: isVenueLoading } = useVenueStatus();
  const { data: organizerStatus, isLoading: isOrganizerLoading } = useOrganizerStatus();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) return;

    const isIncomplete =
      (user.role === "artist" && artistStatus && !artistStatus.isComplete) ||
      ((user.role === "venue_manager" || user.role === "venue") && venueStatus && !venueStatus.isComplete) ||
      ((user.role === "organizer" || user.role === "promoter") && organizerStatus && !organizerStatus.isComplete);

    if (!isIncomplete) return;

    const lastReminder = localStorage.getItem("profileReminderAt");
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    if (!lastReminder || now - parseInt(lastReminder) > twoDaysMs) {
      toast({
        title: "Complete your profile",
        description: "A complete profile helps you get better bookings. You can't start negotiations until your profile is complete.",
      });
      localStorage.setItem("profileReminderAt", String(now));
    }
  }, [artistStatus, venueStatus, organizerStatus, user]);

  if (isLoading || isArtistLoading || isVenueLoading || isOrganizerLoading) {
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

    if ((user.role === "venue_manager" || user.role === "venue") && venueStatus && !venueStatus.isComplete && !location.startsWith("/venue/setup")) {
      return <Redirect to="/venue/setup" />;
    }

    if ((user.role === "organizer" || user.role === "promoter") && organizerStatus && !organizerStatus.isComplete && !location.startsWith("/organizer/setup")) {
      return <Redirect to="/organizer/setup" />;
    }
  }

  const isProfileComplete =
    (user.role === "artist" ? artistStatus?.isComplete :
    (user.role === "organizer" || user.role === "promoter") ? organizerStatus?.isComplete :
    (user.role === "venue_manager" || user.role === "venue") ? venueStatus?.isComplete :
    true) ?? true;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-64">
        <MobileHeader />
        <ProfileReminderBanner user={user} isComplete={isProfileComplete} />
        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto pb-16 md:pb-0">
          <div className="max-w-7xl mx-auto w-full">
            <Component />
          </div>
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}

function VenueRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      const role = getUserRole(user);
      if (role !== "venue_manager" && role !== "venue") {
        toast({ title: "Access denied", description: "You don't have permission to view this page.", variant: "destructive" });
        setLocation("/dashboard");
      }
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-primary">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (!user) return <Redirect to="/auth" />;

  const role = getUserRole(user);
  if (role !== "venue_manager" && role !== "venue") return null;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col md:pl-64">
        <MobileHeader />
        <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-y-auto pb-16 md:pb-0">
          <div className="max-w-7xl mx-auto w-full">
            <Component />
          </div>
        </main>
        <MobileBottomNav />
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

// Venue Profile Setup Route (no sidebar)
function VenueSetupRoute() {
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

  return <VenueProfileSetup />;
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
      return <OrganizerDashboard />;
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
    case "organizer":
    case "promoter":
      return <OrganizerBookings />;
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
    case "organizer":
    case "promoter":
      return <OrganizerProfile />;
    case "venue":
    case "venue_manager":
      return <VenueProfile />;
    default:
      return <Profile />;
  }
}

import ContractPage from "@/pages/contract/ContractPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/login">
        <Redirect to="/auth" />
      </Route>

      {/* Profile Setup (no sidebar) */}
      <Route path="/profile/setup">
        <ProfileSetupRoute />
      </Route>

      {/* Venue-specific Routes */}
      <Route path="/venue/setup">
        <VenueSetupRoute />
      </Route>
      <Route path="/venue/dashboard">
        <VenueRoute component={VenueDashboard} />
      </Route>
      <Route path="/venue/applications">
        <VenueRoute component={VenueApplications} />
      </Route>
      <Route path="/venue/profile">
        <VenueRoute component={VenueProfile} />
      </Route>
      <Route path="/venue/events/create">
        <VenueRoute component={CreateEvent} />
      </Route>

      {/* Organizer-specific Routes */}
      <Route path="/organizer/setup">
        <OrganizerSetup />
      </Route>
      <Route path="/organizer/discover">
        <PrivateRoute component={OrganizerDiscover} />
      </Route>
      <Route path="/organizer/events">
        <PrivateRoute component={OrganizerEvents} />
      </Route>
      <Route path="/organizer/events/create">
        <PrivateRoute component={OrganizerEventCreate} />
      </Route>
      <Route path="/organizer/events/:id/edit">
        <PrivateRoute component={OrganizerEventEdit} />
      </Route>
      <Route path="/organizer/messages">
        <PrivateRoute component={OrganizerMessages} />
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
      <Route path="/bookings/:id">
        {(params) => <Redirect to={`/bookings?bookingId=${params.id}`} />}
      </Route>
      <Route path="/find-gigs">
        <PrivateRoute component={FindGigs} />
      </Route>
      <Route path="/profile">
        <PrivateRoute component={RoleBasedProfile} />
      </Route>
      <Route path="/contract-setup">
        <PrivateRoute component={ContractSetup} />
      </Route>
      <Route path="/contract/:id">
        <ContractPage />
      </Route>
      <Route path="/notifications">
        <PrivateRoute component={NotificationsPage} />
      </Route>
      <Route path="/settings/ai">
        <PrivateRoute component={AgentSettings} />
      </Route>

      {/* Admin Login - isolated, no layout */}
      <Route path="/admin" component={AdminLogin} />

      {/* Admin Control Panel */}
      <Route path="/admin/dashboard">
        <AdminLayout><AdminDashboard /></AdminLayout>
      </Route>
      <Route path="/admin/users">
        <AdminLayout><AdminUsers /></AdminLayout>
      </Route>
      <Route path="/admin/users/:id">
        <AdminLayout><AdminUserDetail /></AdminLayout>
      </Route>
      <Route path="/admin/roles">
        <AdminLayout><AdminRoles /></AdminLayout>
      </Route>
      <Route path="/admin/artists">
        <AdminLayout><AdminArtists /></AdminLayout>
      </Route>
      <Route path="/admin/artists/:id">
        <AdminLayout><AdminArtistEdit /></AdminLayout>
      </Route>
      <Route path="/admin/organizers">
        <AdminLayout><AdminOrganizers /></AdminLayout>
      </Route>
      <Route path="/admin/organizers/:id">
        <AdminLayout><AdminOrgEdit /></AdminLayout>
      </Route>
      <Route path="/admin/venues">
        <AdminLayout><AdminVenues /></AdminLayout>
      </Route>
      <Route path="/admin/venues/:id">
        <AdminLayout><AdminVenueEdit /></AdminLayout>
      </Route>
      <Route path="/admin/events">
        <AdminLayout><AdminEvents /></AdminLayout>
      </Route>
      <Route path="/admin/events/:id">
        <AdminLayout><AdminEventEdit /></AdminLayout>
      </Route>
      <Route path="/admin/bookings">
        <AdminLayout><AdminBookings /></AdminLayout>
      </Route>
      <Route path="/admin/bookings/:id">
        <AdminLayout><AdminBookingDetail /></AdminLayout>
      </Route>
      <Route path="/admin/contracts">
        <AdminLayout><AdminContracts /></AdminLayout>
      </Route>
      <Route path="/admin/contracts/:id">
        <AdminLayout><AdminContractEdit /></AdminLayout>
      </Route>
      {/* Redirect legacy admin paths */}
      <Route path="/admin/negotiations">
        <Redirect to="/admin/chats" />
      </Route>
      <Route path="/admin/notifications">
        <Redirect to="/admin/notification-types" />
      </Route>
      <Route path="/admin/audit-log">
        <Redirect to="/admin/audit" />
      </Route>

      <Route path="/admin/chats">
        <AdminLayout><AdminChats /></AdminLayout>
      </Route>
      <Route path="/admin/chats/:id">
        <AdminLayout><AdminChatView /></AdminLayout>
      </Route>
      <Route path="/admin/settings">
        <AdminLayout><AdminSettings /></AdminLayout>
      </Route>
      <Route path="/admin/audit">
        <AdminLayout><AdminAuditLog /></AdminLayout>
      </Route>
      <Route path="/admin/notification-types">
        <AdminLayout><AdminNotificationTypes /></AdminLayout>
      </Route>
      <Route path="/admin/notification-channels">
        <AdminLayout><AdminNotificationChannels /></AdminLayout>
      </Route>
      <Route path="/admin/agents">
        <AdminLayout><AdminAgents /></AdminLayout>
      </Route>
      <Route path="/admin/agents/config/:agentType">
        <AdminLayout><AdminAgentConfig /></AdminLayout>
      </Route>
      <Route path="/admin/agents/rate-limits">
        <AdminLayout><AdminAgentRateLimits /></AdminLayout>
      </Route>
      <Route path="/admin/agents/prompts">
        <AdminLayout><AdminAgentPrompts /></AdminLayout>
      </Route>
      <Route path="/admin/agents/usage">
        <AdminLayout><AdminAgentUsage /></AdminLayout>
      </Route>
      <Route path="/admin/agents/analytics">
        <AdminLayout><AdminNegotiationAnalytics /></AdminLayout>
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

