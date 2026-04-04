import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Music,
  Calendar,
  Users,
  LogOut,
  LayoutDashboard,
  Settings,
  Search,
  CalendarDays,
  MessageSquare,
  Inbox
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/NotificationBell";

export function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  const role = user.role;

  // Define nav items based on role
  let navItems;

  if (role === "organizer" || role === "promoter") {
    navItems = [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        show: true
      },
      {
        label: "Discover",
        href: "/organizer/discover",
        icon: Search,
        show: true
      },
      {
        label: "Events",
        href: "/organizer/events",
        icon: CalendarDays,
        show: true
      },
      {
        label: "Bookings",
        href: "/bookings",
        icon: Calendar,
        show: true
      },
      {
        label: "Messages",
        href: "/organizer/messages",
        icon: MessageSquare,
        show: false,
        badge: 0 // TODO: Wire up unread count from useConversations hook
      },
      {
        label: "Profile",
        href: "/profile",
        icon: Users,
        show: true
      }
    ];
  } else if (role === "venue_manager" || role === "venue") {
    navItems = [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        show: true
      },
      {
        label: "Applications",
        href: "/venue/applications",
        icon: Inbox,
        show: true,
        badge: 0
      },
      {
        label: "Bookings",
        href: "/bookings",
        icon: Calendar,
        show: true
      },
      {
        label: "Find Artists",
        href: "/explore",
        icon: Search,
        show: true
      },
      {
        label: "Profile",
        href: "/profile",
        icon: Users,
        show: true
      }
    ];
  } else {
    navItems = [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        show: true
      },
      {
        label: "Find Gigs",
        href: "/find-gigs",
        icon: Search,
        show: true
      },
      {
        label: "Bookings",
        href: "/bookings",
        icon: Calendar,
        show: true
      },
      {
        label: "Profile",
        href: "/profile",
        icon: Users,
        show: true
      }
    ];
  }

  return (
    <div className="hidden md:flex h-screen w-64 flex-col border-r border-border/50 bg-card/30 backdrop-blur-xl fixed left-0 top-0">
      <div className="p-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-400">
            BANDWIDTH
          </h1>
          <p className="text-xs text-muted-foreground mt-1 capitalize">{role} Account</p>
        </div>
        <NotificationBell />
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.filter(item => item.show).map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer relative
                ${location === item.href
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"}
              `}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-border/50">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start gap-3 p-2 h-auto hover:bg-white/5 rounded-xl">
              <Avatar className="w-8 h-8 border border-white/10">
                <AvatarFallback className="bg-primary/20 text-primary">
                  {user.name?.[0] || user.username?.[0] || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left overflow-hidden">
                <span className="text-sm font-medium truncate w-full">{user.name || user.username}</span>
                <span className="text-xs text-muted-foreground truncate w-full">{user.email}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="text-destructive focus:text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function MobileHeader() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="md:hidden flex items-center justify-between p-4 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
      <span className="font-bold font-display text-primary">BANDWIDTH</span>
      <NotificationBell />
    </div>
  );
}

export function MobileBottomNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const role = user.role;

  let tabs: { label: string; href: string; icon: React.ComponentType<{ className?: string }> }[];

  if (role === "organizer" || role === "promoter") {
    tabs = [
      { label: "Home", href: "/dashboard", icon: LayoutDashboard },
      { label: "Events", href: "/organizer/events", icon: CalendarDays },
      { label: "Bookings", href: "/bookings", icon: Calendar },
      { label: "Profile", href: "/profile", icon: Users },
    ];
  } else if (role === "venue_manager" || role === "venue") {
    tabs = [
      { label: "Home", href: "/dashboard", icon: LayoutDashboard },
      { label: "Bookings", href: "/bookings", icon: Calendar },
      { label: "Profile", href: "/profile", icon: Users },
    ];
  } else {
    tabs = [
      { label: "Home", href: "/dashboard", icon: LayoutDashboard },
      { label: "Gigs", href: "/find-gigs", icon: Search },
      { label: "Bookings", href: "/bookings", icon: Calendar },
      { label: "Profile", href: "/profile", icon: Users },
    ];
  }

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-card/95 backdrop-blur-md border-t border-border/50">
      {tabs.map((tab) => (
        <Link key={tab.href} href={tab.href} className="flex-1">
          <div className={`flex flex-col items-center justify-center py-3 gap-1 text-xs ${location === tab.href ? "text-primary" : "text-muted-foreground"}`}>
            <tab.icon className="w-5 h-5" />
            <span>{tab.label}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
